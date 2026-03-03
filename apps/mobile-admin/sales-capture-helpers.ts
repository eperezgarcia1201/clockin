import { parseDateInputToIso, parseMoneyInput } from "./app-helpers";
import type { ExpensePaymentMethod, ReceiptAttachment } from "./types";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

type SalesReportPayload = {
  date: string;
  foodSales: number;
  liquorSales: number;
  cashPayments: number;
  bankDepositBatch?: string;
  checkPayments: number;
  creditCardPayments: number;
  otherPayments: number;
  notes?: string;
};

export type SalesReportPayloadResult =
  | { ok: false; error: string }
  | { ok: true; payload: SalesReportPayload };

export const buildSalesReportPayload = (params: {
  salesDate: string;
  salesFood: string;
  salesLiquor: string;
  salesCash: string;
  salesBatch: string;
  salesNotes: string;
}): SalesReportPayloadResult => {
  const date = parseDateInputToIso(params.salesDate);
  if (!date) {
    return {
      ok: false,
      error: "Report date is required in MM/DD/YYYY format.",
    };
  }
  const foodSales = parseMoneyInput(params.salesFood);
  const liquorSales = parseMoneyInput(params.salesLiquor);
  const cashPayments = parseMoneyInput(params.salesCash);
  if (foodSales === null || liquorSales === null || cashPayments === null) {
    return {
      ok: false,
      error:
        "Food sales, liquor sales, and daily cash must be non-negative numbers (no blank fields).",
    };
  }
  const bankDepositBatch = params.salesBatch.trim();
  if (!bankDepositBatch) {
    return {
      ok: false,
      error: "Bank deposit batch is required.",
    };
  }

  return {
    ok: true,
    payload: {
      date,
      foodSales,
      liquorSales,
      cashPayments,
      bankDepositBatch,
      checkPayments: 0,
      creditCardPayments: 0,
      otherPayments: 0,
      notes: params.salesNotes.trim() || undefined,
    },
  };
};

type SalesExpensePayload = {
  date: string;
  companyName: string;
  invoiceNumber: string;
  paymentMethod: ExpensePaymentMethod;
  amount: number;
  checkNumber?: string;
  payToCompany?: string;
  notes?: string;
};

export type SalesExpensePayloadResult =
  | { ok: false; error: string }
  | { ok: true; payload: SalesExpensePayload };

export const buildSalesExpensePayload = (params: {
  todayExpenseDate: string;
  companyName: string;
  invoiceNumber: string;
  paymentMethod: ExpensePaymentMethod;
  amount: string;
  checkNumber: string;
  payToCompany: string;
  notes: string;
}): SalesExpensePayloadResult => {
  const date = parseDateInputToIso(params.todayExpenseDate);
  if (!date) {
    return { ok: false, error: "Unable to resolve today date." };
  }
  if (!params.companyName.trim()) {
    return { ok: false, error: "Company name is required." };
  }
  const amount = parseMoneyInput(params.amount);
  if (amount === null) {
    return {
      ok: false,
      error: "Expense amount must be a non-negative number.",
    };
  }
  const invoiceNumber = params.invoiceNumber.trim();
  if (params.paymentMethod === "CHECK") {
    if (!invoiceNumber) {
      return {
        ok: false,
        error: "Invoice number is required for check expenses.",
      };
    }
    if (!params.checkNumber.trim()) {
      return {
        ok: false,
        error: "Check number is required for check expenses.",
      };
    }
    if (!params.payToCompany.trim()) {
      return {
        ok: false,
        error: "Pay-to company is required for check expenses.",
      };
    }
  }

  return {
    ok: true,
    payload: {
      date,
      companyName: params.companyName.trim(),
      invoiceNumber,
      paymentMethod: params.paymentMethod,
      amount,
      checkNumber:
        params.paymentMethod === "CHECK"
          ? params.checkNumber.trim()
          : undefined,
      payToCompany:
        params.paymentMethod === "CHECK"
          ? params.payToCompany.trim()
          : undefined,
      notes: params.notes.trim() || undefined,
    },
  };
};

export const buildCapturedReceiptAttachment = (asset: {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
}): ReceiptAttachment => {
  const fallbackMimeType = asset.uri.toLowerCase().endsWith(".png")
    ? "image/png"
    : "image/jpeg";
  const mimeType = asset.mimeType || fallbackMimeType;
  const extension = mimeType.includes("png") ? "png" : "jpg";
  const fileName =
    asset.fileName?.trim() || `expense-receipt-${Date.now()}.${extension}`;
  return {
    uri: asset.uri,
    mimeType,
    fileName,
  };
};

export const buildSalesExpenseSavedStatus = (
  hasReceipt: boolean,
): string => {
  if (hasReceipt) {
    return "Daily expense and receipt saved.";
  }
  return "Daily expense saved.";
};

export const saveSalesReportRequest = async (params: {
  fetchJson: FetchJson;
  payload: SalesReportPayload;
}): Promise<{ ok: true } | { ok: false; error: string }> => {
  try {
    await params.fetchJson("/reports/sales", {
      method: "POST",
      body: JSON.stringify(params.payload),
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to save daily sales report.",
    };
  }
};

export const saveSalesExpenseRequest = async (params: {
  fetchJson: FetchJson;
  payload: SalesExpensePayload;
  receipt: ReceiptAttachment | null;
}): Promise<{ ok: true } | { ok: false; error: string }> => {
  try {
    const created = (await params.fetchJson("/reports/sales/expenses", {
      method: "POST",
      body: JSON.stringify(params.payload),
    })) as { expense?: { id?: string } };

    if (params.receipt?.uri) {
      const expenseId = created.expense?.id;
      if (!expenseId) {
        throw new Error("Expense saved, but receipt upload could not start.");
      }
      const form = new FormData();
      form.append("file", {
        uri: params.receipt.uri,
        name: params.receipt.fileName,
        type: params.receipt.mimeType,
      } as any);
      await params.fetchJson(`/reports/sales/expenses/${expenseId}/receipt`, {
        method: "POST",
        body: form,
      });
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unable to save daily expense.",
    };
  }
};
