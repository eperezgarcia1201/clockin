"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createSalesExpenseRequest,
  createSalesReportRequest,
  deleteSalesExpenseRequest,
  fetchSalesAccessRequest,
  fetchSalesReportRequest,
  fetchSalesSettingsRequest,
  updateSalesExpenseRequest,
  uploadSalesExpenseReceiptRequest,
} from "../../../lib/api/reports-sales";
import { DailyExpenseEntriesTable } from "./components/DailyExpenseEntriesTable";
import { SalesLocationBreakdownTable } from "./components/SalesLocationBreakdownTable";
import { buildSalesLocationBreakdown } from "./location-breakdown";

type SettingsResponse = {
  reportsEnabled?: boolean;
  dailySalesReportingEnabled?: boolean;
  timezone?: string;
};

type AccessResponse = {
  role?: string;
  status?: string;
  isAdmin?: boolean;
};

type ExpensePaymentMethod = "CHECK" | "DEBIT_CARD" | "CASH";
type Lang = "en" | "es";

const translations: Record<
  Lang,
  {
    dailySalesReport: string;
    loadingFeatureSettings: string;
    unableLoadTenantSettings: string;
    reportsDisabledMessage: string;
    dailySalesDisabledMessage: string;
    reportDate: string;
    foodSales: string;
    liquorSales: string;
    cashPayments: string;
    bankDepositBatch: string;
    bankDepositBatchPlaceholder: string;
    notesOptional: string;
    notesPlaceholder: string;
    adminOverrideEnabled: string;
    lockedToTodayMessage: string;
    saveDailyReport: string;
    saveExpense: string;
    updateExpense: string;
    cancelEdit: string;
    saving: string;
    editingExpense: string;
    sales: string;
    payments: string;
    balance: string;
    expensesOfTheDay: string;
    date: string;
    autoSetToday: string;
    invoiceNumber: string;
    invoiceNumberPlaceholder: string;
    companyName: string;
    companyNamePlaceholder: string;
    checkTotal: string;
    debitCardTotal: string;
    cashTotal: string;
    checkQuestion: string;
    yes: string;
    no: string;
    nonCheckQuestion: string;
    debitCard: string;
    cash: string;
    checkNumber: string;
    checkNumberPlaceholder: string;
    companyCheckGoingTo: string;
    companyReceivingPaymentPlaceholder: string;
    receiptFileOptional: string;
    receiptHelpText: string;
    expenseNotesOptional: string;
    expenseNotesPlaceholder: string;
    exportExpenses: string;
    period: string;
    referenceDate: string;
    day: string;
    week: string;
    month: string;
    exportExpensesExcel: string;
    exportExpensesCsv: string;
    exportExpensesPdf: string;
    reportRange: string;
    from: string;
    to: string;
    refresh: string;
    loading: string;
    exportExcel: string;
    exportCsv: string;
    exportPdf: string;
    totalSales: string;
    cashPaymentsMetric: string;
    debitExpenses: string;
    checkExpenses: string;
    noSalesOrExpensesInRange: string;
    dailySalesAndExpensesInRange: (reports: number, expenses: number) => string;
    dailySalesEntries: string;
    noDailySalesReportsFound: string;
    dailyExpenseEntries: string;
    noDailyExpensesFound: string;
    paymentMethodCheck: string;
    paymentMethodDebitCard: string;
    paymentMethodCash: string;
    view: string;
    submittedBy: string;
    method: string;
    amount: string;
    receipt: string;
    actions: string;
    edit: string;
    delete: string;
    statusFromBeforeTo: string;
    statusUnableLoadSalesReports: string;
    statusAmountsMustBeNonNegative: string;
    statusDailyReportSaved: string;
    statusUnableSaveSalesReport: string;
    statusExpenseAmountNonNegative: string;
    statusCompanyRequired: string;
    statusInvoiceRequired: string;
    statusCheckNumberRequired: string;
    statusPayToRequired: string;
    statusReceiptTooLarge: string;
    statusReceiptTypeUnsupported: string;
    statusExpenseSavedUploadCannotStart: string;
    statusUnableUploadReceipt: string;
    statusUnableSaveExpense: string;
    statusExpenseAndReceiptSaved: string;
    statusExpenseSaved: string;
    statusExpenseUpdated: string;
    statusExpenseAndReceiptUpdated: string;
    statusUnableDeleteExpense: string;
    statusExpenseDeleted: string;
    confirmDeleteExpense: string;
    expenseDateHelpText: string;
    location: string;
    locationScope: string;
    allLocations: string;
    unassignedLocation: string;
    locationScopeHelp: string;
    locationBreakdown: string;
    locationBreakdownHelp: string;
    locationsWithActivity: (count: number) => string;
    salesReportsCount: string;
    expenseEntriesCount: string;
    totalExpenses: string;
  }
> = {
  en: {
    dailySalesReport: "Daily Sales Report",
    loadingFeatureSettings: "Loading feature settings...",
    unableLoadTenantSettings: "Unable to load tenant settings.",
    reportsDisabledMessage:
      "Reports are disabled for this tenant. Ask the owner to enable reports first.",
    dailySalesDisabledMessage:
      "Daily sales reporting is disabled for this tenant. Ask the owner to enable this feature.",
    reportDate: "Report Date",
    foodSales: "Food Sales",
    liquorSales: "Liquor Sales",
    cashPayments: "Cash Payments",
    bankDepositBatch: "Bank Deposit Batch",
    bankDepositBatchPlaceholder: "Batch reference",
    notesOptional: "Notes (optional)",
    notesPlaceholder: "Add manager notes for this day",
    adminOverrideEnabled:
      "Admin override enabled: you can edit previous dates.",
    lockedToTodayMessage:
      "Locked to today's date. Admin authorization is required to modify another date.",
    saveDailyReport: "Save Daily Report",
    saveExpense: "Save Expense",
    updateExpense: "Update Expense",
    cancelEdit: "Cancel Edit",
    saving: "Saving...",
    editingExpense: "Editing expense entry",
    sales: "Sales",
    payments: "Payments",
    balance: "Balance",
    expensesOfTheDay: "Expenses of the Day",
    date: "Date",
    autoSetToday: "Auto set to today.",
    invoiceNumber: "Invoice Number",
    invoiceNumberPlaceholder: "INV-001",
    companyName: "Company Name",
    companyNamePlaceholder: "Supplier / Vendor",
    checkTotal: "Check Total",
    debitCardTotal: "Debit Card Total",
    cashTotal: "Cash Total",
    checkQuestion: "Was the payment made with check?",
    yes: "Yes",
    no: "No",
    nonCheckQuestion: "If not check, how was it paid?",
    debitCard: "Debit Card",
    cash: "Cash",
    checkNumber: "Check Number",
    checkNumberPlaceholder: "CHK-1002",
    companyCheckGoingTo: "Company Check Is Going To",
    companyReceivingPaymentPlaceholder: "Company receiving payment",
    receiptFileOptional: "Invoice / Receipt File (optional)",
    receiptHelpText:
      "Attach a photo/PDF of the invoice or receipt. Max size: 6 MB.",
    expenseNotesOptional: "Expense Notes (optional)",
    expenseNotesPlaceholder: "Optional note",
    exportExpenses: "Export Expenses",
    period: "Period",
    referenceDate: "Reference Date",
    day: "Day",
    week: "Week",
    month: "Month",
    exportExpensesExcel: "Export Expenses Excel",
    exportExpensesCsv: "Export Expenses CSV",
    exportExpensesPdf: "Export Expenses PDF",
    reportRange: "Report Range",
    from: "From",
    to: "To",
    refresh: "Refresh",
    loading: "Loading...",
    exportExcel: "Export Excel",
    exportCsv: "Export CSV",
    exportPdf: "Export PDF",
    totalSales: "Total Sales",
    cashPaymentsMetric: "Cash Payments",
    debitExpenses: "Debit Expenses",
    checkExpenses: "Check Expenses",
    noSalesOrExpensesInRange: "No daily sales report found for this range.",
    dailySalesAndExpensesInRange: (reports, expenses) =>
      `${reports} daily sales report(s) and ${expenses} expense record(s) in this range.`,
    dailySalesEntries: "Daily Sales Entries",
    noDailySalesReportsFound: "No daily sales reports found for this range.",
    dailyExpenseEntries: "Daily Expense Entries",
    noDailyExpensesFound: "No daily expenses found for this range.",
    paymentMethodCheck: "Check",
    paymentMethodDebitCard: "Debit Card",
    paymentMethodCash: "Cash",
    view: "View",
    submittedBy: "Submitted By",
    method: "Method",
    amount: "Amount",
    receipt: "Receipt",
    actions: "Actions",
    edit: "Edit",
    delete: "Delete",
    statusFromBeforeTo: '"From" date must be before or equal to "To" date.',
    statusUnableLoadSalesReports: "Unable to load sales reports.",
    statusAmountsMustBeNonNegative:
      "Food sales and liquor sales must be non-negative numbers.",
    statusDailyReportSaved: "Daily sales report saved.",
    statusUnableSaveSalesReport: "Unable to save sales report.",
    statusExpenseAmountNonNegative:
      "Expense amount must be a non-negative number.",
    statusCompanyRequired: "Company name is required for expenses.",
    statusInvoiceRequired: "Invoice number is required for expenses.",
    statusCheckNumberRequired: "Check number is required for check payments.",
    statusPayToRequired: "Pay-to company is required for check payments.",
    statusReceiptTooLarge: "Receipt file is too large. Max size is 6 MB.",
    statusReceiptTypeUnsupported:
      "Unsupported receipt file type. Use JPG, PNG, WEBP, or PDF.",
    statusExpenseSavedUploadCannotStart:
      "Expense was saved but receipt upload could not start.",
    statusUnableUploadReceipt: "Unable to upload receipt.",
    statusUnableSaveExpense: "Unable to save daily expense.",
    statusExpenseAndReceiptSaved: "Expense and receipt saved.",
    statusExpenseSaved: "Expense saved.",
    statusExpenseUpdated: "Expense updated.",
    statusExpenseAndReceiptUpdated: "Expense and receipt updated.",
    statusUnableDeleteExpense: "Unable to delete daily expense.",
    statusExpenseDeleted: "Expense deleted.",
    confirmDeleteExpense: "Delete this daily expense entry?",
    expenseDateHelpText:
      "Defaults to today. Adjust if this expense belongs to another date.",
    location: "Location",
    locationScope: "Location Scope",
    allLocations: "All Locations",
    unassignedLocation: "Unassigned",
    locationScopeHelp:
      "Uses the location selected in the top bar. Choose a specific location there before saving daily sales or expenses.",
    locationBreakdown: "Location Breakdown",
    locationBreakdownHelp:
      "Combined totals stay above. This table breaks the selected range out by location.",
    locationsWithActivity: (count) =>
      count === 1
        ? "1 location with activity in this range."
        : `${count} locations with activity in this range.`,
    salesReportsCount: "Sales Reports",
    expenseEntriesCount: "Expense Entries",
    totalExpenses: "Total Expenses",
  },
  es: {
    dailySalesReport: "Reporte Diario de Ventas",
    loadingFeatureSettings: "Cargando configuración de funciones...",
    unableLoadTenantSettings: "No se pudo cargar la configuración del tenant.",
    reportsDisabledMessage:
      "Los reportes están deshabilitados para este tenant. Pide al owner habilitarlos primero.",
    dailySalesDisabledMessage:
      "El reporte diario de ventas está deshabilitado para este tenant. Pide al owner habilitar esta función.",
    reportDate: "Fecha del Reporte",
    foodSales: "Ventas de Comida",
    liquorSales: "Ventas de Licor",
    cashPayments: "Pagos en Efectivo",
    bankDepositBatch: "Lote de Depósito Bancario",
    bankDepositBatchPlaceholder: "Referencia del lote",
    notesOptional: "Notas (opcional)",
    notesPlaceholder: "Agregar notas del gerente para este día",
    adminOverrideEnabled:
      "Anulación de admin habilitada: puedes editar fechas anteriores.",
    lockedToTodayMessage:
      "Bloqueado a la fecha de hoy. Se requiere autorización de admin para modificar otra fecha.",
    saveDailyReport: "Guardar Reporte Diario",
    saveExpense: "Guardar Gasto",
    updateExpense: "Actualizar Gasto",
    cancelEdit: "Cancelar Edición",
    saving: "Guardando...",
    editingExpense: "Editando registro de gasto",
    sales: "Ventas",
    payments: "Pagos",
    balance: "Balance",
    expensesOfTheDay: "Gastos del Día",
    date: "Fecha",
    autoSetToday: "Asignado automáticamente a hoy.",
    invoiceNumber: "Número de Factura",
    invoiceNumberPlaceholder: "INV-001",
    companyName: "Nombre de la Empresa",
    companyNamePlaceholder: "Proveedor",
    checkTotal: "Total del Cheque",
    debitCardTotal: "Total Tarjeta Débito",
    cashTotal: "Total en Efectivo",
    checkQuestion: "¿El pago se realizó con cheque?",
    yes: "Sí",
    no: "No",
    nonCheckQuestion: "Si no fue cheque, ¿cómo se pagó?",
    debitCard: "Tarjeta Débito",
    cash: "Efectivo",
    checkNumber: "Número de Cheque",
    checkNumberPlaceholder: "CHK-1002",
    companyCheckGoingTo: "Empresa a Nombre del Cheque",
    companyReceivingPaymentPlaceholder: "Empresa que recibe el pago",
    receiptFileOptional: "Archivo de Factura / Recibo (opcional)",
    receiptHelpText:
      "Adjunta foto/PDF de la factura o recibo. Tamaño máximo: 6 MB.",
    expenseNotesOptional: "Notas del Gasto (opcional)",
    expenseNotesPlaceholder: "Nota opcional",
    exportExpenses: "Exportar Gastos",
    period: "Período",
    referenceDate: "Fecha de Referencia",
    day: "Día",
    week: "Semana",
    month: "Mes",
    exportExpensesExcel: "Exportar Gastos Excel",
    exportExpensesCsv: "Exportar Gastos CSV",
    exportExpensesPdf: "Exportar Gastos PDF",
    reportRange: "Rango del Reporte",
    from: "Desde",
    to: "Hasta",
    refresh: "Actualizar",
    loading: "Cargando...",
    exportExcel: "Exportar Excel",
    exportCsv: "Exportar CSV",
    exportPdf: "Exportar PDF",
    totalSales: "Ventas Totales",
    cashPaymentsMetric: "Pagos en Efectivo",
    debitExpenses: "Gastos Débito",
    checkExpenses: "Gastos Cheque",
    noSalesOrExpensesInRange:
      "No hay reportes de ventas diarias en este rango.",
    dailySalesAndExpensesInRange: (reports, expenses) =>
      `${reports} reporte(s) de ventas diarias y ${expenses} registro(s) de gastos en este rango.`,
    dailySalesEntries: "Registros de Ventas Diarias",
    noDailySalesReportsFound:
      "No se encontraron reportes de ventas diarias en este rango.",
    dailyExpenseEntries: "Registros de Gastos Diarios",
    noDailyExpensesFound: "No se encontraron gastos diarios en este rango.",
    paymentMethodCheck: "Cheque",
    paymentMethodDebitCard: "Tarjeta Débito",
    paymentMethodCash: "Efectivo",
    view: "Ver",
    submittedBy: "Enviado Por",
    method: "Método",
    amount: "Monto",
    receipt: "Recibo",
    actions: "Acciones",
    edit: "Editar",
    delete: "Eliminar",
    statusFromBeforeTo:
      'La fecha "Desde" debe ser menor o igual a la fecha "Hasta".',
    statusUnableLoadSalesReports:
      "No se pudieron cargar los reportes de ventas.",
    statusAmountsMustBeNonNegative:
      "Ventas de comida y ventas de licor deben ser números no negativos.",
    statusDailyReportSaved: "Reporte diario de ventas guardado.",
    statusUnableSaveSalesReport: "No se pudo guardar el reporte de ventas.",
    statusExpenseAmountNonNegative:
      "El monto del gasto debe ser un número no negativo.",
    statusCompanyRequired: "El nombre de la empresa es requerido para gastos.",
    statusInvoiceRequired: "El número de factura es requerido para gastos.",
    statusCheckNumberRequired:
      "El número de cheque es requerido para pagos con cheque.",
    statusPayToRequired:
      "La empresa beneficiaria es requerida para pagos con cheque.",
    statusReceiptTooLarge:
      "El archivo del recibo es demasiado grande. Máximo 6 MB.",
    statusReceiptTypeUnsupported:
      "Tipo de archivo no soportado. Usa JPG, PNG, WEBP o PDF.",
    statusExpenseSavedUploadCannotStart:
      "El gasto se guardó, pero no se pudo iniciar la carga del recibo.",
    statusUnableUploadReceipt: "No se pudo cargar el recibo.",
    statusUnableSaveExpense: "No se pudo guardar el gasto diario.",
    statusExpenseAndReceiptSaved: "Gasto y recibo guardados.",
    statusExpenseSaved: "Gasto guardado.",
    statusExpenseUpdated: "Gasto actualizado.",
    statusExpenseAndReceiptUpdated: "Gasto y recibo actualizados.",
    statusUnableDeleteExpense: "No se pudo eliminar el gasto diario.",
    statusExpenseDeleted: "Gasto eliminado.",
    confirmDeleteExpense: "¿Eliminar este registro de gasto diario?",
    expenseDateHelpText:
      "Se asigna a hoy por defecto. Cámbialo si este gasto pertenece a otra fecha.",
    location: "Ubicación",
    locationScope: "Alcance de Ubicación",
    allLocations: "Todas las ubicaciones",
    unassignedLocation: "Sin asignar",
    locationScopeHelp:
      "Usa la ubicación seleccionada en la barra superior. Elige una ubicación específica allí antes de guardar ventas o gastos diarios.",
    locationBreakdown: "Desglose por Ubicación",
    locationBreakdownHelp:
      "Los totales combinados se mantienen arriba. Esta tabla separa el rango seleccionado por ubicación.",
    locationsWithActivity: (count) =>
      count === 1
        ? "1 ubicación con actividad en este rango."
        : `${count} ubicaciones con actividad en este rango.`,
    salesReportsCount: "Reportes de Ventas",
    expenseEntriesCount: "Registros de Gastos",
    totalExpenses: "Gastos Totales",
  },
};

type SalesReportRow = {
  id: string;
  date: string;
  officeId: string | null;
  officeName: string | null;
  foodSales: number;
  liquorSales: number;
  totalSales: number;
  cashPayments: number;
  bankDepositBatch: string;
  checkPayments: number;
  creditCardPayments: number;
  otherPayments: number;
  totalPayments: number;
  balance: number;
  notes: string;
  submittedBy: string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
};

type DailyExpenseRow = {
  id: string;
  date: string;
  officeId: string | null;
  officeName: string | null;
  companyName: string;
  paymentMethod: ExpensePaymentMethod;
  invoiceNumber: string;
  amount: number;
  checkNumber: string | null;
  payToCompany: string | null;
  hasReceipt: boolean;
  notes: string;
  submittedBy: string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
};

type SalesReportResponse = {
  range: { from: string; to: string };
  scope: { officeId: string | null; officeName: string | null; label: string };
  totals: {
    foodSales: number;
    liquorSales: number;
    totalSales: number;
    cashPayments: number;
    checkPayments: number;
    creditCardPayments: number;
    otherPayments: number;
    totalPayments: number;
    balance: number;
  };
  reports: SalesReportRow[];
  expenseTotals: {
    totalExpenses: number;
    cashExpenses: number;
    debitCardExpenses: number;
    checkExpenses: number;
  };
  expenses: DailyExpenseRow[];
};

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateInTimeZone = (date: Date, timeZone?: string) => {
  if (!timeZone) {
    return formatDate(date);
  }
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch {
    return formatDate(date);
  }
  return formatDate(date);
};

const formatDateForDisplay = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return value;
  return `${match[2]}/${match[3]}/${match[1]}`;
};

const formatMoney = (value: number) => `$${value.toFixed(2)}`;

const parseMoney = (value: string) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Number(number.toFixed(2));
};

const sanitizeMoneyInput = (value: string) => {
  const cleaned = value.replace(/[^0-9.]/g, "");
  if (!cleaned) {
    return "";
  }
  const [whole, ...rest] = cleaned.split(".");
  if (!rest.length) {
    return whole;
  }
  const decimal = rest.join("").slice(0, 2);
  return `${whole || "0"}.${decimal}`;
};

const paymentMethodLabel = (
  method: ExpensePaymentMethod,
  t: (typeof translations)[Lang],
) => {
  if (method === "CHECK") return t.paymentMethodCheck;
  if (method === "DEBIT_CARD") return t.paymentMethodDebitCard;
  return t.paymentMethodCash;
};

const ALLOWED_RECEIPT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
const MAX_RECEIPT_SIZE_BYTES = 6 * 1024 * 1024;

const expenseAmountLabel = (
  method: ExpensePaymentMethod,
  t: (typeof translations)[Lang],
) => {
  if (method === "CHECK") return t.checkTotal;
  if (method === "DEBIT_CARD") return t.debitCardTotal;
  return t.cashTotal;
};

export default function SalesReportPage() {
  const today = useMemo(() => new Date(), []);
  const sevenDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return date;
  }, []);
  const todayDateKey = useMemo(() => formatDate(new Date()), []);

  const [featureEnabled, setFeatureEnabled] = useState<boolean | null>(null);
  const [featureStatus, setFeatureStatus] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("en");
  const [canModifyLockedDates, setCanModifyLockedDates] = useState(false);
  const [tenantTimezone, setTenantTimezone] =
    useState<string>("America/New_York");

  const [reportDate, setReportDate] = useState(formatDate(today));
  const [foodSales, setFoodSales] = useState("0");
  const [liquorSales, setLiquorSales] = useState("0");
  const [bankDepositBatch, setBankDepositBatch] = useState("");
  const [notes, setNotes] = useState("");
  const [expenseCompanyName, setExpenseCompanyName] = useState("");
  const [expensePaymentMethod, setExpensePaymentMethod] =
    useState<ExpensePaymentMethod>("CHECK");
  const [expenseDate, setExpenseDate] = useState(todayDateKey);
  const [expenseAmount, setExpenseAmount] = useState("0");
  const [expenseInvoiceNumber, setExpenseInvoiceNumber] = useState("");
  const [expenseCheckNumber, setExpenseCheckNumber] = useState("");
  const [expensePayToCompany, setExpensePayToCompany] = useState("");
  const [expenseNotes, setExpenseNotes] = useState("");
  const [expenseReceiptFile, setExpenseReceiptFile] = useState<File | null>(
    null,
  );
  const [expenseReceiptPickerKey, setExpenseReceiptPickerKey] = useState(0);
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const [from, setFrom] = useState(formatDate(sevenDaysAgo));
  const [to, setTo] = useState(formatDate(today));
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [report, setReport] = useState<SalesReportResponse | null>(null);
  const t = useMemo(() => translations[lang] ?? translations.en, [lang]);
  const locationBreakdown = useMemo(
    () => buildSalesLocationBreakdown(report),
    [report],
  );
  const showLocationBreakdown = Boolean(
    report && !report.scope?.officeId && locationBreakdown.length > 0,
  );

  const computedTotals = useMemo(() => {
    const food = parseMoney(foodSales) ?? 0;
    const liquor = parseMoney(liquorSales) ?? 0;
    const totalSales = Number((food + liquor).toFixed(2));
    const totalPayments = 0;
    const balance = Number((totalSales - totalPayments).toFixed(2));

    return {
      totalSales,
      totalPayments,
      balance,
    };
  }, [foodSales, liquorSales]);

  const loadFeature = async () => {
    try {
      const response = await fetchSalesSettingsRequest();
      if (!response.ok) {
        setFeatureEnabled(false);
        setFeatureStatus(t.unableLoadTenantSettings);
        return;
      }

      const data = (await response.json()) as SettingsResponse;
      if (data.reportsEnabled === false) {
        setFeatureEnabled(false);
        setFeatureStatus(t.reportsDisabledMessage);
        return;
      }

      if (!data.dailySalesReportingEnabled) {
        setFeatureEnabled(false);
        setFeatureStatus(t.dailySalesDisabledMessage);
        return;
      }

      setTenantTimezone(data.timezone || "America/New_York");
      setFeatureEnabled(true);
      setFeatureStatus(null);
    } catch {
      setFeatureEnabled(false);
      setFeatureStatus(t.unableLoadTenantSettings);
    }
  };

  const loadAccess = async () => {
    try {
      const response = await fetchSalesAccessRequest();
      if (!response.ok) {
        setCanModifyLockedDates(false);
        return;
      }
      const data = (await response.json()) as AccessResponse;
      setCanModifyLockedDates(Boolean(data.isAdmin));
    } catch {
      setCanModifyLockedDates(false);
    }
  };

  const runReport = async () => {
    if (from > to) {
      setStatus(t.statusFromBeforeTo);
      setReport(null);
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const params = new URLSearchParams({ from, to });
      const response = await fetchSalesReportRequest(params);

      const data = (await response.json()) as SalesReportResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || t.statusUnableLoadSalesReports);
      }

      setReport(data);
    } catch (error) {
      setReport(null);
      setStatus(
        error instanceof Error ? error.message : t.statusUnableLoadSalesReports,
      );
    } finally {
      setLoading(false);
    }
  };

  const buildExpenseExportHref = (format: "excel" | "csv" | "pdf") =>
    `/api/reports/sales/expenses/export?${new URLSearchParams({
      format,
      from,
      to,
    }).toString()}`;

  const buildSalesEntriesExportHref = (format: "excel" | "csv" | "pdf") =>
    `/api/reports/sales/entries/export?${new URLSearchParams({
      format,
      from,
      to,
    }).toString()}`;

  const buildExpenseEntriesExportHref = (format: "excel" | "csv" | "pdf") =>
    `/api/reports/sales/expense-entries/export?${new URLSearchParams({
      format,
      from,
      to,
    }).toString()}`;

  useEffect(() => {
    const syncLang = () => {
      if (typeof window === "undefined") {
        return;
      }
      const stored = window.localStorage.getItem("clockin-lang");
      setLang(stored === "es" ? "es" : "en");
    };

    syncLang();
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "clockin-lang") {
        syncLang();
      }
    };
    const onLangChange = () => syncLang();
    window.addEventListener("storage", onStorage);
    window.addEventListener(
      "clockin-lang-change",
      onLangChange as EventListener,
    );

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        "clockin-lang-change",
        onLangChange as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    loadFeature();
    loadAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    if (!canModifyLockedDates) {
      setReportDate(formatDateInTimeZone(new Date(), tenantTimezone));
    }
  }, [canModifyLockedDates, tenantTimezone]);

  useEffect(() => {
    if (!featureEnabled) {
      return;
    }
    const timeout = window.setTimeout(() => {
      void runReport();
    }, 120);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featureEnabled, from, to]);

  useEffect(() => {
    if (expensePaymentMethod !== "CHECK") {
      setExpenseCheckNumber("");
      setExpensePayToCompany("");
    }
  }, [expensePaymentMethod]);

  useEffect(() => {
    if (!editingExpenseId) {
      setExpenseDate(todayDateKey);
    }
  }, [editingExpenseId, todayDateKey]);

  const resetExpenseForm = () => {
    setEditingExpenseId(null);
    setExpenseDate(todayDateKey);
    setExpenseCompanyName("");
    setExpenseAmount("0");
    setExpenseInvoiceNumber("");
    setExpenseCheckNumber("");
    setExpensePayToCompany("");
    setExpenseNotes("");
    setExpenseReceiptFile(null);
    setExpenseReceiptPickerKey((value) => value + 1);
    setExpensePaymentMethod("CHECK");
  };

  const startExpenseEdit = (row: DailyExpenseRow) => {
    setEditingExpenseId(row.id);
    setExpenseDate(row.date);
    setExpenseCompanyName(row.companyName);
    setExpensePaymentMethod(row.paymentMethod);
    setExpenseAmount(row.amount.toFixed(2));
    setExpenseInvoiceNumber(row.invoiceNumber);
    setExpenseCheckNumber(row.checkNumber || "");
    setExpensePayToCompany(row.payToCompany || "");
    setExpenseNotes(row.notes || "");
    setExpenseReceiptFile(null);
    setExpenseReceiptPickerKey((value) => value + 1);
    setStatus(null);
    if (typeof window !== "undefined") {
      window.location.hash = "expenses-section";
    }
  };

  const deleteExpense = async (row: DailyExpenseRow) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(t.confirmDeleteExpense)
    ) {
      return;
    }

    setStatus(null);
    setExpenseSaving(true);
    try {
      const response = await deleteSalesExpenseRequest(row.id);
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || t.statusUnableDeleteExpense);
      }

      if (editingExpenseId === row.id) {
        resetExpenseForm();
      }
      setStatus(t.statusExpenseDeleted);
      await runReport();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : t.statusUnableDeleteExpense,
      );
    } finally {
      setExpenseSaving(false);
    }
  };

  const saveDailyReport = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);

    const parsedFood = parseMoney(foodSales);
    const parsedLiquor = parseMoney(liquorSales);

    if (parsedFood === null || parsedLiquor === null) {
      setStatus(t.statusAmountsMustBeNonNegative);
      return;
    }

    setSaving(true);
    try {
      const response = await createSalesReportRequest({
        date: canModifyLockedDates
          ? reportDate
          : formatDateInTimeZone(new Date(), tenantTimezone),
        foodSales: parsedFood,
        liquorSales: parsedLiquor,
        cashPayments: 0,
        bankDepositBatch: bankDepositBatch.trim() || undefined,
        checkPayments: 0,
        creditCardPayments: 0,
        otherPayments: 0,
        notes: notes.trim() || undefined,
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || t.statusUnableSaveSalesReport);
      }

      setStatus(t.statusDailyReportSaved);
      await runReport();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : t.statusUnableSaveSalesReport,
      );
    } finally {
      setSaving(false);
    }
  };

  const saveExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    const isEditing = Boolean(editingExpenseId);

    const parsedAmount = parseMoney(expenseAmount);
    if (parsedAmount === null) {
      setStatus(t.statusExpenseAmountNonNegative);
      return;
    }

    if (!expenseCompanyName.trim()) {
      setStatus(t.statusCompanyRequired);
      return;
    }

    if (!expenseInvoiceNumber.trim()) {
      setStatus(t.statusInvoiceRequired);
      return;
    }

    if (expensePaymentMethod === "CHECK") {
      if (!expenseCheckNumber.trim()) {
        setStatus(t.statusCheckNumberRequired);
        return;
      }
      if (!expensePayToCompany.trim()) {
        setStatus(t.statusPayToRequired);
        return;
      }
    }

    if (expenseReceiptFile) {
      if (expenseReceiptFile.size > MAX_RECEIPT_SIZE_BYTES) {
        setStatus(t.statusReceiptTooLarge);
        return;
      }
      if (!ALLOWED_RECEIPT_TYPES.has(expenseReceiptFile.type)) {
        setStatus(t.statusReceiptTypeUnsupported);
        return;
      }
    }

    setExpenseSaving(true);
    try {
      const payload = {
        date: expenseDate,
        companyName: expenseCompanyName.trim(),
        paymentMethod: expensePaymentMethod,
        amount: parsedAmount,
        invoiceNumber: expenseInvoiceNumber.trim(),
        checkNumber:
          expensePaymentMethod === "CHECK"
            ? expenseCheckNumber.trim()
            : undefined,
        payToCompany:
          expensePaymentMethod === "CHECK"
            ? expensePayToCompany.trim()
            : undefined,
        notes: expenseNotes.trim() || undefined,
      };
      const response = isEditing
        ? await updateSalesExpenseRequest(editingExpenseId!, payload)
        : await createSalesExpenseRequest(payload);

      const data = (await response.json()) as {
        error?: string;
        expense?: DailyExpenseRow;
      };
      if (!response.ok) {
        throw new Error(data.error || t.statusUnableSaveExpense);
      }

      if (expenseReceiptFile) {
        if (!data.expense?.id) {
          throw new Error(t.statusUnableUploadReceipt);
        }

        const formData = new FormData();
        formData.append("file", expenseReceiptFile);

        const uploadResponse = await uploadSalesExpenseReceiptRequest(
          data.expense.id,
          formData,
        );

        const uploadData = (await uploadResponse.json()) as { error?: string };
        if (!uploadResponse.ok) {
          throw new Error(uploadData.error || t.statusUnableUploadReceipt);
        }
      }

      resetExpenseForm();
      setStatus(
        expenseReceiptFile
          ? isEditing
            ? t.statusExpenseAndReceiptUpdated
            : t.statusExpenseAndReceiptSaved
          : isEditing
            ? t.statusExpenseUpdated
            : t.statusExpenseSaved,
      );
      await runReport();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : t.statusUnableSaveExpense,
      );
    } finally {
      setExpenseSaving(false);
    }
  };

  if (featureEnabled === null) {
    return (
      <div className="reports-page">
        <div className="admin-header">
          <h1>{t.dailySalesReport}</h1>
        </div>
        <div className="admin-card">
          <p className="mb-0">{t.loadingFeatureSettings}</p>
        </div>
      </div>
    );
  }

  if (!featureEnabled) {
    return (
      <div className="reports-page">
        <div className="admin-header">
          <h1>{t.dailySalesReport}</h1>
        </div>
        <div className="admin-card">
          <div className="alert alert-warning mb-0">
            {featureStatus || t.dailySalesDisabledMessage}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-page sales-report-page">
      <div className="admin-header">
        <h1>{t.dailySalesReport}</h1>
      </div>

      {status && <div className="alert alert-info mb-0">{status}</div>}

      <section className="admin-card sales-card">
        <div className="sales-card-head">
          <h2>{t.dailySalesReport}</h2>
        </div>
        <p className="text-muted mb-3">{t.locationScopeHelp}</p>
        <form onSubmit={saveDailyReport} className="sales-daily-grid">
          <div className="sales-cell">
            <label className="form-label">{t.reportDate}</label>
            <input
              className="form-control"
              type="date"
              value={reportDate}
              onChange={(event) => setReportDate(event.target.value)}
              disabled={!canModifyLockedDates}
              required
            />
            <small className="text-muted">
              {canModifyLockedDates
                ? t.adminOverrideEnabled
                : t.lockedToTodayMessage}
            </small>
          </div>
          <div className="sales-cell">
            <label className="form-label">{t.foodSales}</label>
            <input
              className="form-control"
              type="text"
              inputMode="decimal"
              pattern="^[0-9]*([.][0-9]{0,2})?$"
              value={foodSales}
              onChange={(event) =>
                setFoodSales(sanitizeMoneyInput(event.target.value))
              }
            />
          </div>
          <div className="sales-cell">
            <label className="form-label">{t.liquorSales}</label>
            <input
              className="form-control"
              type="text"
              inputMode="decimal"
              pattern="^[0-9]*([.][0-9]{0,2})?$"
              value={liquorSales}
              onChange={(event) =>
                setLiquorSales(sanitizeMoneyInput(event.target.value))
              }
            />
          </div>
          <div className="sales-cell">
            <label className="form-label">{t.bankDepositBatch}</label>
            <input
              className="form-control"
              type="text"
              value={bankDepositBatch}
              onChange={(event) => setBankDepositBatch(event.target.value)}
              placeholder={t.bankDepositBatchPlaceholder}
              maxLength={80}
            />
          </div>
          <div className="sales-cell sales-cell--full">
            <label className="form-label">{t.notesOptional}</label>
            <textarea
              className="form-control"
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t.notesPlaceholder}
            />
          </div>
          <div className="sales-cell sales-cell--full sales-action-strip">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? t.saving : t.saveDailyReport}
            </button>
            <div className="sales-action-totals">
              {t.sales} {formatMoney(computedTotals.totalSales)} | {t.balance}{" "}
              {formatMoney(computedTotals.balance)}
            </div>
          </div>
        </form>
      </section>

      <div className="sales-middle-grid">
        <section id="expenses-section" className="admin-card sales-card">
          <div className="sales-card-head">
            <div>
              <h3>{t.expensesOfTheDay}</h3>
              {editingExpenseId ? (
                <p className="mb-0">{t.editingExpense}</p>
              ) : null}
            </div>
          </div>
          <form onSubmit={saveExpense} className="sales-expense-grid">
            <div className="sales-cell">
              <label className="form-label">{t.date}</label>
              <input
                className="form-control"
                type="date"
                value={expenseDate}
                onChange={(event) => setExpenseDate(event.target.value)}
                required
              />
              <small className="text-muted">{t.expenseDateHelpText}</small>
            </div>
            <div className="sales-cell">
              <label className="form-label">{t.invoiceNumber}</label>
              <input
                className="form-control"
                type="text"
                value={expenseInvoiceNumber}
                onChange={(event) =>
                  setExpenseInvoiceNumber(event.target.value)
                }
                placeholder={t.invoiceNumberPlaceholder}
                required
              />
            </div>
            <div className="sales-cell">
              <label className="form-label">{t.companyName}</label>
              <input
                className="form-control"
                type="text"
                value={expenseCompanyName}
                onChange={(event) => setExpenseCompanyName(event.target.value)}
                placeholder={t.companyNamePlaceholder}
                required
              />
            </div>
            <div className="sales-cell">
              <label className="form-label">
                {expenseAmountLabel(expensePaymentMethod, t)}
              </label>
              <input
                className="form-control"
                type="text"
                inputMode="decimal"
                pattern="^[0-9]*([.][0-9]{0,2})?$"
                value={expenseAmount}
                onChange={(event) =>
                  setExpenseAmount(sanitizeMoneyInput(event.target.value))
                }
                required
              />
            </div>
            <div className="sales-cell sales-cell--full">
              <label className="form-label d-block mb-2">
                {t.checkQuestion}
              </label>
              <div className="sales-radio-row">
                <label className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="expense-check-toggle"
                    checked={expensePaymentMethod === "CHECK"}
                    onChange={() => setExpensePaymentMethod("CHECK")}
                  />
                  <span className="form-check-label">{t.yes}</span>
                </label>
                <label className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="expense-check-toggle"
                    checked={expensePaymentMethod !== "CHECK"}
                    onChange={() =>
                      setExpensePaymentMethod((current) =>
                        current === "CHECK" ? "DEBIT_CARD" : current,
                      )
                    }
                  />
                  <span className="form-check-label">{t.no}</span>
                </label>
              </div>
            </div>
            {expensePaymentMethod !== "CHECK" && (
              <div className="sales-cell sales-cell--full">
                <label className="form-label d-block mb-2">
                  {t.nonCheckQuestion}
                </label>
                <div className="sales-radio-row">
                  <label className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="expense-non-check-method"
                      checked={expensePaymentMethod === "DEBIT_CARD"}
                      onChange={() => setExpensePaymentMethod("DEBIT_CARD")}
                    />
                    <span className="form-check-label">{t.debitCard}</span>
                  </label>
                  <label className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="expense-non-check-method"
                      checked={expensePaymentMethod === "CASH"}
                      onChange={() => setExpensePaymentMethod("CASH")}
                    />
                    <span className="form-check-label">{t.cash}</span>
                  </label>
                </div>
              </div>
            )}
            {expensePaymentMethod === "CHECK" && (
              <>
                <div className="sales-cell">
                  <label className="form-label">{t.checkNumber}</label>
                  <input
                    className="form-control"
                    type="text"
                    value={expenseCheckNumber}
                    onChange={(event) =>
                      setExpenseCheckNumber(event.target.value)
                    }
                    placeholder={t.checkNumberPlaceholder}
                    required
                  />
                </div>
                <div className="sales-cell">
                  <label className="form-label">{t.companyCheckGoingTo}</label>
                  <input
                    className="form-control"
                    type="text"
                    value={expensePayToCompany}
                    onChange={(event) =>
                      setExpensePayToCompany(event.target.value)
                    }
                    placeholder={t.companyReceivingPaymentPlaceholder}
                    required
                  />
                </div>
              </>
            )}
            <div className="sales-cell sales-cell--full">
              <label className="form-label">{t.receiptFileOptional}</label>
              <input
                key={expenseReceiptPickerKey}
                className="form-control"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setExpenseReceiptFile(file);
                }}
              />
              <small className="text-muted">{t.receiptHelpText}</small>
            </div>
            <div className="sales-cell sales-cell--full">
              <label className="form-label">{t.expenseNotesOptional}</label>
              <div className="sales-note-action">
                <input
                  className="form-control"
                  type="text"
                  value={expenseNotes}
                  onChange={(event) => setExpenseNotes(event.target.value)}
                  placeholder={t.expenseNotesPlaceholder}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={expenseSaving}
                >
                  {expenseSaving
                    ? t.saving
                    : editingExpenseId
                      ? t.updateExpense
                      : t.saveExpense}
                </button>
                {editingExpenseId ? (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={resetExpenseForm}
                    disabled={expenseSaving}
                  >
                    {t.cancelEdit}
                  </button>
                ) : null}
              </div>
            </div>
            <div className="sales-cell sales-cell--full">
              <div className="sales-expense-export">
                <h4>{t.exportExpenses}</h4>
                <div className="sales-expense-export-controls">
                  <div className="sales-cell">
                    <label className="form-label">{t.from}</label>
                    <input
                      className="form-control"
                      type="date"
                      value={from}
                      readOnly
                    />
                  </div>
                  <div className="sales-cell">
                    <label className="form-label">{t.to}</label>
                    <input
                      className="form-control"
                      type="date"
                      value={to}
                      readOnly
                    />
                  </div>
                </div>
                <div className="sales-export-actions">
                  <a
                    className="btn btn-outline-secondary"
                    href={buildExpenseExportHref("excel")}
                  >
                    {t.exportExpensesExcel}
                  </a>
                  <a
                    className="btn btn-outline-secondary"
                    href={buildExpenseExportHref("csv")}
                  >
                    {t.exportExpensesCsv}
                  </a>
                  <a
                    className="btn btn-outline-secondary"
                    href={buildExpenseExportHref("pdf")}
                  >
                    {t.exportExpensesPdf}
                  </a>
                </div>
              </div>
            </div>
          </form>
        </section>

        <div className="sales-right-stack">
          <section className="admin-card sales-card">
            <div className="sales-card-head">
              <h3>{t.reportRange}</h3>
              <p>
                {t.from} {formatDateForDisplay(from)} {t.to}{" "}
                {formatDateForDisplay(to)}
              </p>
            </div>
            <div className="sales-range-grid">
              <div className="sales-cell">
                <label className="form-label">{t.from}</label>
                <input
                  className="form-control"
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                />
              </div>
              <div className="sales-cell">
                <label className="form-label">{t.to}</label>
                <input
                  className="form-control"
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                />
              </div>
              <div className="sales-cell">
                <label className="form-label">{t.locationScope}</label>
                <input
                  className="form-control"
                  type="text"
                  value={report?.scope?.label || t.allLocations}
                  readOnly
                />
              </div>
              <div className="sales-cell sales-cell--full">
                <div className="sales-range-actions">
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={runReport}
                    disabled={loading}
                  >
                    {loading ? t.loading : t.refresh}
                  </button>
                  <div className="sales-export-actions">
                    <a
                      className="btn btn-outline-secondary"
                      href={`/api/reports/sales/export?${new URLSearchParams({
                        from,
                        to,
                        format: "excel",
                      }).toString()}`}
                    >
                      {t.exportExcel}
                    </a>
                    <a
                      className="btn btn-outline-secondary"
                      href={`/api/reports/sales/export?${new URLSearchParams({
                        from,
                        to,
                        format: "csv",
                      }).toString()}`}
                    >
                      {t.exportCsv}
                    </a>
                    <a
                      className="btn btn-outline-secondary"
                      href={`/api/reports/sales/export?${new URLSearchParams({
                        from,
                        to,
                        format: "pdf",
                      }).toString()}`}
                    >
                      {t.exportPdf}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {report && (
            <>
              <section className="admin-card sales-card">
                <div className="sales-metric-grid">
                  <article className="sales-metric">
                    <div className="sales-metric-value">
                      {formatMoney(report.totals.totalSales)}
                    </div>
                    <div className="sales-metric-label">{t.totalSales}</div>
                  </article>
                  <article className="sales-metric">
                    <div className="sales-metric-value">
                      {formatMoney(report.totals.totalPayments)}
                    </div>
                    <div className="sales-metric-label">{t.payments}</div>
                  </article>
                  <article className="sales-metric sales-metric--teal">
                    <div className="sales-metric-value">
                      {formatMoney(report.expenseTotals.debitCardExpenses)}
                    </div>
                    <div className="sales-metric-label">{t.debitExpenses}</div>
                  </article>
                  <article className="sales-metric sales-metric--blue">
                    <div className="sales-metric-value">
                      {formatMoney(report.expenseTotals.checkExpenses)}
                    </div>
                    <div className="sales-metric-label">{t.checkExpenses}</div>
                  </article>
                </div>
              </section>

              <section className="admin-card sales-card sales-note-card">
                {report.reports.length === 0 && report.expenses.length === 0
                  ? t.noSalesOrExpensesInRange
                  : t.dailySalesAndExpensesInRange(
                      report.reports.length,
                      report.expenses.length,
                    )}
              </section>
            </>
          )}
        </div>
      </div>

      {report && (
        <>
          {showLocationBreakdown ? (
            <SalesLocationBreakdownTable
              title={t.locationBreakdown}
              description={t.locationBreakdownHelp}
              summaryLabel={t.locationsWithActivity(locationBreakdown.length)}
              rows={locationBreakdown}
              locationLabel={t.location}
              salesReportsLabel={t.salesReportsCount}
              expenseEntriesLabel={t.expenseEntriesCount}
              totalSalesLabel={t.totalSales}
              paymentsLabel={t.payments}
              balanceLabel={t.balance}
              totalExpensesLabel={t.totalExpenses}
              formatOfficeName={(officeName) =>
                officeName || t.unassignedLocation
              }
              formatMoney={formatMoney}
            />
          ) : null}

          <section className="admin-card sales-card">
            <div className="sales-card-head">
              <h3>{t.dailySalesEntries}</h3>
              <div className="sales-export-actions">
                <a
                  className="btn btn-outline-secondary"
                  href={buildSalesEntriesExportHref("excel")}
                >
                  {t.exportExcel}
                </a>
                <a
                  className="btn btn-outline-secondary"
                  href={buildSalesEntriesExportHref("csv")}
                >
                  {t.exportCsv}
                </a>
                <a
                  className="btn btn-outline-secondary"
                  href={buildSalesEntriesExportHref("pdf")}
                >
                  {t.exportPdf}
                </a>
              </div>
            </div>
            <div className="table-responsive sales-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>{t.date}</th>
                    <th>{t.location}</th>
                    <th>{t.foodSales}</th>
                    <th>{t.liquorSales}</th>
                    <th>{t.totalSales}</th>
                    <th>{t.bankDepositBatch}</th>
                    <th>{t.payments}</th>
                    <th>{t.balance}</th>
                    <th>{t.submittedBy}</th>
                    <th>{t.notesOptional}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.reports.length === 0 ? (
                    <tr>
                      <td colSpan={10}>{t.noDailySalesReportsFound}</td>
                    </tr>
                  ) : (
                    report.reports.map((row) => (
                      <tr key={row.id}>
                        <td>{formatDateForDisplay(row.date)}</td>
                        <td>{row.officeName || t.unassignedLocation}</td>
                        <td>{formatMoney(row.foodSales)}</td>
                        <td>{formatMoney(row.liquorSales)}</td>
                        <td>{formatMoney(row.totalSales)}</td>
                        <td>{row.bankDepositBatch || "-"}</td>
                        <td>{formatMoney(row.totalPayments)}</td>
                        <td>{formatMoney(row.balance)}</td>
                        <td>{row.submittedBy || "-"}</td>
                        <td>{row.notes || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <DailyExpenseEntriesTable
            title={t.dailyExpenseEntries}
            exportExcelLabel={t.exportExcel}
            exportCsvLabel={t.exportCsv}
            exportPdfLabel={t.exportPdf}
            excelHref={buildExpenseEntriesExportHref("excel")}
            csvHref={buildExpenseEntriesExportHref("csv")}
            pdfHref={buildExpenseEntriesExportHref("pdf")}
            expenses={report.expenses}
            dateLabel={t.date}
            locationLabel={t.location}
            companyNameLabel={t.companyName}
            methodLabel={t.method}
            amountLabel={t.amount}
            invoiceNumberLabel={t.invoiceNumber}
            checkNumberLabel={t.checkNumber}
            payToCompanyLabel={t.companyCheckGoingTo}
            submittedByLabel={t.submittedBy}
            receiptLabel={t.receipt}
            notesLabel={t.notesOptional}
            actionsLabel={t.actions}
            noDataLabel={t.noDailyExpensesFound}
            viewLabel={t.view}
            editLabel={t.edit}
            deleteLabel={t.delete}
            expenseSaving={expenseSaving}
            formatDateForDisplay={formatDateForDisplay}
            formatOfficeName={(officeName) =>
              officeName || t.unassignedLocation
            }
            formatMoney={formatMoney}
            paymentMethodLabel={(method) => paymentMethodLabel(method, t)}
            onEdit={startExpenseEdit}
            onDelete={(row) => void deleteExpense(row)}
          />
        </>
      )}
    </div>
  );
}
