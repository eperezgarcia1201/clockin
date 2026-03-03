import { useState } from "react";
import { formatUsDate } from "./app-helpers";
import type { ReportExportFormat } from "./report-export";
import type {
  CaptureMode,
  ExpensePaymentMethod,
  ReceiptAttachment,
  ReportType,
} from "./types";

export function useAdminReportCaptureState() {
  const [reportType, setReportType] = useState<ReportType>("daily");
  const [reportEmployeeId, setReportEmployeeId] = useState("");
  const [fromDate, setFromDate] = useState(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    return formatUsDate(start);
  });
  const [toDate, setToDate] = useState(() => formatUsDate(new Date()));
  const [reportRows, setReportRows] = useState<any[]>([]);
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportExportingFormat, setReportExportingFormat] =
    useState<ReportExportFormat | null>(null);

  const [salesDate, setSalesDate] = useState(() => formatUsDate(new Date()));
  const [salesFood, setSalesFood] = useState("0");
  const [salesLiquor, setSalesLiquor] = useState("0");
  const [salesCash, setSalesCash] = useState("0");
  const [salesBatch, setSalesBatch] = useState("");
  const [salesNotes, setSalesNotes] = useState("");
  const [salesSaveLoading, setSalesSaveLoading] = useState(false);
  const [salesExpenseCompany, setSalesExpenseCompany] = useState("");
  const [salesExpenseInvoice, setSalesExpenseInvoice] = useState("");
  const [salesExpenseMethod, setSalesExpenseMethod] =
    useState<ExpensePaymentMethod>("CHECK");
  const [salesExpenseAmount, setSalesExpenseAmount] = useState("0");
  const [salesExpenseCheckNumber, setSalesExpenseCheckNumber] = useState("");
  const [salesExpensePayToCompany, setSalesExpensePayToCompany] = useState("");
  const [salesExpenseNotes, setSalesExpenseNotes] = useState("");
  const [salesExpenseReceipt, setSalesExpenseReceipt] =
    useState<ReceiptAttachment | null>(null);
  const [salesExpenseReceiptLoading, setSalesExpenseReceiptLoading] =
    useState(false);
  const [salesExpenseSaveLoading, setSalesExpenseSaveLoading] = useState(false);
  const [salesActionStatus, setSalesActionStatus] = useState<string | null>(
    null,
  );
  const [captureMode, setCaptureMode] = useState<CaptureMode>("sales");

  return {
    reportType,
    setReportType,
    reportEmployeeId,
    setReportEmployeeId,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    reportRows,
    setReportRows,
    reportStatus,
    setReportStatus,
    reportLoading,
    setReportLoading,
    reportExportingFormat,
    setReportExportingFormat,
    salesDate,
    setSalesDate,
    salesFood,
    setSalesFood,
    salesLiquor,
    setSalesLiquor,
    salesCash,
    setSalesCash,
    salesBatch,
    setSalesBatch,
    salesNotes,
    setSalesNotes,
    salesSaveLoading,
    setSalesSaveLoading,
    salesExpenseCompany,
    setSalesExpenseCompany,
    salesExpenseInvoice,
    setSalesExpenseInvoice,
    salesExpenseMethod,
    setSalesExpenseMethod,
    salesExpenseAmount,
    setSalesExpenseAmount,
    salesExpenseCheckNumber,
    setSalesExpenseCheckNumber,
    salesExpensePayToCompany,
    setSalesExpensePayToCompany,
    salesExpenseNotes,
    setSalesExpenseNotes,
    salesExpenseReceipt,
    setSalesExpenseReceipt,
    salesExpenseReceiptLoading,
    setSalesExpenseReceiptLoading,
    salesExpenseSaveLoading,
    setSalesExpenseSaveLoading,
    salesActionStatus,
    setSalesActionStatus,
    captureMode,
    setCaptureMode,
  };
}
