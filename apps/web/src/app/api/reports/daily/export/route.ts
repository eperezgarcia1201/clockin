import { clockinFetch } from "../../../../../lib/clockin-api";
import { excelResponse } from "../../../../../lib/excel-export";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();
  const response = await clockinFetch(
    `/reports/daily${query ? `?${query}` : ""}`,
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return new Response(JSON.stringify(error), { status: response.status });
  }
  const data = await response.json();

  return excelResponse("daily-report.xlsx", (workbook) => {
    const sheet = workbook.addWorksheet("Daily Report");
    sheet.columns = [
      { header: "Employee", key: "employee", width: 26 },
      { header: "Date", key: "date", width: 14 },
      { header: "First In", key: "firstIn", width: 14 },
      { header: "Last Out", key: "lastOut", width: 14 },
      { header: "Hours (hh:mm)", key: "hours", width: 14 },
      { header: "Decimal", key: "decimal", width: 10 },
    ];

    data.employees?.forEach((employee: any) => {
      employee.days?.forEach((day: any) => {
        sheet.addRow({
          employee: employee.name,
          date: day.date,
          firstIn: day.firstIn
            ? new Date(day.firstIn).toLocaleTimeString()
            : "",
          lastOut: day.lastOut
            ? new Date(day.lastOut).toLocaleTimeString()
            : "",
          hours: day.hoursFormatted,
          decimal: day.hoursDecimal,
        });
      });
      sheet.addRow({
        employee: `${employee.name} TOTAL`,
        date: "",
        firstIn: "",
        lastOut: "",
        hours: employee.totalHoursFormatted,
        decimal: employee.totalHoursDecimal,
      });
      sheet.addRow({});
    });
  });
}
