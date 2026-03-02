import type {
  CaptureMode,
  ExpensePaymentMethod,
  ReceiptAttachment,
} from "../types";

export type CaptureText = {
  captureTitle: string;
  captureSubtitle: string;
  salesToggle: string;
  expenseToggle: string;
  salesTitle: string;
  expenseTitle: string;
  salesDate: string;
  foodSales: string;
  liquorSales: string;
  cashPayments: string;
  bankBatch: string;
  notesOptional: string;
  saveDailySales: string;
  saveDailyExpense: string;
  saving: string;
  expenseDate: string;
  invoiceNumber: string;
  companyName: string;
  paymentMethod: string;
  checkTotal: string;
  debitTotal: string;
  cashTotal: string;
  checkNumber: string;
  payToCompany: string;
  receiptPhoto: string;
  openingCamera: string;
  retakePhoto: string;
  takePhoto: string;
  removePhoto: string;
  attached: string;
  noPhoto: string;
};

export type CaptureCardProps = {
  isLight: boolean;
  text: CaptureText;
  captureMode: CaptureMode;
  onCaptureModeChange: (mode: CaptureMode) => void;
  salesDate: string;
  onSalesDateChange: (value: string) => void;
  salesFood: string;
  onSalesFoodChange: (value: string) => void;
  salesLiquor: string;
  onSalesLiquorChange: (value: string) => void;
  salesCash: string;
  onSalesCashChange: (value: string) => void;
  salesBatch: string;
  onSalesBatchChange: (value: string) => void;
  salesNotes: string;
  onSalesNotesChange: (value: string) => void;
  salesSaveLoading: boolean;
  onSaveSales: () => void;
  todayExpenseDate: string;
  salesExpenseInvoice: string;
  onSalesExpenseInvoiceChange: (value: string) => void;
  salesExpenseCompany: string;
  onSalesExpenseCompanyChange: (value: string) => void;
  salesExpenseMethod: ExpensePaymentMethod;
  onSalesExpenseMethodChange: (method: ExpensePaymentMethod) => void;
  salesExpenseAmount: string;
  onSalesExpenseAmountChange: (value: string) => void;
  salesExpenseCheckNumber: string;
  onSalesExpenseCheckNumberChange: (value: string) => void;
  salesExpensePayToCompany: string;
  onSalesExpensePayToCompanyChange: (value: string) => void;
  salesExpenseNotes: string;
  onSalesExpenseNotesChange: (value: string) => void;
  salesExpenseReceipt: ReceiptAttachment | null;
  salesExpenseReceiptLoading: boolean;
  onCaptureSalesExpenseReceipt: () => void;
  onRemoveSalesExpenseReceipt: () => void;
  salesExpenseSaveLoading: boolean;
  onSaveSalesExpense: () => void;
  salesActionStatus: string | null;
  inlineOrNull: (value: string | null | undefined) => string | null;
};
