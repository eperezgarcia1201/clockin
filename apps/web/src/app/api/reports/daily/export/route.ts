import { clockinFetch } from "../../../../../lib/clockin-api";
import { excelResponse } from "../../../../../lib/excel-export";
import { companyMetaRows, getCompanyExportProfile } from "../../../../../lib/company-export";
import {
  scopedQueryFromRequest,
  withQuery,
} from "../../../../../lib/location-scope";

export const runtime = "nodejs";

type DailyReportDay = {
  date?: string;
  firstIn?: string;
  lastOut?: string;
  hoursFormatted?: string;
  hoursDecimal?: number;
  photoCount?: number;
  photoPunches?: Array<{
    punchId?: string;
    type?: string;
    occurredAt?: string;
  }>;
};

type DailyReportEmployee = {
  name?: string;
  days?: DailyReportDay[];
  totalHoursFormatted?: string;
  totalHoursDecimal?: number;
};

type DailyReportResponse = {
  range?: { from?: string; to?: string };
  employees?: DailyReportEmployee[];
};

export async function GET(request: Request) {
  const query = await scopedQueryFromRequest(request);
  const response = await clockinFetch(withQuery("/reports/daily", query));
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return new Response(JSON.stringify(error), { status: response.status });
  }
  const data = (await response.json()) as DailyReportResponse;
  const company = await getCompanyExportProfile();

  return excelResponse("daily-report.xlsx", (workbook) => {
    const sheet = workbook.addWorksheet("Daily Report");
    sheet.addRow([company.displayName]);
    sheet.addRow(["Report", "Daily Time Report"]);
    if (data.range?.from && data.range?.to) {
      sheet.addRow(["Range", `${data.range.from} - ${data.range.to}`]);
    }
    companyMetaRows(company).slice(1).forEach(([label, value]) => {
      sheet.addRow([label, value]);
    });
    sheet.addRow([]);
    sheet.columns = [
      { header: "Employee", key: "employee", width: 26 },
      { header: "Date", key: "date", width: 14 },
      { header: "First In", key: "firstIn", width: 14 },
      { header: "Last Out", key: "lastOut", width: 14 },
      { header: "Hours (hh:mm)", key: "hours", width: 14 },
      { header: "Decimal", key: "decimal", width: 10 },
      { header: "Photo Count", key: "photoCount", width: 12 },
      { header: "Photo Punches", key: "photoPunches", width: 28 },
    ];

    data.employees?.forEach((employee) => {
      employee.days?.forEach((day) => {
        sheet.addRow({
          employee: employee.name || "",
          date: day.date || "",
          firstIn: day.firstIn
            ? new Date(day.firstIn).toLocaleTimeString()
            : "",
          lastOut: day.lastOut
            ? new Date(day.lastOut).toLocaleTimeString()
            : "",
          hours: day.hoursFormatted || "",
          decimal: day.hoursDecimal ?? "",
          photoCount: day.photoCount ?? 0,
          photoPunches:
            day.photoPunches
              ?.map((punch) => {
                const occurredAt = punch.occurredAt
                  ? new Date(punch.occurredAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "";
                return `${punch.type || ""} ${occurredAt}`.trim();
              })
              .join("; ") || "",
        });
      });
      sheet.addRow({
        employee: `${employee.name || ""} TOTAL`,
        date: "",
        firstIn: "",
        lastOut: "",
        hours: employee.totalHoursFormatted || "",
        decimal: employee.totalHoursDecimal ?? "",
        photoCount: "",
        photoPunches: "",
      });
      sheet.addRow({});
    });
  });
}
