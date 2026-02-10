import { clockinFetch } from "../../../../../lib/clockin-api";
import { excelResponse } from "../../../../../lib/excel-export";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();
  const response = await clockinFetch(
    `/reports/payroll${query ? `?${query}` : ""}`,
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return new Response(JSON.stringify(error), { status: response.status });
  }
  const data = await response.json();

  return excelResponse("payroll-report.xlsx", (workbook) => {
    const sheet = workbook.addWorksheet("Payroll Summary");
    sheet.columns = [
      { header: "Employee", key: "employee", width: 26 },
      { header: "Week Start", key: "weekStart", width: 14 },
      { header: "Total (hh:mm)", key: "total", width: 14 },
      { header: "Regular (hh:mm)", key: "regular", width: 14 },
      { header: "Overtime (hh:mm)", key: "overtime", width: 14 },
      { header: "Decimal", key: "decimal", width: 10 },
      { header: "Hourly Rate", key: "rate", width: 12 },
      { header: "Regular Pay", key: "regularPay", width: 14 },
      { header: "Overtime Pay", key: "overtimePay", width: 14 },
      { header: "Total Pay", key: "totalPay", width: 14 },
    ];

    data.employees?.forEach((employee: any) => {
      employee.weeks?.forEach((week: any) => {
        sheet.addRow({
          employee: employee.name,
          weekStart: week.weekStart,
          total: week.totalHoursFormatted,
          regular: week.regularHoursFormatted,
          overtime: week.overtimeHoursFormatted,
          decimal: week.totalHoursDecimal,
          rate: employee.hourlyRate ?? 0,
          regularPay: week.regularPay ?? 0,
          overtimePay: week.overtimePay ?? 0,
          totalPay: week.totalPay ?? 0,
        });
      });
      sheet.addRow({
        employee: `${employee.name} TOTAL`,
        weekStart: "",
        total: employee.totalHoursFormatted,
        regular: "",
        overtime: "",
        decimal: employee.totalHoursDecimal,
        rate: employee.hourlyRate ?? 0,
        regularPay: "",
        overtimePay: "",
        totalPay: employee.totalPay ?? 0,
      });
      sheet.addRow({});
    });
  });
}
