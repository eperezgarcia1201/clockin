import { clockinFetch } from "../../../../../lib/clockin-api";
import { excelResponse } from "../../../../../lib/excel-export";
import { companyMetaRows, getCompanyExportProfile } from "../../../../../lib/company-export";
import {
  scopedQueryFromRequest,
  withQuery,
} from "../../../../../lib/location-scope";

export const runtime = "nodejs";

type AuditRecord = {
  employeeName?: string;
  type?: string;
  occurredAt?: string;
  office?: string;
  group?: string;
  notes?: string;
  hasPhoto?: boolean;
};

type AuditReportResponse = {
  records?: AuditRecord[];
};

export async function GET(request: Request) {
  const query = await scopedQueryFromRequest(request);
  const response = await clockinFetch(withQuery("/reports/audit", query));
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return new Response(JSON.stringify(error), { status: response.status });
  }
  const data = (await response.json()) as AuditReportResponse;
  const company = await getCompanyExportProfile();

  return excelResponse("audit-report.xlsx", (workbook) => {
    const sheet = workbook.addWorksheet("Audit Log");
    sheet.addRow([company.displayName]);
    sheet.addRow(["Report", "Audit Log"]);
    companyMetaRows(company).slice(1).forEach(([label, value]) => {
      sheet.addRow([label, value]);
    });
    sheet.addRow([]);
    sheet.columns = [
      { header: "Employee", key: "employee", width: 26 },
      { header: "Type", key: "type", width: 10 },
      { header: "Date & Time", key: "occurredAt", width: 20 },
      { header: "Office", key: "office", width: 18 },
      { header: "Group", key: "group", width: 18 },
      { header: "Notes", key: "notes", width: 30 },
      { header: "Has Punch Photo", key: "hasPhoto", width: 16 },
    ];

    data.records?.forEach((record) => {
      const occurredAt =
        typeof record.occurredAt === "string" && record.occurredAt
          ? new Date(record.occurredAt).toLocaleString()
          : "";
      sheet.addRow({
        employee: record.employeeName || "",
        type: record.type || "",
        occurredAt,
        office: record.office || "",
        group: record.group || "",
        notes: record.notes || "",
        hasPhoto: record.hasPhoto ? "Yes" : "No",
      });
    });
  });
}
