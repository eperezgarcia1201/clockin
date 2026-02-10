import { clockinFetch } from "../../../../../lib/clockin-api";
import { excelResponse } from "../../../../../lib/excel-export";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();
  const response = await clockinFetch(
    `/reports/hours${query ? `?${query}` : ""}`,
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return new Response(JSON.stringify(error), { status: response.status });
  }
  const data = await response.json();

  return excelResponse("hours-report.xlsx", (workbook) => {
    const sheet = workbook.addWorksheet("Hours Worked");
    sheet.columns = [
      { header: "Employee", key: "employee", width: 26 },
      { header: "Date", key: "date", width: 14 },
      { header: "Hours (hh:mm)", key: "hours", width: 14 },
      { header: "Decimal", key: "decimal", width: 10 },
      { header: "Minutes", key: "minutes", width: 10 },
    ];

    data.employees?.forEach((employee: any) => {
      employee.days?.forEach((day: any) => {
        sheet.addRow({
          employee: employee.name,
          date: day.date,
          hours: day.hoursFormatted,
          decimal: day.hoursDecimal,
          minutes: day.minutes,
        });
      });
      sheet.addRow({
        employee: `${employee.name} TOTAL`,
        date: "",
        hours: employee.totalHoursFormatted,
        decimal: employee.totalHoursDecimal,
        minutes: employee.totalMinutes,
      });
      sheet.addRow({});
    });
  });
}
