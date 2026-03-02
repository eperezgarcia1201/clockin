import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { normalizeLiquorInvoiceRows } from "./invoice-helpers";
import type {
  LiquorInvoiceAnalyzeResponse,
  LiquorInvoiceExtractedRow,
} from "./types";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export type BottleScanWorkflowResult =
  | { state: "canceled" }
  | { state: "camera_permission_required" }
  | { state: "analyzed"; fillPercent: string; spentMl: string };

export type InvoicePhotoPickResult =
  | { state: "canceled" }
  | { state: "library_permission_required" }
  | { state: "selected"; imageDataUrl: string; imageName: string };

export async function captureAndAnalyzeLiquorBottle(params: {
  itemId: string;
  officeId: string;
  containerKey: string;
  fetchJson: FetchJson;
  headers?: Record<string, string>;
}): Promise<BottleScanWorkflowResult> {
  const { itemId, officeId, containerKey, fetchJson, headers } = params;

  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    return { state: "camera_permission_required" };
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 0.7,
  });
  if (result.canceled || !result.assets.length) {
    return { state: "canceled" };
  }

  const asset = result.assets[0];
  const fallbackMimeType = asset.uri.toLowerCase().endsWith(".png")
    ? "image/png"
    : "image/jpeg";
  const mimeType = asset.mimeType || fallbackMimeType;
  const base64 = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const imageDataUrl = `data:${mimeType};base64,${base64}`;

  const payload = (await fetchJson("/liquor-inventory/bottle-scans/analyze", {
    method: "POST",
    headers,
    body: JSON.stringify({
      itemId,
      officeId,
      measuredAt: new Date().toISOString(),
      containerKey: containerKey.trim() || undefined,
      imageDataUrl,
    }),
  })) as {
    analysis?: { fillPercent?: number };
    comparison?: { spentMlClamped?: number | null };
  };

  const fillPercent =
    typeof payload.analysis?.fillPercent === "number"
      ? payload.analysis.fillPercent.toFixed(1)
      : "n/a";
  const spentMl =
    typeof payload.comparison?.spentMlClamped === "number"
      ? payload.comparison.spentMlClamped.toFixed(1)
      : "n/a";

  return { state: "analyzed", fillPercent, spentMl };
}

export async function pickLiquorInvoicePhotoFromLibrary(): Promise<InvoicePhotoPickResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { state: "library_permission_required" };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.75,
  });
  if (result.canceled || !result.assets.length) {
    return { state: "canceled" };
  }

  const asset = result.assets[0];
  const fallbackMimeType = asset.uri.toLowerCase().endsWith(".png")
    ? "image/png"
    : "image/jpeg";
  const mimeType = asset.mimeType || fallbackMimeType;
  const base64 = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return {
    state: "selected",
    imageDataUrl: `data:${mimeType};base64,${base64}`,
    imageName:
      asset.fileName ||
      asset.uri.split("/").pop() ||
      `invoice-${new Date().toISOString().slice(0, 10)}`,
  };
}

export async function analyzeLiquorInvoicePhotoRows(params: {
  officeId: string;
  invoiceDate: string;
  invoiceNumber: string;
  supplierName: string;
  notes: string;
  imageDataUrl: string;
  fetchJson: FetchJson;
  headers?: Record<string, string>;
}): Promise<{ rows: LiquorInvoiceExtractedRow[]; extractedCount: number }> {
  const {
    officeId,
    invoiceDate,
    invoiceNumber,
    supplierName,
    notes,
    imageDataUrl,
    fetchJson,
    headers,
  } = params;

  const payload = (await fetchJson("/liquor-inventory/invoices/analyze", {
    method: "POST",
    headers,
    body: JSON.stringify({
      officeId,
      invoiceDate: invoiceDate.trim() || undefined,
      invoiceNumber: invoiceNumber.trim() || undefined,
      supplierName: supplierName.trim() || undefined,
      notes: notes.trim() || undefined,
      imageDataUrl,
    }),
  })) as LiquorInvoiceAnalyzeResponse;

  const rows = Array.isArray(payload.rows)
    ? normalizeLiquorInvoiceRows(payload.rows)
    : [];

  const extractedCount =
    typeof payload.analysis?.totalExtractedRows === "number" &&
    Number.isFinite(payload.analysis.totalExtractedRows)
      ? payload.analysis.totalExtractedRows
      : rows.length;

  return { rows, extractedCount };
}

export async function applyLiquorInvoiceRowsToInventory(params: {
  officeId: string;
  invoiceDate: string;
  invoiceNumber: string;
  supplierName: string;
  notes: string;
  createPurchaseMovements: boolean;
  rows: LiquorInvoiceExtractedRow[];
  fetchJson: FetchJson;
  headers?: Record<string, string>;
}) {
  const {
    officeId,
    invoiceDate,
    invoiceNumber,
    supplierName,
    notes,
    createPurchaseMovements,
    rows,
    fetchJson,
    headers,
  } = params;

  await fetchJson("/liquor-inventory/invoices/apply", {
    method: "POST",
    headers,
    body: JSON.stringify({
      officeId,
      invoiceDate: invoiceDate.trim() || undefined,
      invoiceNumber: invoiceNumber.trim() || undefined,
      supplierName: supplierName.trim() || undefined,
      notes: notes.trim() || undefined,
      createPurchaseMovements,
      rows: rows.map((row) => ({
        existingItemId: row.matchedItemId || undefined,
        apply: true,
        company: row.company || undefined,
        liquorName: row.liquorName,
        kind: row.kind || undefined,
        upc: row.upc || undefined,
        ml: row.ml ?? undefined,
        unitCost: row.unitCost ?? undefined,
        quantity: row.quantity ?? undefined,
      })),
    }),
  });
}
