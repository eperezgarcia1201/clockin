import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";
import { bytesToBase64 } from "./api-runtime";

export type CompanyOrderExportFormat = "pdf" | "csv" | "excel";

export const downloadCompanyOrderExport = async (params: {
  format: CompanyOrderExportFormat;
  weekStartDate: string;
  orderedBases: string[];
  selectedOfficeId: string | null;
  tenantAuthOrgId: string;
  extraHeaders?: Record<string, string>;
  unableLocalDownloadStorageMessage: string;
  downloadReadyMessage: string;
}): Promise<{ ok: boolean; resolvedApiBase: string | null }> => {
  const query = new URLSearchParams();
  query.set("format", params.format);
  query.set("weekStart", params.weekStartDate);
  if (params.selectedOfficeId) {
    query.set("officeId", params.selectedOfficeId);
  }
  const path = `/company-orders/export?${query.toString()}`;
  const acceptHeader =
    params.format === "pdf"
      ? "application/pdf"
      : params.format === "csv"
        ? "text/csv"
        : "application/vnd.ms-excel";

  for (const apiBase of params.orderedBases) {
    try {
      const response = await fetch(`${apiBase}${path}`, {
        headers: {
          Accept: acceptHeader,
          "x-dev-user-id": "dev-user",
          "x-dev-tenant-id": params.tenantAuthOrgId,
          "x-dev-email": "dev@clockin.local",
          "x-dev-name": "Employee App",
          ...(params.extraHeaders || {}),
        },
      });
      if (!response.ok) {
        continue;
      }

      const extension =
        params.format === "pdf"
          ? "pdf"
          : params.format === "csv"
            ? "csv"
            : "xls";
      const contentDisposition = response.headers.get("content-disposition") || "";
      const filenameMatch = /filename=\"?([^\";]+)\"?/i.exec(contentDisposition);
      const filename = (
        filenameMatch?.[1] ||
        `company-orders-week-${params.weekStartDate}.${extension}`
      )
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
          throw new Error(params.unableLocalDownloadStorageMessage);
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
          Alert.alert(params.downloadReadyMessage, filename);
        }
        return { ok: true, resolvedApiBase: apiBase };
      }

      return { ok: true, resolvedApiBase: apiBase };
    } catch {
      // try next base
    }
  }

  return { ok: false, resolvedApiBase: null };
};
