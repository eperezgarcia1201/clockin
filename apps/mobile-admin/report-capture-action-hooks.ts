import type { Dispatch, SetStateAction } from "react";
import * as ImagePicker from "expo-image-picker";
import { runReportRequest } from "./report-runtime";
import {
  buildCapturedReceiptAttachment,
  buildSalesExpensePayload,
  buildSalesExpenseSavedStatus,
  buildSalesReportPayload,
  saveSalesExpenseRequest,
  saveSalesReportRequest,
} from "./sales-capture-helpers";
import type {
  ExpensePaymentMethod,
  ReceiptAttachment,
  ReportType,
} from "./types";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export const useReportCaptureActions = (params: {
  fetchJson: FetchJson;
  reportType: ReportType;
  fromDate: string;
  toDate: string;
  reportEmployeeId: string;
  setReportStatus: Dispatch<SetStateAction<string | null>>;
  setReportLoading: Dispatch<SetStateAction<boolean>>;
  setReportRows: Dispatch<SetStateAction<any[]>>;
  salesDate: string;
  salesFood: string;
  salesLiquor: string;
  salesCash: string;
  salesBatch: string;
  salesNotes: string;
  setSalesActionStatus: Dispatch<SetStateAction<string | null>>;
  setSalesSaveLoading: Dispatch<SetStateAction<boolean>>;
  todayExpenseDate: string;
  salesExpenseCompany: string;
  salesExpenseInvoice: string;
  salesExpenseMethod: ExpensePaymentMethod;
  salesExpenseAmount: string;
  salesExpenseCheckNumber: string;
  salesExpensePayToCompany: string;
  salesExpenseNotes: string;
  salesExpenseReceipt: ReceiptAttachment | null;
  setSalesExpenseReceipt: Dispatch<SetStateAction<ReceiptAttachment | null>>;
  setSalesExpenseReceiptLoading: Dispatch<SetStateAction<boolean>>;
  setSalesExpenseSaveLoading: Dispatch<SetStateAction<boolean>>;
  setSalesExpenseCompany: Dispatch<SetStateAction<string>>;
  setSalesExpenseInvoice: Dispatch<SetStateAction<string>>;
  setSalesExpenseAmount: Dispatch<SetStateAction<string>>;
  setSalesExpenseCheckNumber: Dispatch<SetStateAction<string>>;
  setSalesExpensePayToCompany: Dispatch<SetStateAction<string>>;
  setSalesExpenseNotes: Dispatch<SetStateAction<string>>;
  setSalesExpenseMethod: Dispatch<SetStateAction<ExpensePaymentMethod>>;
}) => {
  const runReport = async () => {
    params.setReportStatus(null);
    params.setReportLoading(true);
    try {
      const result = await runReportRequest({
        fetchJson: params.fetchJson,
        reportType: params.reportType,
        fromDate: params.fromDate,
        toDate: params.toDate,
        reportEmployeeId: params.reportEmployeeId,
      });
      if (result.ok === false) {
        params.setReportStatus(result.error);
      } else {
        params.setReportRows(result.rows);
        params.setReportStatus(result.status);
      }
    } finally {
      params.setReportLoading(false);
    }
  };

  const saveSalesReport = async () => {
    params.setSalesActionStatus(null);
    const payloadResult = buildSalesReportPayload({
      salesDate: params.salesDate,
      salesFood: params.salesFood,
      salesLiquor: params.salesLiquor,
      salesCash: params.salesCash,
      salesBatch: params.salesBatch,
      salesNotes: params.salesNotes,
    });
    if (payloadResult.ok === false) {
      params.setSalesActionStatus(payloadResult.error);
      return;
    }

    params.setSalesSaveLoading(true);
    try {
      const result = await saveSalesReportRequest({
        fetchJson: params.fetchJson,
        payload: payloadResult.payload,
      });
      if (result.ok === false) {
        params.setSalesActionStatus(result.error);
        return;
      }
      params.setSalesActionStatus("Daily sales report saved.");
    } finally {
      params.setSalesSaveLoading(false);
    }
  };

  const captureSalesExpenseReceipt = async () => {
    params.setSalesActionStatus(null);
    params.setSalesExpenseReceiptLoading(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        params.setSalesActionStatus(
          "Camera permission is required for receipt photos.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.7,
      });
      if (result.canceled || !result.assets.length) {
        return;
      }

      const asset = result.assets[0];
      params.setSalesExpenseReceipt(buildCapturedReceiptAttachment(asset));
      params.setSalesActionStatus("Receipt photo attached.");
    } catch (error) {
      params.setSalesActionStatus(
        error instanceof Error ? error.message : "Unable to open the camera.",
      );
    } finally {
      params.setSalesExpenseReceiptLoading(false);
    }
  };

  const saveSalesExpense = async () => {
    params.setSalesActionStatus(null);
    const payloadResult = buildSalesExpensePayload({
      todayExpenseDate: params.todayExpenseDate,
      companyName: params.salesExpenseCompany,
      invoiceNumber: params.salesExpenseInvoice,
      paymentMethod: params.salesExpenseMethod,
      amount: params.salesExpenseAmount,
      checkNumber: params.salesExpenseCheckNumber,
      payToCompany: params.salesExpensePayToCompany,
      notes: params.salesExpenseNotes,
    });
    if (payloadResult.ok === false) {
      params.setSalesActionStatus(payloadResult.error);
      return;
    }

    params.setSalesExpenseSaveLoading(true);
    try {
      const result = await saveSalesExpenseRequest({
        fetchJson: params.fetchJson,
        payload: payloadResult.payload,
        receipt: params.salesExpenseReceipt,
      });
      if (result.ok === false) {
        params.setSalesActionStatus(result.error);
        return;
      }
      params.setSalesActionStatus(
        buildSalesExpenseSavedStatus(Boolean(params.salesExpenseReceipt)),
      );
      params.setSalesExpenseCompany("");
      params.setSalesExpenseInvoice("");
      params.setSalesExpenseAmount("0");
      params.setSalesExpenseCheckNumber("");
      params.setSalesExpensePayToCompany("");
      params.setSalesExpenseNotes("");
      params.setSalesExpenseMethod("CHECK");
      params.setSalesExpenseReceipt(null);
    } finally {
      params.setSalesExpenseSaveLoading(false);
    }
  };

  return {
    runReport,
    saveSalesReport,
    captureSalesExpenseReceipt,
    saveSalesExpense,
  };
};
