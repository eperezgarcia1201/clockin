import { clockinFetch } from "../../../../../lib/clockin-api";
import { excelResponse } from "../../../../../lib/excel-export";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();
  const response = await clockinFetch(
    `/reports/audit${query ? `?${query}` : ""}`,
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return new Response(JSON.stringify(error), { status: response.status });
  }
  const data = await response.json();

  return excelResponse("audit-report.xlsx", (workbook) => {
    const sheet = workbook.addWorksheet("Audit Log");
    sheet.columns = [
      { header: "Employee", key: "employee", width: 26 },
      { header: "Type", key: "type", width: 10 },
      { header: "Date & Time", key: "occurredAt", width: 20 },
      { header: "Office", key: "office", width: 18 },
      { header: "Group", key: "group", width: 18 },
      { header: "Notes", key: "notes", width: 30 },
    ];

    data.records?.forEach((record: any) => {
      sheet.addRow({
        employee: record.employeeName,
        type: record.type,
        occurredAt: new Date(record.occurredAt).toLocaleString(),
        office: record.office || "",
        group: record.group || "",
        notes: record.notes || "",
      });
    });
  });
}
