import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

export async function excelResponse(
  filename: string,
  build: (workbook: ExcelJS.Workbook) => Promise<void> | void,
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ClockIn";
  workbook.created = new Date();

  await build(workbook);

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
