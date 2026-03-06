import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";
import type { Lang } from "./copy";

export const encodeText = (value: string) => {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(value);
  }
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff;
  }
  return bytes;
};

export const sanitizeFilename = (value: string) =>
  value
    .trim()
    .replace(/[^\w.\-]/g, "_")
    .replace(/_+/g, "_");

export const formatQtyValue = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "";
  }
  return Number(value.toFixed(3)).toString();
};

export const formatMoneyValue = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "";
  }
  return Number(value.toFixed(2)).toString();
};

export const formatPercentValue = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "";
  }
  return Number(value.toFixed(2)).toString();
};

export const escapeCsvValue = (value: string | number | null | undefined) => {
  const stringValue = value === null || value === undefined ? "" : String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
};

export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");

export const renderTable = (title: string, headers: string[], rows: string[][]) => {
  const headerHtml = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const bodyHtml = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("");
  return `
    <h2>${escapeHtml(title)}</h2>
    <table>
      <thead><tr>${headerHtml}</tr></thead>
      <tbody>${bodyHtml}</tbody>
    </table>
  `;
};

const safeUnicodeNormalize = (value: string) => {
  const maybeNormalize = (value as { normalize?: (form?: string) => string })
    .normalize;
  if (typeof maybeNormalize !== "function") {
    return value;
  }
  try {
    return maybeNormalize.call(value, "NFKD");
  } catch {
    return value;
  }
};

const normalizePdfText = (value: string) =>
  safeUnicodeNormalize(value)
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const escapePdfText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

export const buildSimplePdf = (lines: string[]) => {
  const pageWidth = 595;
  const pageHeight = 842;
  const marginLeft = 36;
  const marginTop = 812;
  const lineHeight = 13;
  const maxLinesPerPage = 56;
  const pages: string[] = [];

  for (let offset = 0; offset < lines.length; offset += maxLinesPerPage) {
    const pageLines = lines.slice(offset, offset + maxLinesPerPage);
    let content = "BT\n/F1 10 Tf\n";
    pageLines.forEach((line, index) => {
      const y = marginTop - index * lineHeight;
      const safeText = escapePdfText(normalizePdfText(line));
      content += `1 0 0 1 ${marginLeft} ${y} Tm (${safeText || " "}) Tj\n`;
    });
    content += "ET";
    pages.push(content);
  }

  const pageObjectStart = 4;
  const pageCount = pages.length || 1;
  const objectCount = 3 + pageCount * 2;
  const pageRefs = Array.from({ length: pageCount }, (_, index) =>
    `${pageObjectStart + index * 2} 0 R`,
  ).join(" ");

  const objects: string[] = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    `2 0 obj\n<< /Type /Pages /Kids [${pageRefs}] /Count ${pageCount} >>\nendobj\n`,
    "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];

  (pages.length ? pages : ["BT\n/F1 10 Tf\n1 0 0 1 36 812 Tm (No data) Tj\nET"]).forEach(
    (content, index) => {
      const pageId = pageObjectStart + index * 2;
      const contentId = pageId + 1;
      const length = encodeText(content).length;
      objects.push(
        `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`,
      );
      objects.push(
        `${contentId} 0 obj\n<< /Length ${length} >>\nstream\n${content}\nendstream\nendobj\n`,
      );
    },
  );

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const objectValue of objects) {
    offsets.push(encodeText(pdf).length);
    pdf += objectValue;
  }

  const xrefStart = encodeText(pdf).length;
  pdf += `xref\n0 ${objectCount + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index <= objectCount; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return encodeText(pdf);
};

export async function writeExportBytes(params: {
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
  language: Lang;
  bytesToBase64: (bytes: Uint8Array) => string;
}) {
  const { filename, mimeType, bytes, language, bytesToBase64 } = params;

  if (Platform.OS === "web") {
    const webUrl = (globalThis as any)?.URL;
    const webDocument = (globalThis as any)?.document;
    if (webUrl?.createObjectURL && webDocument?.createElement) {
      const buffer = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
      const blob = new Blob([buffer], { type: mimeType });
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
      return;
    }
  }

  const directoryUri = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  if (!directoryUri) {
    throw new Error(
      language === "es"
        ? "No se puede acceder al almacenamiento local para la descarga."
        : "Unable to access local storage for download.",
    );
  }

  const fileUri = `${directoryUri}${filename}`;
  const base64 = bytesToBase64(bytes);
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType,
      dialogTitle: filename,
    });
  } else {
    Alert.alert(language === "es" ? "Descarga lista" : "Download ready", filename);
  }
}
