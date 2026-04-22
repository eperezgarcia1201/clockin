import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";
import type { Lang } from "./copy";

export type CompanyOrderExportFormat = "pdf" | "csv" | "excel";

type DownloadCompanyOrderExportParams = {
  format: CompanyOrderExportFormat;
  weekStartDate: string;
  supplierName?: string | null;
  orderedBases: string[];
  companyOrdersOfficeId: string;
  tenantHeader: string;
  activeLoginName: string;
  language: Lang;
  bytesToBase64: (bytes: Uint8Array) => string;
};

export async function downloadCompanyOrderExport({
  format,
  weekStartDate,
  supplierName,
  orderedBases,
  companyOrdersOfficeId,
  tenantHeader,
  activeLoginName,
  language,
  bytesToBase64,
}: DownloadCompanyOrderExportParams): Promise<{ ok: boolean; resolvedApiBase: string | null }> {
  const query = new URLSearchParams();
  query.set("format", format);
  query.set("weekStart", weekStartDate);
  if (companyOrdersOfficeId) {
    query.set("officeId", companyOrdersOfficeId);
  }
  if (supplierName && supplierName.trim()) {
    query.set("supplierName", supplierName.trim());
  }

  const path = `/company-orders/export?${query.toString()}`;
  const acceptHeader =
    format === "pdf"
      ? "application/pdf"
      : format === "csv"
        ? "text/csv"
        : "application/vnd.ms-excel";

  const normalizedLoginName = activeLoginName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  for (const apiBase of orderedBases) {
    try {
      const headers = new Headers();
      headers.set("Accept", acceptHeader);
      headers.set(
        "x-dev-user-id",
        normalizedLoginName ? `tenant-admin:${normalizedLoginName}` : "dev-user",
      );
      headers.set(
        "x-dev-email",
        normalizedLoginName ? `${normalizedLoginName}@clockin.local` : "dev@clockin.local",
      );
      headers.set("x-dev-name", activeLoginName || "Dev User");
      headers.set("x-dev-tenant-id", tenantHeader);

      const response = await fetch(`${apiBase}${path}`, { headers });
      if (!response.ok) {
        continue;
      }

      const extension = format === "pdf" ? "pdf" : format === "csv" ? "csv" : "xls";
      const supplierSlug = (supplierName || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      const contentDisposition = response.headers.get("content-disposition") || "";
      const filenameMatch = /filename=\"?([^\";]+)\"?/i.exec(contentDisposition);
      const filename =
        (filenameMatch?.[1] ||
          (supplierSlug
            ? `company-orders-${supplierSlug}-week-${weekStartDate}.${extension}`
            : `company-orders-week-${weekStartDate}.${extension}`))
          .trim()
          .replace(/[^\w.\-]/g, "_");

      if (Platform.OS === "web") {
        const webResponse = response as any;
        if (typeof webResponse.blob === "function") {
          const blob = await webResponse.blob();
          const webUrl = (globalThis as any)?.URL;
          const webDocument = (globalThis as any)?.document;
          if (blob && webUrl?.createObjectURL && webDocument?.createElement) {
            const objectUrl = webUrl.createObjectURL(blob);
            const anchor = webDocument.createElement("a");
            anchor.href = objectUrl;
            anchor.download = filename;
            anchor.rel = "noopener";
            if (webDocument.body?.appendChild) {
              webDocument.body.appendChild(anchor);
            }
            anchor.click();
            if (typeof anchor.remove === "function") {
              anchor.remove();
            }
            setTimeout(() => {
              if (webUrl?.revokeObjectURL) {
                webUrl.revokeObjectURL(objectUrl);
              }
            }, 1200);
            return { ok: true, resolvedApiBase: apiBase };
          }
        }
      }

      const arrayBuffer = await response.arrayBuffer();
      if (Platform.OS !== "web") {
        const directoryUri = FileSystem.cacheDirectory || FileSystem.documentDirectory;
        if (!directoryUri) {
          throw new Error(
            language === "es"
              ? "No se puede acceder al almacenamiento local para la descarga."
              : "Unable to access local storage for download.",
          );
        }

        const fileUri = `${directoryUri}${filename}`;
        const bytes = new Uint8Array(arrayBuffer);
        const base64 = bytesToBase64(bytes);
        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: acceptHeader,
            dialogTitle: filename,
          });
        } else {
          Alert.alert(language === "es" ? "Descarga lista" : "Download ready", filename);
        }
        return { ok: true, resolvedApiBase: apiBase };
      }

      return { ok: true, resolvedApiBase: apiBase };
    } catch {
      // try next base
    }
  }

  return { ok: false, resolvedApiBase: null };
}
