import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as ImagePicker from "expo-image-picker";
import Constants from "expo-constants";

const normalizeApiBase = (value: string) => value.trim().replace(/\/$/, "");
const DEFAULT_API_BASE = "https://api.websysclockin.com/api";
const ADMIN_TENANT_STORAGE_KEY = "clockin.mobile-admin.tenant";

const isLoopbackHost = (host: string) =>
  host === "localhost" ||
  host === "0.0.0.0" ||
  host === "::1" ||
  host.startsWith("127.");

const parseHostCandidate = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    if (/^[a-z]+:\/\//i.test(trimmed)) {
      return new URL(trimmed).hostname || null;
    }
    return new URL(`http://${trimmed}`).hostname || null;
  } catch {
    return null;
  }
};

const pickMetroHosts = () => {
  const runtimeConfig = Constants as unknown as {
    expoGoConfig?: { debuggerHost?: string | null };
    manifest2?: { extra?: { expoClient?: { hostUri?: string | null } } };
  };

  const hosts = [
    parseHostCandidate(Constants.expoConfig?.hostUri ?? null),
    parseHostCandidate(runtimeConfig.expoGoConfig?.debuggerHost ?? null),
    parseHostCandidate(
      runtimeConfig.manifest2?.extra?.expoClient?.hostUri ?? null,
    ),
    parseHostCandidate(Constants.linkingUri ?? null),
  ];

  return Array.from(
    new Set(hosts.filter((host): host is string => Boolean(host))),
  );
};

const apiBaseCandidates = (() => {
  const values: string[] = [];
  const runningOnSimulator = !Device.isDevice;
  const runningInExpoGo = Constants.appOwnership === "expo";
  const preferLocalBase = __DEV__ || runningInExpoGo;

  const metroHosts = pickMetroHosts();
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  const pushCandidate = (candidate?: string | null) => {
    if (!candidate || !candidate.trim()) {
      return;
    }
    values.push(candidate);
  };

  if (fromEnv) {
    const fromEnvHost = parseHostCandidate(fromEnv);
    if (runningOnSimulator || !fromEnvHost || !isLoopbackHost(fromEnvHost)) {
      if (!preferLocalBase) {
        pushCandidate(fromEnv);
      }
    }
  }

  if (preferLocalBase) {
    metroHosts.forEach((host) => {
      if (!runningOnSimulator && isLoopbackHost(host)) {
        return;
      }
      pushCandidate(`http://${host}:4000/api`);
    });

    if (runningOnSimulator) {
      pushCandidate("http://localhost:4000/api");
      pushCandidate("http://127.0.0.1:4000/api");
    }

    if (fromEnv) {
      const fromEnvHost = parseHostCandidate(fromEnv);
      if (runningOnSimulator || !fromEnvHost || !isLoopbackHost(fromEnvHost)) {
        pushCandidate(fromEnv);
      }
    }
  } else {
    pushCandidate(DEFAULT_API_BASE);

    metroHosts.forEach((host) => {
      if (!runningOnSimulator && isLoopbackHost(host)) {
        return;
      }
      pushCandidate(`http://${host}:4000/api`);
    });

    if (runningOnSimulator) {
      pushCandidate("http://localhost:4000/api");
      pushCandidate("http://127.0.0.1:4000/api");
    }
  }

  return Array.from(new Set(values.map(normalizeApiBase).filter(Boolean)));
})();

const bytesToBase64 = (bytes: Uint8Array) => {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index] ?? 0;
    const b = bytes[index + 1] ?? 0;
    const c = bytes[index + 2] ?? 0;
    const combined = (a << 16) | (b << 8) | c;

    output += alphabet[(combined >> 18) & 63];
    output += alphabet[(combined >> 12) & 63];
    output += index + 1 < bytes.length ? alphabet[(combined >> 6) & 63] : "=";
    output += index + 2 < bytes.length ? alphabet[combined & 63] : "=";
  }

  return output;
};

const extractPendingTipsWorkDate = (message: string) => {
  const match = /pending tips required for work date (\d{4}-\d{2}-\d{2})/i.exec(
    message,
  );
  return match?.[1] || null;
};

const DEFAULT_TENANT = process.env.EXPO_PUBLIC_TENANT_SLUG || "dev-tenant";
const BRAND_LOGO = require("./assets/websys-logo.png");

type Screen =
  | "dashboard"
  | "users"
  | "offices"
  | "groups"
  | "capture"
  | "reports"
  | "alerts"
  | "schedules"
  | "companyOrders";

type Summary = {
  total: number;
  admins: number;
  timeAdmins: number;
  reports: number;
};

type Employee = {
  id: string;
  name: string;
  email?: string;
  active: boolean;
  officeId?: string | null;
  groupId?: string | null;
  isManager?: boolean;
  isOwnerManager?: boolean;
  managerPermissions?: string[];
  isAdmin?: boolean;
  isTimeAdmin?: boolean;
  isReports?: boolean;
  isServer?: boolean;
  isKitchenManager?: boolean;
};

type Office = {
  id: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  geofenceRadiusMeters?: number | null;
};

type Group = { id: string; name: string; officeId?: string | null };

type AccessPermissions = {
  dashboard: boolean;
  users: boolean;
  locations: boolean;
  manageMultiLocation: boolean;
  groups: boolean;
  statuses: boolean;
  schedules: boolean;
  companyOrders: boolean;
  reports: boolean;
  tips: boolean;
  salesCapture: boolean;
  notifications: boolean;
  settings: boolean;
  timeEdits: boolean;
};

type NotificationRow = {
  id: string;
  message: string;
  createdAt: string;
  readAt?: string | null;
  employeeName?: string | null;
  type: string;
  metadata?: Record<string, unknown> | null;
};

type ExpensePaymentMethod = "CHECK" | "DEBIT_CARD" | "CASH";
type ReceiptAttachment = {
  uri: string;
  mimeType: string;
  fileName: string;
};

type ReportType = "daily" | "hours" | "payroll" | "audit" | "tips";
const reportTypeOrder: ReportType[] = [
  "daily",
  "hours",
  "payroll",
  "audit",
  "tips",
];

type Lang = "en" | "es";
type CaptureMode = "sales" | "expense";

const tabs: Screen[] = [
  "dashboard",
  "users",
  "offices",
  "groups",
  "schedules",
  "companyOrders",
  "capture",
  "reports",
  "alerts",
];

const tabLabels: Record<Lang, Record<Screen, string>> = {
  en: {
    dashboard: "Dashboard",
    users: "Users",
    offices: "Locations",
    groups: "Groups",
    schedules: "Schedules",
    companyOrders: "Company Orders",
    capture: "Daily Input",
    reports: "Reports",
    alerts: "Alerts",
  },
  es: {
    dashboard: "Tablero",
    users: "Usuarios",
    offices: "Ubicaciones",
    groups: "Grupos",
    schedules: "Horarios",
    companyOrders: "Ordenes Empresa",
    capture: "Carga Diaria",
    reports: "Reportes",
    alerts: "Alertas",
  },
};

const copy: Record<
  Lang,
  {
    subtitle: string;
    language: string;
    dark: string;
    light: string;
    logout: string;
    switchLocation: string;
    tenant: string;
    activeLocation: string;
    allLocations: string;
    noLocationAssigned: string;
    loginTitle: string;
    username: string;
    password: string;
    signIn: string;
    signingIn: string;
    pushHelp: string;
    tenantPlaceholder: string;
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
  }
> = {
  en: {
    subtitle: "Native admin console",
    language: "Language",
    dark: "Dark",
    light: "Light",
    logout: "Logout",
    switchLocation: "Switch Location",
    tenant: "Tenant",
    activeLocation: "Location",
    allLocations: "All Locations",
    noLocationAssigned: "No location assigned",
    loginTitle: "Administrator Access",
    username: "Username",
    password: "Password",
    signIn: "Sign In",
    signingIn: "Signing In...",
    pushHelp: "Push alerts are enabled once you sign in.",
    tenantPlaceholder: "tenant name",
    captureTitle: "Daily Data Capture",
    captureSubtitle: "Submit daily sales and daily expense entries.",
    salesToggle: "Daily Sales",
    expenseToggle: "Daily Expense",
    salesTitle: "Daily Sales Entry",
    expenseTitle: "Daily Expense Entry",
    salesDate: "Report Date (MM/DD/YYYY)",
    foodSales: "Food Sales",
    liquorSales: "Liquor Sales",
    cashPayments: "Cash Payments",
    bankBatch: "Bank Deposit Batch",
    notesOptional: "Notes (optional)",
    saveDailySales: "Save Daily Sales",
    saveDailyExpense: "Save Daily Expense",
    saving: "Saving...",
    expenseDate: "Expense Date (MM/DD/YYYY)",
    invoiceNumber: "Invoice Number",
    companyName: "Company Name",
    paymentMethod: "Payment Method",
    checkTotal: "Check Total",
    debitTotal: "Debit Card Total",
    cashTotal: "Cash Total",
    checkNumber: "Check Number",
    payToCompany: "Company Check Is Going To",
    receiptPhoto: "Receipt Photo (optional)",
    openingCamera: "Opening camera...",
    retakePhoto: "Retake Receipt Photo",
    takePhoto: "Take Receipt Photo",
    removePhoto: "Remove Photo",
    attached: "Attached:",
    noPhoto: "No receipt photo attached.",
  },
  es: {
    subtitle: "Consola administrativa",
    language: "Idioma",
    dark: "Oscuro",
    light: "Claro",
    logout: "Salir",
    switchLocation: "Cambiar Ubicacion",
    tenant: "Inquilino",
    activeLocation: "Ubicacion",
    allLocations: "Todas las ubicaciones",
    noLocationAssigned: "Sin ubicacion asignada",
    loginTitle: "Acceso de Administrador",
    username: "Usuario",
    password: "Contraseña",
    signIn: "Ingresar",
    signingIn: "Ingresando...",
    pushHelp: "Las alertas push se activan al iniciar sesión.",
    tenantPlaceholder: "tenant name",
    captureTitle: "Captura Diaria de Datos",
    captureSubtitle: "Registra las ventas y gastos diarios.",
    salesToggle: "Ventas Diarias",
    expenseToggle: "Gasto Diario",
    salesTitle: "Registro de Ventas Diarias",
    expenseTitle: "Registro de Gasto Diario",
    salesDate: "Fecha de reporte (MM/DD/YYYY)",
    foodSales: "Ventas de Comida",
    liquorSales: "Ventas de Licor",
    cashPayments: "Pagos en Efectivo",
    bankBatch: "Lote de Depósito Bancario",
    notesOptional: "Notas (opcional)",
    saveDailySales: "Guardar Ventas Diarias",
    saveDailyExpense: "Guardar Gasto Diario",
    saving: "Guardando...",
    expenseDate: "Fecha del gasto (MM/DD/YYYY)",
    invoiceNumber: "Número de Factura",
    companyName: "Nombre de la Empresa",
    paymentMethod: "Método de Pago",
    checkTotal: "Total en Cheque",
    debitTotal: "Total Tarjeta Débito",
    cashTotal: "Total en Efectivo",
    checkNumber: "Número de Cheque",
    payToCompany: "Empresa a la que va el cheque",
    receiptPhoto: "Foto de recibo (opcional)",
    openingCamera: "Abriendo cámara...",
    retakePhoto: "Tomar Foto de Nuevo",
    takePhoto: "Tomar Foto de Recibo",
    removePhoto: "Quitar Foto",
    attached: "Adjunto:",
    noPhoto: "No hay foto de recibo adjunta.",
  },
};

type ThemeMode = "dark" | "light";
type Meridiem = "AM" | "PM";
type ScheduleTimeKey = "startTime" | "endTime";

type ScheduleDay = {
  weekday: number;
  label: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
};

type TodayScheduleRow = {
  employeeId: string;
  employeeName: string;
  startTime: string;
  endTime: string;
  isServer: boolean;
  officeName: string | null;
  groupName: string | null;
  roleLabel: string;
};

type TodayScheduleResponse = {
  date: string;
  weekday: number;
  weekdayLabel: string;
  timezone: string;
  rows: TodayScheduleRow[];
};

type CompanyOrderCatalogItem = {
  nameEs: string;
  nameEn: string;
};

type CompanyOrderCatalogSupplier = {
  supplierName: string;
  items: CompanyOrderCatalogItem[];
};

type CompanyOrderItem = {
  id: string;
  nameEs: string;
  nameEn: string;
  quantity: number;
};

type CompanyOrderRow = {
  id: string;
  supplierName: string;
  orderDate: string;
  weekStartDate?: string;
  weekEndDate?: string;
  orderLabel?: string;
  contributors?: string[];
  notes: string;
  officeName: string | null;
  createdBy: string | null;
  totalQuantity: number;
  itemCount: number;
  items: CompanyOrderItem[];
};

type LiquorCatalogItem = {
  id: string;
  name: string;
  brand: string | null;
  supplierName: string | null;
  sizeMl: number | null;
  unitCost: number;
  isActive: boolean;
};

type LiquorCountRow = {
  id: string;
  itemId: string;
  countDate: string;
  quantity: number;
  barQuantity: number | null;
  bodegaQuantity: number | null;
};

type LiquorBottleScanRow = {
  id: string;
  itemId: string;
  itemName: string;
  containerKey: string | null;
  fillPercent: number;
  estimatedMl: number | null;
  measuredAt: string;
  createdAt: string;
};

type LiquorSheetDraft = {
  supplierName: string;
  unitCost: string;
  sizeMl: string;
  barQuantity: string;
  bodegaQuantity: string;
};

type LiquorInvoiceExtractedRow = {
  rowNumber: number;
  company: string | null;
  liquorName: string;
  kind: string | null;
  upc: string | null;
  ml: number | null;
  unitCost: number | null;
  quantity: number | null;
  matchedItemId: string | null;
  matchedItemName: string | null;
  suggestedAction: "update" | "create";
  costShockDeltaPct: number | null;
  costShockSeverity: "normal" | "elevated" | "critical";
  costShockFlag: boolean;
};

type LiquorInvoiceAnalyzeResponse = {
  analysis?: {
    summary?: string;
    totalExtractedRows?: number;
    matchedCount?: number;
    costShockCount?: number;
  };
  rows?: Array<Record<string, unknown>>;
};

type EditUserForm = {
  fullName: string;
  displayName: string;
  email: string;
  pin: string;
  hourlyRate: string;
  officeId: string;
  groupId: string;
  isManager: boolean;
  isOwnerManager: boolean;
  isAdmin: boolean;
  isTimeAdmin: boolean;
  isReports: boolean;
  isServer: boolean;
  isKitchenManager: boolean;
  disabled: boolean;
};

const weekDays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const defaultScheduleDays = () =>
  weekDays.map((label, weekday) => ({
    weekday,
    label,
    enabled: false,
    startTime: "09:00",
    endTime: "17:00",
  }));

const emptyEditUserForm = (): EditUserForm => ({
  fullName: "",
  displayName: "",
  email: "",
  pin: "",
  hourlyRate: "",
  officeId: "",
  groupId: "",
  isManager: false,
  isOwnerManager: false,
  isAdmin: false,
  isTimeAdmin: false,
  isReports: false,
  isServer: false,
  isKitchenManager: false,
  disabled: false,
});

const defaultAccessPermissions = (): AccessPermissions => ({
  dashboard: true,
  users: true,
  locations: true,
  manageMultiLocation: false,
  groups: true,
  statuses: true,
  schedules: true,
  companyOrders: true,
  reports: true,
  tips: true,
  salesCapture: true,
  notifications: true,
  settings: true,
  timeEdits: true,
});

const permissionsFromFeaturePermissions = (
  featurePermissions?: unknown,
): AccessPermissions | null => {
  if (!Array.isArray(featurePermissions)) {
    return null;
  }
  const normalized = new Set<string>(
    featurePermissions
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean),
  );
  const base = defaultAccessPermissions();
  (Object.keys(base) as (keyof AccessPermissions)[]).forEach((key) => {
    base[key] = normalized.has(key);
  });
  if (normalized.size > 0 && !base.dashboard) {
    base.dashboard = true;
  }
  return base;
};

const normalizeTime = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (!match) return trimmed;
  let hours = Number(match[1]);
  const minutes = match[2];
  const meridiem = match[3].toLowerCase();
  if (Number.isNaN(hours)) return trimmed;
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${minutes}`;
};

const sanitizeTime = (value: string) => {
  const normalized = normalizeTime(value);
  return /^\d{2}:\d{2}$/.test(normalized) ? normalized : "";
};

const parseScheduleTimeParts = (value: string) => {
  const fallback = "09:00";
  const normalized = sanitizeTime(value || "") || fallback;
  const [rawHours, rawMinutes] = normalized.split(":");
  const safeHours = Number(rawHours);
  const safeMinutes = Number(rawMinutes);
  const hours24 = Number.isFinite(safeHours) ? safeHours : 9;
  const minutes = Number.isFinite(safeMinutes) ? safeMinutes : 0;
  const meridiem: Meridiem = hours24 >= 12 ? "PM" : "AM";
  const hour12 = ((hours24 + 11) % 12) + 1;
  return {
    hour: hour12,
    minute: minutes,
    meridiem,
  };
};

const toTwentyFourHourTime = (parts: {
  hour: number;
  minute: number;
  meridiem: Meridiem;
}) => {
  const safeHour = Math.min(12, Math.max(1, Math.trunc(parts.hour)));
  const safeMinute = Math.min(59, Math.max(0, Math.trunc(parts.minute)));
  const hourBase = safeHour % 12;
  const hours24 = parts.meridiem === "PM" ? hourBase + 12 : hourBase;
  return `${String(hours24).padStart(2, "0")}:${String(safeMinute).padStart(2, "0")}`;
};

const formatScheduleTimeLabel = (value: string) => {
  const parts = parseScheduleTimeParts(value);
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")} ${parts.meridiem}`;
};

const padDatePart = (value: number) => `${value}`.padStart(2, "0");

const formatUsDate = (value: Date) =>
  `${padDatePart(value.getMonth() + 1)}/${padDatePart(
    value.getDate(),
  )}/${value.getFullYear()}`;

const parseDateInputToIso = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  let year = 0;
  let month = 0;
  let day = 0;

  const usMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (usMatch) {
    month = Number(usMatch[1]);
    day = Number(usMatch[2]);
    year = Number(usMatch[3]);
  } else {
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (!isoMatch) return null;
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  }

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return `${year}-${padDatePart(month)}-${padDatePart(day)}`;
};

const formatDisplayDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return value;
  return `${match[2]}/${match[3]}/${match[1]}`;
};

const getCurrentWeekStartDateKey = () => {
  const now = new Date();
  const utcDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const day = utcDate.getUTCDay();
  const distanceToMonday = (day + 6) % 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - distanceToMonday);
  return utcDate.toISOString().slice(0, 10);
};
const todayDateKey = () => new Date().toISOString().slice(0, 10);

const formatScheduleShiftLabel = (startTime: string, endTime: string) => {
  if (startTime && endTime) {
    return `${formatScheduleTimeLabel(startTime)} - ${formatScheduleTimeLabel(endTime)}`;
  }
  if (startTime) {
    return `Starts ${formatScheduleTimeLabel(startTime)}`;
  }
  if (endTime) {
    return `Ends ${formatScheduleTimeLabel(endTime)}`;
  }
  return "Any time";
};

const parseMoneyInput = (value: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Number(parsed.toFixed(2));
};

const companyOrderItemKey = (nameEs: string, nameEn: string) =>
  `${nameEs.trim().toLowerCase()}|${nameEn.trim().toLowerCase()}`;

const normalizeCompanyOrderQuantityInput = (value: string) => {
  const trimmed = value.replace(/,/g, ".").replace(/[^\d.]/g, "");
  if (!trimmed) {
    return "";
  }
  const parts = trimmed.split(".");
  const integerPart = parts[0] || "0";
  const decimalPart = parts.slice(1).join("").slice(0, 2);
  return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
};

const parseOptionalCoordinate = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return Number.NaN;
  return parsed;
};

const parseOptionalRadius = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return Number.NaN;
  return Math.round(parsed);
};

const formatMoney = (value: number) => `$${Number(value || 0).toFixed(2)}`;

const expensePaymentMethodLabel = (value: ExpensePaymentMethod) => {
  if (value === "CHECK") return "Check";
  if (value === "DEBIT_CARD") return "Debit Card";
  return "Cash";
};

const parseScheduleOverrideNotification = (notice: NotificationRow) => {
  if (notice.type !== "SCHEDULE_OVERRIDE_REQUEST") {
    return null;
  }
  if (
    !notice.metadata ||
    typeof notice.metadata !== "object" ||
    Array.isArray(notice.metadata)
  ) {
    return null;
  }
  const requestId = notice.metadata.scheduleOverrideRequestId;
  if (typeof requestId !== "string" || !requestId.trim()) {
    return null;
  }
  const status = notice.metadata.status;
  const reasonMessage = notice.metadata.reasonMessage;
  const workDate = notice.metadata.workDate;
  const attemptedAt = notice.metadata.attemptedAt;
  const metadataEmployeeName = notice.metadata.employeeName;
  return {
    requestId,
    status: typeof status === "string" ? status.toUpperCase() : "PENDING",
    reasonMessage: typeof reasonMessage === "string" ? reasonMessage : "",
    workDate: typeof workDate === "string" ? workDate : "",
    attemptedAt: typeof attemptedAt === "string" ? attemptedAt : "",
    employeeName:
      typeof metadataEmployeeName === "string"
        ? metadataEmployeeName
        : notice.employeeName || "",
  };
};

const formatApiBaseLabel = (value: string) => {
  if (!value) {
    return "n/a";
  }
  try {
    const parsed = new URL(value);
    return `${parsed.host}${parsed.pathname}`.replace(/\/$/, "");
  } catch {
    return value;
  }
};

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [tenantInput, setTenantInput] = useState("");
  const [activeTenant, setActiveTenant] = useState("");
  const [activeTenantLabel, setActiveTenantLabel] = useState("");
  const [activeAdminUsername, setActiveAdminUsername] = useState("");
  const [language, setLanguage] = useState<Lang>("en");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginStatus, setLoginStatus] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [permissions, setPermissions] = useState<AccessPermissions>(
    defaultAccessPermissions(),
  );
  const [multiLocationEnabled, setMultiLocationEnabled] = useState(false);
  const [activeLocationId, setActiveLocationId] = useState("");

  const [summary, setSummary] = useState<Summary>({
    total: 0,
    admins: 0,
    timeAdmins: 0,
    reports: 0,
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [alertsStatus, setAlertsStatus] = useState<string | null>(null);
  const [employeeMessageEmployeeId, setEmployeeMessageEmployeeId] =
    useState("");
  const [employeeMessageSubject, setEmployeeMessageSubject] = useState("");
  const [employeeMessageBody, setEmployeeMessageBody] = useState("");
  const [employeeMessageSending, setEmployeeMessageSending] = useState(false);
  const [employeeMessageStatus, setEmployeeMessageStatus] = useState<
    string | null
  >(null);
  const [scheduleOverrideLoadingId, setScheduleOverrideLoadingId] = useState<
    string | null
  >(null);
  const [sessionManagerEmployeeId, setSessionManagerEmployeeId] = useState<
    string | null
  >(null);
  const [managerClockExempt, setManagerClockExempt] = useState(false);
  const [activeNow, setActiveNow] = useState<
    { id: string; name: string; status: string }[]
  >([]);
  const [recentPunchRows, setRecentPunchRows] = useState<
    { id: string; name: string; status: string }[]
  >([]);
  const [punchStatus, setPunchStatus] = useState<string | null>(null);
  const [punchLoadingId, setPunchLoadingId] = useState<string | null>(null);
  const [managerPin, setManagerPin] = useState("");
  const [managerPunchLoading, setManagerPunchLoading] = useState(false);
  const [managerPunchStatus, setManagerPunchStatus] = useState<string | null>(
    null,
  );
  const [managerPendingTipWorkDate, setManagerPendingTipWorkDate] = useState<
    string | null
  >(null);
  const [managerCashTips, setManagerCashTips] = useState("0");
  const [managerCreditCardTips, setManagerCreditCardTips] = useState("0");
  const [managerTipSaving, setManagerTipSaving] = useState(false);

  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPin, setNewUserPin] = useState("");
  const [newUserIsManager, setNewUserIsManager] = useState(false);
  const [newUserIsOwnerManager, setNewUserIsOwnerManager] = useState(false);
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);
  const [newUserIsTimeAdmin, setNewUserIsTimeAdmin] = useState(false);
  const [newUserIsReports, setNewUserIsReports] = useState(false);
  const [newUserIsServer, setNewUserIsServer] = useState(false);
  const [newUserIsKitchenManager, setNewUserIsKitchenManager] = useState(false);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] =
    useState<EditUserForm>(emptyEditUserForm());
  const [editUserStatus, setEditUserStatus] = useState<string | null>(null);
  const [editUserLoading, setEditUserLoading] = useState(false);
  const [editUserSaving, setEditUserSaving] = useState(false);

  const [newOfficeName, setNewOfficeName] = useState("");
  const [newOfficeLatitude, setNewOfficeLatitude] = useState("");
  const [newOfficeLongitude, setNewOfficeLongitude] = useState("");
  const [newOfficeRadius, setNewOfficeRadius] = useState("120");
  const [officeStatus, setOfficeStatus] = useState<string | null>(null);
  const [officeGeoLatitude, setOfficeGeoLatitude] = useState("");
  const [officeGeoLongitude, setOfficeGeoLongitude] = useState("");
  const [officeGeoRadius, setOfficeGeoRadius] = useState("120");
  const [officeGeoStatus, setOfficeGeoStatus] = useState<string | null>(null);
  const [officeGeoSaving, setOfficeGeoSaving] = useState(false);

  const [newGroupName, setNewGroupName] = useState("");
  const [groupStatus, setGroupStatus] = useState<string | null>(null);

  const [scheduleEmployeeId, setScheduleEmployeeId] = useState("");
  const [scheduleEmployeePickerOpen, setScheduleEmployeePickerOpen] =
    useState(false);
  const [scheduleEmployeeSearch, setScheduleEmployeeSearch] = useState("");
  const [scheduleDays, setScheduleDays] = useState<ScheduleDay[]>(
    defaultScheduleDays(),
  );
  const [scheduleStatus, setScheduleStatus] = useState<string | null>(null);
  const [todaySchedule, setTodaySchedule] =
    useState<TodayScheduleResponse | null>(null);
  const [todayScheduleStatus, setTodayScheduleStatus] = useState<string | null>(
    null,
  );
  const [todayScheduleLoading, setTodayScheduleLoading] = useState(false);
  const [todayRoleFilter, setTodayRoleFilter] = useState("All");
  const [companyOrderCatalog, setCompanyOrderCatalog] = useState<
    CompanyOrderCatalogSupplier[]
  >([]);
  const [companyOrderSupplier, setCompanyOrderSupplier] = useState("");
  const [companyOrderSearch, setCompanyOrderSearch] = useState("");
  const [companyOrderShowOnlyAdded, setCompanyOrderShowOnlyAdded] =
    useState(false);
  const [companyOrderVisibleCount, setCompanyOrderVisibleCount] = useState(16);
  const [companyOrderNotes, setCompanyOrderNotes] = useState("");
  const [companyOrderDrafts, setCompanyOrderDrafts] = useState<
    Record<string, Record<string, string>>
  >({});
  const [companyOrderRows, setCompanyOrderRows] = useState<CompanyOrderRow[]>(
    [],
  );
  const [companyOrderLoading, setCompanyOrderLoading] = useState(false);
  const [companyOrderSaving, setCompanyOrderSaving] = useState(false);
  const [companyOrderExportingFormat, setCompanyOrderExportingFormat] =
    useState<"pdf" | "csv" | "excel" | null>(null);
  const [lastSubmittedCompanyOrderWeekStart, setLastSubmittedCompanyOrderWeekStart] =
    useState(getCurrentWeekStartDateKey());
  const [companyOrderStatus, setCompanyOrderStatus] = useState<string | null>(
    null,
  );
  const [liquorInventoryEnabled, setLiquorInventoryEnabled] = useState(false);
  const [liquorPremiumEnabled, setLiquorPremiumEnabled] = useState(false);
  const [liquorCatalog, setLiquorCatalog] = useState<LiquorCatalogItem[]>([]);
  const [liquorCounts, setLiquorCounts] = useState<LiquorCountRow[]>([]);
  const [liquorBottleScans, setLiquorBottleScans] = useState<
    LiquorBottleScanRow[]
  >([]);
  const [liquorSheetDrafts, setLiquorSheetDrafts] = useState<
    Record<string, LiquorSheetDraft>
  >({});
  const [liquorCountDate, setLiquorCountDate] = useState(todayDateKey());
  const [liquorScanContainerKey, setLiquorScanContainerKey] = useState("");
  const [liquorInvoiceDate, setLiquorInvoiceDate] = useState(todayDateKey());
  const [liquorInvoiceNumber, setLiquorInvoiceNumber] = useState("");
  const [liquorInvoiceSupplier, setLiquorInvoiceSupplier] = useState("");
  const [liquorInvoiceNotes, setLiquorInvoiceNotes] = useState("");
  const [liquorInvoiceIncludePurchases, setLiquorInvoiceIncludePurchases] =
    useState(true);
  const [liquorInvoiceImageDataUrl, setLiquorInvoiceImageDataUrl] = useState("");
  const [liquorInvoiceImageName, setLiquorInvoiceImageName] = useState("");
  const [liquorInvoiceRows, setLiquorInvoiceRows] = useState<
    LiquorInvoiceExtractedRow[]
  >([]);
  const [liquorInvoiceAnalyzing, setLiquorInvoiceAnalyzing] = useState(false);
  const [liquorInvoiceApplying, setLiquorInvoiceApplying] = useState(false);
  const [liquorLoading, setLiquorLoading] = useState(false);
  const [liquorStatus, setLiquorStatus] = useState<string | null>(null);
  const [liquorSavingItemId, setLiquorSavingItemId] = useState<string | null>(
    null,
  );
  const [liquorSavingCountItemId, setLiquorSavingCountItemId] = useState<
    string | null
  >(null);
  const [liquorAnalyzingItemId, setLiquorAnalyzingItemId] = useState<
    string | null
  >(null);

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
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [resolvedApiBase, setResolvedApiBase] = useState<string | null>(null);
  const [dataSyncError, setDataSyncError] = useState<string | null>(null);
  const [pushRegisteredTenant, setPushRegisteredTenant] = useState("");
  const canCreateLocations = permissions.locations;
  const canManageMultiLocation =
    multiLocationEnabled && permissions.manageMultiLocation;
  const scopedLocationId = canManageMultiLocation
    ? activeLocationId.trim()
    : "";
  const defaultOfficeId = useMemo(
    () => offices[0]?.id?.trim() || "",
    [offices],
  );
  const companyOrdersOfficeId = useMemo(() => {
    if (scopedLocationId) {
      return scopedLocationId;
    }
    if (!canManageMultiLocation) {
      return defaultOfficeId;
    }
    return "";
  }, [canManageMultiLocation, defaultOfficeId, scopedLocationId]);
  const hasLiquorManagerAccess = Boolean(
    sessionManagerEmployeeId && permissions.reports && liquorInventoryEnabled,
  );
  const hasLiquorPremiumAccess = Boolean(
    hasLiquorManagerAccess && liquorPremiumEnabled,
  );
  const latestLiquorCountByItem = useMemo(() => {
    const map = new Map<string, LiquorCountRow>();
    liquorCounts.forEach((count) => {
      if (!map.has(count.itemId)) {
        map.set(count.itemId, count);
      }
    });
    return map;
  }, [liquorCounts]);
  const liquorSheetRows = useMemo(
    () =>
      [...liquorCatalog]
        .filter((item) => item.isActive)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((item) => {
          const latestCount = latestLiquorCountByItem.get(item.id);
          const barQuantity =
            latestCount?.barQuantity ?? latestCount?.quantity ?? 0;
          const bodegaQuantity = latestCount?.bodegaQuantity ?? 0;
          const inventory = barQuantity + bodegaQuantity;
          const total =
            item.sizeMl && item.sizeMl > 0
              ? Number(((item.unitCost * inventory) / item.sizeMl).toFixed(2))
              : null;
          return {
            item,
            barQuantity,
            bodegaQuantity,
            inventory,
            total,
          };
        }),
    [latestLiquorCountByItem, liquorCatalog],
  );

  useEffect(() => {
    let active = true;
    const loadTenant = async () => {
      try {
        const storedTenant = (
          await AsyncStorage.getItem(ADMIN_TENANT_STORAGE_KEY)
        )?.trim();
        if (!active || !storedTenant) {
          return;
        }
        setTenantInput(storedTenant);
      } catch {
        // keep empty when storage is unavailable
      }
    };
    void loadTenant();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const normalized = tenantInput.trim();
    if (!normalized) {
      return;
    }
    void AsyncStorage.setItem(ADMIN_TENANT_STORAGE_KEY, normalized);
  }, [tenantInput]);

  const appendOfficeScope = useCallback(
    (path: string) => {
      if (!scopedLocationId) {
        return path;
      }
      const joiner = path.includes("?") ? "&" : "?";
      return `${path}${joiner}officeId=${encodeURIComponent(scopedLocationId)}`;
    },
    [scopedLocationId],
  );

  const clearAdminSession = useCallback(() => {
    setLoggedIn(false);
    setPermissions(defaultAccessPermissions());
    setMultiLocationEnabled(false);
    setActiveLocationId("");
    setSessionManagerEmployeeId(null);
    setManagerClockExempt(false);
    setManagerPin("");
    setManagerPunchLoading(false);
    setManagerPunchStatus(null);
    setManagerPendingTipWorkDate(null);
    setManagerCashTips("0");
    setManagerCreditCardTips("0");
    setManagerTipSaving(false);
    setPushRegisteredTenant("");
    setActiveTenant("");
    setActiveTenantLabel("");
    setActiveAdminUsername("");
    setUsername("");
    setPassword("");
    setScreen("dashboard");
    setTodaySchedule(null);
    setTodayScheduleStatus(null);
    setTodayRoleFilter("All");
    setCompanyOrderCatalog([]);
    setCompanyOrderSupplier("");
    setCompanyOrderSearch("");
    setCompanyOrderNotes("");
    setCompanyOrderDrafts({});
    setCompanyOrderRows([]);
    setCompanyOrderExportingFormat(null);
    setLastSubmittedCompanyOrderWeekStart(getCurrentWeekStartDateKey());
    setCompanyOrderStatus(null);
    setLiquorInventoryEnabled(false);
    setLiquorPremiumEnabled(false);
    setLiquorCatalog([]);
    setLiquorCounts([]);
    setLiquorBottleScans([]);
    setLiquorSheetDrafts({});
    setLiquorCountDate(todayDateKey());
    setLiquorScanContainerKey("");
    setLiquorInvoiceDate(todayDateKey());
    setLiquorInvoiceNumber("");
    setLiquorInvoiceSupplier("");
    setLiquorInvoiceNotes("");
    setLiquorInvoiceIncludePurchases(true);
    setLiquorInvoiceImageDataUrl("");
    setLiquorInvoiceImageName("");
    setLiquorInvoiceRows([]);
    setLiquorInvoiceAnalyzing(false);
    setLiquorInvoiceApplying(false);
    setLiquorStatus(null);
    setLiquorLoading(false);
    setLiquorSavingItemId(null);
    setLiquorSavingCountItemId(null);
    setLiquorAnalyzingItemId(null);
    setRecentPunchRows([]);
    setEmployeeMessageEmployeeId("");
    setEmployeeMessageSubject("");
    setEmployeeMessageBody("");
    setEmployeeMessageStatus(null);
    setResolvedApiBase(null);
  }, []);

  const fetchJson = useCallback(
    async (path: string, options?: RequestInit) => {
      const orderedBases = resolvedApiBase
        ? [resolvedApiBase]
        : (Array.from(new Set(apiBaseCandidates.filter(Boolean))) as string[]);
      let lastError: Error | null = null;

      for (const apiBase of orderedBases) {
        try {
          const headers = new Headers(options?.headers);
          const tenantHeader =
            (loggedIn ? activeTenant : tenantInput).trim() || DEFAULT_TENANT;
          const activeLoginName = (
            (loggedIn ? activeAdminUsername : username) || ""
          ).trim();
          const normalizedLoginName = activeLoginName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)+/g, "");
          const devHeaders = {
            "x-dev-user-id": normalizedLoginName
              ? `tenant-admin:${normalizedLoginName}`
              : "dev-user",
            "x-dev-email": normalizedLoginName
              ? `${normalizedLoginName}@clockin.local`
              : "dev@clockin.local",
            "x-dev-name": activeLoginName || "Dev User",
            "x-dev-tenant-id": tenantHeader,
          };
          Object.entries(devHeaders).forEach(([key, value]) => {
            if (!headers.has(key)) {
              headers.set(key, value);
            }
          });
          const body = options?.body;
          const isFormData =
            typeof FormData !== "undefined" && body instanceof FormData;
          if (!isFormData && !headers.has("Content-Type")) {
            headers.set("Content-Type", "application/json");
          }

          const response = await fetch(`${apiBase}${path}`, {
            ...options,
            headers,
          });

          if (!response.ok) {
            const raw = await response.text().catch(() => "");
            let message = "Request failed";
            if (raw) {
              try {
                const data = JSON.parse(raw);
                message = data?.message || data?.error || raw;
              } catch {
                message = raw;
              }
            }
            const responseError = new Error(`${message} (${response.status})`);
            if (!resolvedApiBase) {
              setResolvedApiBase(apiBase);
            }
            if (response.status >= 500 || response.status === 429) {
              lastError = responseError;
              continue;
            }
            throw responseError;
          }

          if (!resolvedApiBase) {
            setResolvedApiBase(apiBase);
          }

          const raw = await response.text();
          if (!raw) {
            return {};
          }
          try {
            return JSON.parse(raw);
          } catch {
            return {};
          }
        } catch (error) {
          if (error instanceof Error) {
            lastError = error;
            if (
              /network request failed|fetch failed|load failed/i.test(
                error.message,
              )
            ) {
              continue;
            }
            throw error;
          }
          lastError = new Error("Request failed");
          throw lastError;
        }
      }

      throw (
        lastError ||
        new Error(
          `Unable to reach ClockIn API. Tried: ${orderedBases.join(", ")}`,
        )
      );
    },
    [
      activeAdminUsername,
      activeTenant,
      loggedIn,
      resolvedApiBase,
      tenantInput,
      username,
    ],
  );

  const fetchCompanyOrderExport = useCallback(
    async (format: "pdf" | "csv" | "excel", weekStartDate: string) => {
      const orderedBases = resolvedApiBase
        ? [resolvedApiBase]
        : (Array.from(new Set(apiBaseCandidates.filter(Boolean))) as string[]);
      const query = new URLSearchParams();
      query.set("format", format);
      query.set("weekStart", weekStartDate);
      if (companyOrdersOfficeId) {
        query.set("officeId", companyOrdersOfficeId);
      }
      const path = `/company-orders/export?${query.toString()}`;
      const acceptHeader =
        format === "pdf"
          ? "application/pdf"
          : format === "csv"
            ? "text/csv"
            : "application/vnd.ms-excel";

      for (const apiBase of orderedBases) {
        try {
          const headers = new Headers();
          const tenantHeader =
            (loggedIn ? activeTenant : tenantInput).trim() || DEFAULT_TENANT;
          const activeLoginName = (
            (loggedIn ? activeAdminUsername : username) || ""
          ).trim();
          const normalizedLoginName = activeLoginName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)+/g, "");
          headers.set("Accept", acceptHeader);
          headers.set(
            "x-dev-user-id",
            normalizedLoginName
              ? `tenant-admin:${normalizedLoginName}`
              : "dev-user",
          );
          headers.set(
            "x-dev-email",
            normalizedLoginName
              ? `${normalizedLoginName}@clockin.local`
              : "dev@clockin.local",
          );
          headers.set("x-dev-name", activeLoginName || "Dev User");
          headers.set("x-dev-tenant-id", tenantHeader);

          const response = await fetch(`${apiBase}${path}`, { headers });
          if (!response.ok) {
            continue;
          }
          if (!resolvedApiBase) {
            setResolvedApiBase(apiBase);
          }
          const extension =
            format === "pdf" ? "pdf" : format === "csv" ? "csv" : "xls";
          const contentDisposition =
            response.headers.get("content-disposition") || "";
          const filenameMatch = /filename=\"?([^\";]+)\"?/i.exec(
            contentDisposition,
          );
          const filename =
            (filenameMatch?.[1] || `company-orders-week-${weekStartDate}.${extension}`)
              .trim()
              .replace(/[^\w.\-]/g, "_");

          if (Platform.OS === "web") {
            const webResponse = response as any;
            if (typeof webResponse.blob === "function") {
              const blob = await webResponse.blob();
              const webUrl = (globalThis as any)?.URL;
              const webDocument = (globalThis as any)?.document;
              if (
                blob &&
                webUrl?.createObjectURL &&
                webDocument?.createElement
              ) {
                const objectUrl = webUrl.createObjectURL(blob);
                const anchor = webDocument.createElement("a");
                anchor.href = objectUrl;
                anchor.download = filename;
                anchor.rel = "noopener";
                if (webDocument.body?.appendChild) {
                  webDocument.body.appendChild(anchor);
                }
                anchor.click();
                if (typeof anchor.remove === "function") {
                  anchor.remove();
                }
                setTimeout(() => {
                  if (webUrl?.revokeObjectURL) {
                    webUrl.revokeObjectURL(objectUrl);
                  }
                }, 1200);
                return true;
              }
            }
          }

          const arrayBuffer = await response.arrayBuffer();
          if (Platform.OS !== "web") {
            const directoryUri =
              FileSystem.cacheDirectory || FileSystem.documentDirectory;
            if (!directoryUri) {
              throw new Error(
                language === "es"
                  ? "No se puede acceder al almacenamiento local para la descarga."
                  : "Unable to access local storage for download.",
              );
            }

            const fileUri = `${directoryUri}${filename}`;
            const bytes = new Uint8Array(arrayBuffer);
            const base64 = bytesToBase64(bytes);
            await FileSystem.writeAsStringAsync(fileUri, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(fileUri, {
                mimeType: acceptHeader,
                dialogTitle: filename,
              });
            } else {
              Alert.alert(
                language === "es" ? "Descarga lista" : "Download ready",
                filename,
              );
            }
            return true;
          }

          return true;
        } catch {
          // try next base
        }
      }
      return false;
    },
    [
      activeAdminUsername,
      activeTenant,
      companyOrdersOfficeId,
      loggedIn,
      resolvedApiBase,
      tenantInput,
      language,
      username,
    ],
  );

  useEffect(() => {
    let cancelled = false;

    const probeApi = async () => {
      try {
        await fetchJson("/health");
        if (!cancelled) {
          setDataSyncError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setDataSyncError(
            error instanceof Error
              ? error.message
              : "Unable to reach ClockIn API.",
          );
        }
      }
    };

    probeApi();

    return () => {
      cancelled = true;
    };
  }, [fetchJson]);

  useEffect(() => {
    if (!loggedIn) return;
    loadAccessProfile();
    loadSummary();
    loadEmployees();
    loadOffices();
    loadGroups();
    loadActiveNow();
    loadNotifications();
  }, [loggedIn, scopedLocationId]);

  useEffect(() => {
    if (!loggedIn) return;
    if (screen === "alerts") {
      loadNotifications();
    }
  }, [loggedIn, screen]);

  useEffect(() => {
    if (!loggedIn) return;
    if (screen === "schedules") {
      void loadTodaySchedule();
      if (scheduleEmployeeId) {
        void loadSchedule(scheduleEmployeeId);
      }
    }
  }, [loggedIn, screen, scheduleEmployeeId, scopedLocationId]);

  useEffect(() => {
    if (!loggedIn) return;
    if (screen !== "companyOrders") return;
    void loadCompanyOrderCatalog();
    void loadCompanyOrders();
    if (hasLiquorManagerAccess) {
      void loadLiquorControlData();
    } else {
      setLiquorCatalog([]);
      setLiquorCounts([]);
      setLiquorBottleScans([]);
      setLiquorSheetDrafts({});
      setLiquorInvoiceRows([]);
      setLiquorInvoiceImageDataUrl("");
      setLiquorInvoiceImageName("");
      setLiquorStatus(null);
    }
  }, [
    companyOrdersOfficeId,
    hasLiquorManagerAccess,
    loggedIn,
    screen,
    scopedLocationId,
  ]);

  useEffect(() => {
    if (!loggedIn) return;
    if (screen === "dashboard") {
      loadActiveNow();
      loadNotifications();
      loadSummary();
      return;
    }
    if (screen === "users") {
      loadEmployees();
      loadActiveNow();
      loadSummary();
    }
    if (screen === "groups") {
      loadGroups();
    }
  }, [loggedIn, screen, scopedLocationId]);

  useEffect(() => {
    if (!loggedIn || screen !== "dashboard") {
      return;
    }
    const timer = setInterval(() => {
      void loadActiveNow();
      void loadNotifications();
    }, 60_000);
    return () => {
      clearInterval(timer);
    };
  }, [loggedIn, screen, scopedLocationId]);

  useEffect(() => {
    if (salesExpenseMethod !== "CHECK") {
      setSalesExpenseCheckNumber("");
      setSalesExpensePayToCompany("");
    }
  }, [salesExpenseMethod]);

  useEffect(() => {
    if (!loggedIn || !canManageMultiLocation) {
      return;
    }
    if (!activeLocationId && offices[0]?.id) {
      setActiveLocationId(offices[0].id);
    }
  }, [activeLocationId, canManageMultiLocation, loggedIn, offices]);

  const registerForPush = useCallback(async () => {
    const tenantKey = activeTenant.trim();
    if (!loggedIn || !tenantKey || pushRegisteredTenant === tenantKey) {
      return;
    }
    if (!Device.isDevice) return;

    try {
      const { status } = await Notifications.getPermissionsAsync();
      let finalStatus = status;
      if (status !== "granted") {
        const request = await Notifications.requestPermissionsAsync();
        finalStatus = request.status;
      }
      if (finalStatus !== "granted") return;

      const runtimeConstants = Constants as unknown as {
        easConfig?: { projectId?: string };
      };
      const projectId =
        runtimeConstants.easConfig?.projectId ||
        Constants.expoConfig?.extra?.eas?.projectId ||
        null;

      if (!projectId) {
        setDataSyncError(
          "Push registration skipped: missing Expo project ID in runtime config.",
        );
        return;
      }

      const token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;

      await fetchJson("/admin-devices", {
        method: "POST",
        body: JSON.stringify({ expoPushToken: token, platform: Device.osName }),
      });
      setPushRegisteredTenant(tenantKey);
    } catch (error) {
      setDataSyncError(
        error instanceof Error
          ? `Push registration error: ${error.message}`
          : "Push registration failed.",
      );
    }
  }, [activeTenant, fetchJson, loggedIn, pushRegisteredTenant]);

  useEffect(() => {
    if (!loggedIn || !activeTenant.trim()) {
      return;
    }
    void registerForPush();
  }, [activeTenant, loggedIn, registerForPush]);

  const handleLogin = async () => {
    if (!tenantInput.trim() || !username || !password) {
      setLoginStatus("Enter tenant, username, and password.");
      return;
    }
    setLoginLoading(true);
    setLoginStatus(null);
    try {
      const orderedBases = resolvedApiBase
        ? [resolvedApiBase]
        : (Array.from(new Set(apiBaseCandidates.filter(Boolean))) as string[]);
      let lastError: Error | null = null;
      let verified: {
        name?: string;
        slug?: string;
        authOrgId?: string;
        featurePermissions?: string[];
        managerEmployeeId?: string | null;
        error?: string;
        message?: string;
      } | null = null;
      let matchedBase: string | null = null;

      for (const apiBase of orderedBases) {
        try {
          const response = await fetch(
            `${apiBase}/tenant-directory/admin-login`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tenant: tenantInput.trim(),
                username: username.trim(),
                password,
              }),
            },
          );
          const data = (await response.json().catch(() => ({}))) as {
            name?: string;
            slug?: string;
            authOrgId?: string;
            featurePermissions?: string[];
            managerEmployeeId?: string | null;
            error?: string;
            message?: string;
          };

          if (!response.ok || !data.authOrgId) {
            const responseError = new Error(
              data.message || data.error || "Invalid credentials.",
            );
            if (!resolvedApiBase) {
              setResolvedApiBase(apiBase);
            }
            if (response.status >= 500 || response.status === 429) {
              lastError = responseError;
              continue;
            }
            throw responseError;
          }

          verified = data;
          matchedBase = apiBase;
          break;
        } catch (error) {
          if (error instanceof Error) {
            lastError = error;
          } else {
            lastError = new Error("Unable to reach ClockIn API.");
          }
        }
      }

      if (!verified?.authOrgId) {
        throw lastError || new Error("Invalid credentials.");
      }

      if (matchedBase && resolvedApiBase !== matchedBase) {
        setResolvedApiBase(matchedBase);
      }
      setPermissions(
        permissionsFromFeaturePermissions(verified.featurePermissions) ||
          defaultAccessPermissions(),
      );
      setLiquorInventoryEnabled(false);
      setLiquorPremiumEnabled(false);
      setMultiLocationEnabled(false);
      setActiveLocationId("");
      setActiveTenant(verified.authOrgId.trim());
      setSessionManagerEmployeeId(
        typeof verified.managerEmployeeId === "string" &&
          verified.managerEmployeeId.trim()
          ? verified.managerEmployeeId.trim()
          : null,
      );
      setManagerClockExempt(false);
      setManagerPin("");
      setManagerPunchStatus(null);
      setManagerPendingTipWorkDate(null);
      setManagerCashTips("0");
      setManagerCreditCardTips("0");
      const tenantForNextLogin = (verified.slug || tenantInput).trim();
      if (tenantForNextLogin) {
        setTenantInput(tenantForNextLogin);
        void AsyncStorage.setItem(ADMIN_TENANT_STORAGE_KEY, tenantForNextLogin);
      }
      setActiveTenantLabel(
        (verified.name || verified.slug || tenantInput).trim(),
      );
      setActiveAdminUsername(username.trim());
      setLoggedIn(true);
      setLoginStatus(null);
      setScreen("dashboard");
    } catch (error) {
      setLoginStatus(
        error instanceof Error ? error.message : "Invalid credentials.",
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const loadAccessProfile = useCallback(async () => {
    try {
      const data = (await fetchJson("/access/me")) as {
        multiLocationEnabled?: boolean;
        permissions?: Partial<AccessPermissions>;
        actorType?: string;
        employeeId?: string | null;
        ownerClockExempt?: boolean;
        liquorInventoryEnabled?: boolean;
        premiumFeaturesEnabled?: boolean;
      };
      setMultiLocationEnabled(Boolean(data.multiLocationEnabled));
      setPermissions((prev) => ({ ...prev, ...(data.permissions || {}) }));
      setLiquorInventoryEnabled(Boolean(data.liquorInventoryEnabled));
      setLiquorPremiumEnabled(Boolean(data.premiumFeaturesEnabled));
      if (data.actorType === "manager" && typeof data.employeeId === "string") {
        setSessionManagerEmployeeId(data.employeeId);
        setManagerClockExempt(Boolean(data.ownerClockExempt));
      } else if (data.actorType === "tenant_admin") {
        setSessionManagerEmployeeId(null);
        setManagerClockExempt(false);
      } else {
        setSessionManagerEmployeeId(null);
        setManagerClockExempt(false);
      }
      if (
        !data.multiLocationEnabled ||
        !data.permissions?.manageMultiLocation
      ) {
        setActiveLocationId("");
      }
      setDataSyncError(null);
    } catch (error) {
      setLiquorInventoryEnabled(false);
      setLiquorPremiumEnabled(false);
      setDataSyncError(
        error instanceof Error
          ? error.message
          : "Unable to load access permissions.",
      );
    }
  }, [fetchJson]);

  const loadSummary = async () => {
    try {
      const data = (await fetchJson(
        appendOfficeScope("/employees/summary"),
      )) as Summary;
      setSummary(data);
      setDataSyncError(null);
    } catch (error) {
      setDataSyncError(
        error instanceof Error ? error.message : "Unable to load summary data.",
      );
    }
  };

  const loadEmployees = async () => {
    try {
      const data = (await fetchJson(appendOfficeScope("/employees"))) as {
        employees: Employee[];
      };
      setEmployees(data.employees || []);
      if (!scheduleEmployeeId && data.employees?.[0]) {
        setScheduleEmployeeId(data.employees[0].id);
      }
      if (
        reportEmployeeId &&
        !data.employees?.some((employee) => employee.id === reportEmployeeId)
      ) {
        setReportEmployeeId("");
      }
      if (
        scheduleEmployeeId &&
        !data.employees?.some((employee) => employee.id === scheduleEmployeeId)
      ) {
        setScheduleEmployeeId(data.employees?.[0]?.id || "");
      }
      if (
        editingUserId &&
        !data.employees?.some((employee) => employee.id === editingUserId)
      ) {
        setEditingUserId(null);
        setEditUserForm(emptyEditUserForm());
      }
      setDataSyncError(null);
    } catch (error) {
      setDataSyncError(
        error instanceof Error ? error.message : "Unable to load users.",
      );
    }
  };

  const loadOffices = async () => {
    try {
      const data = (await fetchJson("/offices")) as { offices: Office[] };
      const nextOffices = data.offices || [];
      setOffices(nextOffices);
      if (
        canManageMultiLocation &&
        nextOffices.length > 0 &&
        (!activeLocationId ||
          !nextOffices.some((office) => office.id === activeLocationId))
      ) {
        setActiveLocationId(nextOffices[0].id);
      }
      if (nextOffices.length === 0) {
        setActiveLocationId("");
      }
    } catch {
      // ignore
    }
  };

  const loadGroups = async () => {
    try {
      const data = (await fetchJson(appendOfficeScope("/groups"))) as {
        groups: Group[];
      };
      setGroups(data.groups || []);
    } catch {
      // ignore
    }
  };

  const loadNotifications = useCallback(async () => {
    try {
      const data = (await fetchJson("/notifications?limit=50")) as {
        notifications: NotificationRow[];
      };
      setNotifications(data.notifications || []);
      setDataSyncError(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load alerts.";
      setDataSyncError(message);
      setAlertsStatus(message);
    }
  }, [fetchJson]);

  const sendEmployeeMessage = async () => {
    const targetEmployeeId = employeeMessageEmployeeId.trim();
    const subject = employeeMessageSubject.trim();
    const message = employeeMessageBody.trim();
    if (!targetEmployeeId) {
      setEmployeeMessageStatus("Select an employee.");
      return;
    }
    if (!subject) {
      setEmployeeMessageStatus("Subject is required.");
      return;
    }
    if (!message) {
      setEmployeeMessageStatus("Message is required.");
      return;
    }

    setEmployeeMessageSending(true);
    setEmployeeMessageStatus(null);
    try {
      await fetchJson("/notifications/employee-message", {
        method: "POST",
        body: JSON.stringify({
          employeeId: targetEmployeeId,
          subject,
          message,
        }),
      });
      setEmployeeMessageSubject("");
      setEmployeeMessageBody("");
      setEmployeeMessageStatus(
        "Message sent. It will pop up when the employee clocks in.",
      );
      await loadNotifications();
    } catch (error) {
      setEmployeeMessageStatus(
        error instanceof Error ? error.message : "Unable to send message.",
      );
    } finally {
      setEmployeeMessageSending(false);
    }
  };

  useEffect(() => {
    if (!loggedIn) {
      return;
    }
    let subscription:
      | ReturnType<typeof Notifications.addNotificationReceivedListener>
      | null = null;
    try {
      subscription = Notifications.addNotificationReceivedListener(() => {
        void loadNotifications();
      });
    } catch (error) {
      setDataSyncError(
        error instanceof Error
          ? `Notification listener error: ${error.message}`
          : "Notification listener failed to start.",
      );
    }
    return () => {
      try {
        subscription?.remove();
      } catch {
        // noop
      }
    };
  }, [loadNotifications, loggedIn]);

  const handleScheduleOverrideDecision = async (
    requestId: string,
    approve: boolean,
  ) => {
    setAlertsStatus(null);
    setScheduleOverrideLoadingId(requestId);
    try {
      const data = (await fetchJson(
        `/employee-punches/schedule-overrides/${requestId}/${approve ? "approve" : "reject"}`,
        { method: "PATCH" },
      )) as {
        autoClockIn?: { clockedIn?: boolean; alreadyActive?: boolean };
      };
      if (!approve) {
        setAlertsStatus("Clock-in override rejected.");
      } else if (data.autoClockIn?.clockedIn) {
        setAlertsStatus(
          "Clock-in override approved. Employee clocked in automatically.",
        );
      } else if (data.autoClockIn?.alreadyActive) {
        setAlertsStatus(
          "Clock-in override approved. Employee is already clocked in.",
        );
      } else {
        setAlertsStatus("Clock-in override approved.");
      }
      await loadNotifications();
      await loadActiveNow();
    } catch (error) {
      setAlertsStatus(
        error instanceof Error
          ? error.message
          : "Unable to update schedule override request.",
      );
    } finally {
      setScheduleOverrideLoadingId(null);
    }
  };

  const loadActiveNow = async () => {
    try {
      const data = (await fetchJson(
        appendOfficeScope("/employee-punches/recent"),
      )) as {
        rows: { id: string; name: string; status: string | null }[];
      };
      const mappedRows = (data.rows || []).map((row) => ({
        id: row.id,
        name: row.name,
        status: (row.status || "OUT").toUpperCase(),
      }));
      setRecentPunchRows(mappedRows);
      setActiveNow(
        mappedRows.filter((row) => ["IN", "BREAK", "LUNCH"].includes(row.status)),
      );
      setDataSyncError(null);
    } catch (error) {
      setDataSyncError(
        error instanceof Error ? error.message : "Unable to load active users.",
      );
    }
  };

  const handleCreateUser = async () => {
    setUserStatus(null);
    if (!newUserName.trim()) {
      setUserStatus("Enter a full name.");
      return;
    }
    try {
      await fetchJson("/employees", {
        method: "POST",
        body: JSON.stringify({
          fullName: newUserName.trim(),
          displayName: newUserName.trim(),
          email: newUserEmail.trim() || undefined,
          pin: newUserPin.trim() || undefined,
          officeId: scopedLocationId || undefined,
          isManager: newUserIsManager,
          isOwnerManager: newUserIsManager ? newUserIsOwnerManager : false,
          isAdmin: newUserIsAdmin,
          isTimeAdmin: newUserIsTimeAdmin,
          isReports: newUserIsReports,
          isServer: newUserIsServer,
          isKitchenManager: newUserIsKitchenManager,
        }),
      });
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPin("");
      setNewUserIsManager(false);
      setNewUserIsOwnerManager(false);
      setNewUserIsAdmin(false);
      setNewUserIsTimeAdmin(false);
      setNewUserIsReports(false);
      setNewUserIsServer(false);
      setNewUserIsKitchenManager(false);
      setUserStatus("User created.");
      loadEmployees();
      loadSummary();
    } catch (error) {
      setUserStatus(
        error instanceof Error ? error.message : "Unable to create user.",
      );
    }
  };

  const handleSetUserDisabled = async (id: string, disabled: boolean) => {
    try {
      await fetchJson(`/employees/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ disabled }),
      });
      if (editingUserId === id) {
        setEditUserForm((prev) => ({ ...prev, disabled }));
      }
      setUserStatus(disabled ? "User disabled." : "User enabled.");
      loadEmployees();
      loadSummary();
      loadActiveNow();
    } catch (error) {
      setUserStatus(
        error instanceof Error
          ? error.message
          : "Unable to update user status.",
      );
    }
  };

  const loadUserForEdit = async (id: string) => {
    setEditUserLoading(true);
    setEditUserStatus(null);
    try {
      const data = (await fetchJson(`/employees/${id}`)) as {
        fullName: string;
        displayName?: string | null;
        email?: string | null;
        hourlyRate?: number | null;
        officeId?: string | null;
        groupId?: string | null;
        isManager?: boolean;
        isOwnerManager?: boolean;
        isAdmin?: boolean;
        isTimeAdmin?: boolean;
        isReports?: boolean;
        isServer?: boolean;
        isKitchenManager?: boolean;
        disabled?: boolean;
      };
      setEditingUserId(id);
      setEditUserForm({
        fullName: data.fullName || "",
        displayName: data.displayName || "",
        email: data.email || "",
        pin: "",
        hourlyRate:
          typeof data.hourlyRate === "number" &&
          Number.isFinite(data.hourlyRate)
            ? String(data.hourlyRate)
            : "",
        officeId: data.officeId || "",
        groupId: data.groupId || "",
        isManager: Boolean(data.isManager),
        isOwnerManager: Boolean(data.isOwnerManager),
        isAdmin: Boolean(data.isAdmin),
        isTimeAdmin: Boolean(data.isTimeAdmin),
        isReports: Boolean(data.isReports),
        isServer: Boolean(data.isServer),
        isKitchenManager: Boolean(data.isKitchenManager),
        disabled: Boolean(data.disabled),
      });
      setEditUserStatus("Loaded user for editing.");
    } catch (error) {
      setEditUserStatus(
        error instanceof Error ? error.message : "Unable to load user.",
      );
    } finally {
      setEditUserLoading(false);
    }
  };

  const cancelEditUser = () => {
    setEditingUserId(null);
    setEditUserForm(emptyEditUserForm());
    setEditUserStatus(null);
  };

  const saveUserEdits = async () => {
    if (!editingUserId) {
      setEditUserStatus("Select a user to edit.");
      return;
    }

    const fullName = editUserForm.fullName.trim();
    if (!fullName) {
      setEditUserStatus("Full name is required.");
      return;
    }

    const pin = editUserForm.pin.trim();
    if (pin && !/^\d{4}$/.test(pin)) {
      setEditUserStatus("PIN must be 4 digits.");
      return;
    }

    let hourlyRate: number | undefined;
    const hourlyRateRaw = editUserForm.hourlyRate.trim();
    if (hourlyRateRaw) {
      const parsed = Number(hourlyRateRaw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setEditUserStatus("Hourly rate must be 0 or higher.");
        return;
      }
      hourlyRate = parsed;
    }

    setEditUserSaving(true);
    setEditUserStatus(null);
    try {
      const payload: Record<string, unknown> = {
        fullName,
        displayName: editUserForm.displayName.trim() || fullName,
        email: editUserForm.email.trim(),
        officeId: editUserForm.officeId,
        groupId: editUserForm.groupId,
        isManager: editUserForm.isManager,
        isOwnerManager: editUserForm.isManager
          ? editUserForm.isOwnerManager
          : false,
        isAdmin: editUserForm.isAdmin,
        isTimeAdmin: editUserForm.isTimeAdmin,
        isReports: editUserForm.isReports,
        isServer: editUserForm.isServer,
        isKitchenManager: editUserForm.isKitchenManager,
        disabled: editUserForm.disabled,
      };
      if (hourlyRate !== undefined) {
        payload.hourlyRate = hourlyRate;
      }
      if (pin) {
        payload.pin = pin;
      }

      await fetchJson(`/employees/${editingUserId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setEditUserForm((prev) => ({
        ...prev,
        pin: "",
      }));
      setEditUserStatus("User updated.");
      loadEmployees();
      loadSummary();
      loadActiveNow();
    } catch (error) {
      setEditUserStatus(
        error instanceof Error ? error.message : "Unable to update user.",
      );
    } finally {
      setEditUserSaving(false);
    }
  };

  const handleCreateOffice = async () => {
    setOfficeStatus(null);
    if (!newOfficeName.trim()) {
      setOfficeStatus("Enter a location name.");
      return;
    }

    const latitude = parseOptionalCoordinate(newOfficeLatitude);
    const longitude = parseOptionalCoordinate(newOfficeLongitude);
    const radius = parseOptionalRadius(newOfficeRadius);

    if (
      Number.isNaN(latitude) ||
      Number.isNaN(longitude) ||
      Number.isNaN(radius)
    ) {
      setOfficeStatus("Enter valid numeric geofence values.");
      return;
    }
    const hasLatitude = latitude !== null;
    const hasLongitude = longitude !== null;
    if (hasLatitude !== hasLongitude) {
      setOfficeStatus("Latitude and longitude are required together.");
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        name: newOfficeName.trim(),
      };
      if (latitude !== null && longitude !== null) {
        payload.latitude = latitude;
        payload.longitude = longitude;
        if (radius !== null) {
          payload.geofenceRadiusMeters = radius;
        }
      }

      const created = (await fetchJson("/offices", {
        method: "POST",
        body: JSON.stringify(payload),
      })) as Office;
      setNewOfficeName("");
      setNewOfficeLatitude("");
      setNewOfficeLongitude("");
      setNewOfficeRadius("120");
      if (created?.id) {
        setActiveLocationId(created.id);
      }
      setOfficeStatus("Location created. Switched to new location panel.");
      setScreen("dashboard");
      loadOffices();
      loadSummary();
      loadEmployees();
      loadGroups();
      loadActiveNow();
    } catch (error) {
      setOfficeStatus(
        error instanceof Error ? error.message : "Unable to create location.",
      );
    }
  };

  const handleSaveOfficeGeofence = async () => {
    if (!officeGeoTarget?.id) {
      setOfficeGeoStatus("Select a location first.");
      return;
    }

    const latitude = parseOptionalCoordinate(officeGeoLatitude);
    const longitude = parseOptionalCoordinate(officeGeoLongitude);
    const radius = parseOptionalRadius(officeGeoRadius);

    if (
      Number.isNaN(latitude) ||
      Number.isNaN(longitude) ||
      Number.isNaN(radius)
    ) {
      setOfficeGeoStatus("Enter valid numeric geofence values.");
      return;
    }

    const hasLatitude = latitude !== null;
    const hasLongitude = longitude !== null;
    if (hasLatitude !== hasLongitude) {
      setOfficeGeoStatus("Latitude and longitude are required together.");
      return;
    }

    setOfficeGeoSaving(true);
    setOfficeGeoStatus(null);
    try {
      const payload: Record<string, unknown> = {};
      if (hasLatitude && hasLongitude) {
        payload.latitude = latitude;
        payload.longitude = longitude;
        payload.geofenceRadiusMeters = radius;
      } else {
        payload.latitude = null;
        payload.longitude = null;
        payload.geofenceRadiusMeters = null;
      }

      await fetchJson(`/offices/${officeGeoTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setOfficeGeoStatus("Location geofence updated.");
      await loadOffices();
    } catch (error) {
      setOfficeGeoStatus(
        error instanceof Error ? error.message : "Unable to update geofence.",
      );
    } finally {
      setOfficeGeoSaving(false);
    }
  };

  const handleCreateGroup = async () => {
    setGroupStatus(null);
    if (!newGroupName.trim()) {
      setGroupStatus("Enter a group name.");
      return;
    }
    try {
      await fetchJson("/groups", {
        method: "POST",
        body: JSON.stringify({
          name: newGroupName.trim(),
          officeId: scopedLocationId || undefined,
        }),
      });
      setNewGroupName("");
      setGroupStatus("Group created.");
      loadGroups();
    } catch (error) {
      setGroupStatus(
        error instanceof Error ? error.message : "Unable to create group.",
      );
    }
  };

  const runReport = async () => {
    setReportStatus(null);
    setReportLoading(true);
    try {
      if (!fromDate.trim() || !toDate.trim()) {
        setReportStatus("From and To dates are required.");
        return;
      }
      const fromIso = parseDateInputToIso(fromDate);
      const toIso = parseDateInputToIso(toDate);
      if (!fromIso || !toIso) {
        setReportStatus("Use MM/DD/YYYY dates.");
        return;
      }
      if (fromIso > toIso) {
        setReportStatus('"From" date must be before or equal to "To" date.');
        return;
      }
      const tzOffset = new Date().getTimezoneOffset();
      const query = new URLSearchParams({
        from: fromIso,
        to: toIso,
        round: "0",
        tzOffset: String(tzOffset),
      });
      if (reportEmployeeId) {
        query.set("employeeId", reportEmployeeId);
      }

      const data = (await fetchJson(
        `/reports/${reportType}?${query.toString()}`,
      )) as any;
      if (reportType === "audit") {
        setReportRows(data.records || []);
        setReportStatus(`Generated ${(data.records || []).length} audit rows.`);
      } else {
        setReportRows(data.employees || []);
        setReportStatus(
          `Generated ${(data.employees || []).length} employee report rows.`,
        );
      }
    } catch (error) {
      setReportStatus(
        error instanceof Error ? error.message : "Report failed.",
      );
    } finally {
      setReportLoading(false);
    }
  };

  const saveSalesReport = async () => {
    setSalesActionStatus(null);
    const date = parseDateInputToIso(salesDate);
    if (!date) {
      setSalesActionStatus("Report date is required in MM/DD/YYYY format.");
      return;
    }
    const foodSales = parseMoneyInput(salesFood);
    const liquorSales = parseMoneyInput(salesLiquor);
    const cashPayments = parseMoneyInput(salesCash);
    if (foodSales === null || liquorSales === null || cashPayments === null) {
      setSalesActionStatus(
        "Food sales, liquor sales, and cash payments must be non-negative numbers.",
      );
      return;
    }

    setSalesSaveLoading(true);
    try {
      await fetchJson("/reports/sales", {
        method: "POST",
        body: JSON.stringify({
          date,
          foodSales,
          liquorSales,
          cashPayments,
          bankDepositBatch: salesBatch.trim() || undefined,
          checkPayments: 0,
          creditCardPayments: 0,
          otherPayments: 0,
          notes: salesNotes.trim() || undefined,
        }),
      });
      setSalesActionStatus("Daily sales report saved.");
    } catch (error) {
      setSalesActionStatus(
        error instanceof Error
          ? error.message
          : "Unable to save daily sales report.",
      );
    } finally {
      setSalesSaveLoading(false);
    }
  };

  const captureSalesExpenseReceipt = async () => {
    setSalesActionStatus(null);
    setSalesExpenseReceiptLoading(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setSalesActionStatus(
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
      const fallbackMimeType = asset.uri.toLowerCase().endsWith(".png")
        ? "image/png"
        : "image/jpeg";
      const mimeType = asset.mimeType || fallbackMimeType;
      const extension = mimeType.includes("png") ? "png" : "jpg";
      const fileName =
        asset.fileName?.trim() || `expense-receipt-${Date.now()}.${extension}`;

      setSalesExpenseReceipt({
        uri: asset.uri,
        mimeType,
        fileName,
      });
      setSalesActionStatus("Receipt photo attached.");
    } catch (error) {
      setSalesActionStatus(
        error instanceof Error ? error.message : "Unable to open the camera.",
      );
    } finally {
      setSalesExpenseReceiptLoading(false);
    }
  };

  const saveSalesExpense = async () => {
    setSalesActionStatus(null);
    const date = parseDateInputToIso(todayExpenseDate);
    if (!date) {
      setSalesActionStatus("Unable to resolve today date.");
      return;
    }
    if (!salesExpenseCompany.trim()) {
      setSalesActionStatus("Company name is required.");
      return;
    }
    if (!salesExpenseInvoice.trim()) {
      setSalesActionStatus("Invoice number is required.");
      return;
    }
    const amount = parseMoneyInput(salesExpenseAmount);
    if (amount === null) {
      setSalesActionStatus("Expense amount must be a non-negative number.");
      return;
    }
    if (salesExpenseMethod === "CHECK") {
      if (!salesExpenseCheckNumber.trim()) {
        setSalesActionStatus("Check number is required for check expenses.");
        return;
      }
      if (!salesExpensePayToCompany.trim()) {
        setSalesActionStatus("Pay-to company is required for check expenses.");
        return;
      }
    }

    setSalesExpenseSaveLoading(true);
    try {
      const created = (await fetchJson("/reports/sales/expenses", {
        method: "POST",
        body: JSON.stringify({
          date,
          companyName: salesExpenseCompany.trim(),
          invoiceNumber: salesExpenseInvoice.trim(),
          paymentMethod: salesExpenseMethod,
          amount,
          checkNumber:
            salesExpenseMethod === "CHECK"
              ? salesExpenseCheckNumber.trim()
              : undefined,
          payToCompany:
            salesExpenseMethod === "CHECK"
              ? salesExpensePayToCompany.trim()
              : undefined,
          notes: salesExpenseNotes.trim() || undefined,
        }),
      })) as { expense?: { id?: string } };

      if (salesExpenseReceipt?.uri) {
        const expenseId = created.expense?.id;
        if (!expenseId) {
          throw new Error("Expense saved, but receipt upload could not start.");
        }
        const form = new FormData();
        form.append("file", {
          uri: salesExpenseReceipt.uri,
          name: salesExpenseReceipt.fileName,
          type: salesExpenseReceipt.mimeType,
        } as any);
        await fetchJson(`/reports/sales/expenses/${expenseId}/receipt`, {
          method: "POST",
          body: form,
        });
      }

      setSalesActionStatus(
        salesExpenseReceipt
          ? "Daily expense and receipt saved."
          : "Daily expense saved.",
      );
      setSalesExpenseCompany("");
      setSalesExpenseInvoice("");
      setSalesExpenseAmount("0");
      setSalesExpenseCheckNumber("");
      setSalesExpensePayToCompany("");
      setSalesExpenseNotes("");
      setSalesExpenseMethod("CHECK");
      setSalesExpenseReceipt(null);
    } catch (error) {
      setSalesActionStatus(
        error instanceof Error
          ? error.message
          : "Unable to save daily expense.",
      );
    } finally {
      setSalesExpenseSaveLoading(false);
    }
  };

  const employeePunchStatus = useMemo(() => {
    const statusById = new Map<string, string>();
    activeNow.forEach((row) => {
      statusById.set(row.id, row.status.toUpperCase());
    });
    return statusById;
  }, [activeNow]);

  const managerProfile = useMemo(() => {
    if (!sessionManagerEmployeeId) {
      return null;
    }
    return (
      employees.find((employee) => employee.id === sessionManagerEmployeeId) ||
      null
    );
  }, [employees, sessionManagerEmployeeId]);

  const managerPunchRow = useMemo(() => {
    if (!sessionManagerEmployeeId) {
      return null;
    }
    return (
      recentPunchRows.find((row) => row.id === sessionManagerEmployeeId) || null
    );
  }, [recentPunchRows, sessionManagerEmployeeId]);

  const managerCurrentPunchStatus = managerPunchRow?.status || "OUT";
  const managerCanClockOut = ["IN", "BREAK", "LUNCH"].includes(
    managerCurrentPunchStatus,
  );
  const managerNextPunchType: "IN" | "OUT" = managerCanClockOut ? "OUT" : "IN";
  const managerActionLabel = managerCanClockOut ? "Clock Out" : "Clock In";

  const buildTodayScheduleFromLegacyEndpoints = async () => {
    const today = new Date();
    const weekday = today.getDay();
    const weekdayLabel = weekDays[weekday] || "Unknown";
    const date = `${today.getFullYear()}-${padDatePart(today.getMonth() + 1)}-${padDatePart(today.getDate())}`;
    const timezone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";

    const scopedEmployees =
      employees.length > 0
        ? employees
        : (
            (await fetchJson(appendOfficeScope("/employees"))) as {
              employees?: Employee[];
            }
          ).employees || [];

    const activeEmployees = scopedEmployees.filter(
      (employee) => employee.active,
    );
    if (activeEmployees.length === 0) {
      return {
        date,
        weekday,
        weekdayLabel,
        timezone,
        rows: [],
      } satisfies TodayScheduleResponse;
    }

    const officeNameById = new Map(
      offices.map((office) => [office.id, office.name]),
    );
    const groupNameById = new Map(
      groups.map((group) => [group.id, group.name]),
    );

    const dayRows = await Promise.all(
      activeEmployees.map(async (employee) => {
        try {
          const data = (await fetchJson(
            `/employee-schedules/${employee.id}`,
          )) as {
            days?: ScheduleDay[];
          };
          const days = Array.isArray(data.days) ? data.days : [];
          const day = days.find(
            (item) => item.weekday === weekday && item.enabled,
          );
          if (!day) {
            return null;
          }

          const groupName = employee.groupId
            ? groupNameById.get(employee.groupId) || null
            : null;
          const roleLabel = employee.isServer
            ? "Servers"
            : groupName || "Unassigned";
          const officeName = employee.officeId
            ? officeNameById.get(employee.officeId) || null
            : null;

          return {
            employeeId: employee.id,
            employeeName: employee.name,
            startTime: day.startTime || "",
            endTime: day.endTime || "",
            isServer: Boolean(employee.isServer),
            officeName,
            groupName,
            roleLabel,
          } satisfies TodayScheduleRow;
        } catch {
          return null;
        }
      }),
    );

    const rows = dayRows
      .filter((row): row is TodayScheduleRow => Boolean(row))
      .sort((a, b) => {
        const aHasStart = Boolean(a.startTime);
        const bHasStart = Boolean(b.startTime);
        if (aHasStart && bHasStart) {
          const byStart = a.startTime.localeCompare(b.startTime);
          if (byStart !== 0) {
            return byStart;
          }
        } else if (aHasStart !== bHasStart) {
          return aHasStart ? -1 : 1;
        }
        return a.employeeName.localeCompare(b.employeeName);
      });

    return {
      date,
      weekday,
      weekdayLabel,
      timezone,
      rows,
    } satisfies TodayScheduleResponse;
  };

  const loadTodaySchedule = async () => {
    setTodayScheduleLoading(true);
    setTodayScheduleStatus(null);
    try {
      const data = (await fetchJson(
        appendOfficeScope("/employee-schedules/today"),
      )) as Partial<TodayScheduleResponse>;
      const rows = Array.isArray(data.rows)
        ? data.rows
            .map((row) => {
              if (!row || typeof row !== "object") {
                return null;
              }
              const candidate = row as Partial<TodayScheduleRow>;
              if (
                typeof candidate.employeeId !== "string" ||
                typeof candidate.employeeName !== "string"
              ) {
                return null;
              }
              return {
                employeeId: candidate.employeeId,
                employeeName: candidate.employeeName,
                startTime:
                  typeof candidate.startTime === "string"
                    ? candidate.startTime
                    : "",
                endTime:
                  typeof candidate.endTime === "string"
                    ? candidate.endTime
                    : "",
                isServer: Boolean(candidate.isServer),
                officeName:
                  typeof candidate.officeName === "string"
                    ? candidate.officeName
                    : null,
                groupName:
                  typeof candidate.groupName === "string"
                    ? candidate.groupName
                    : null,
                roleLabel:
                  typeof candidate.roleLabel === "string" &&
                  candidate.roleLabel.trim()
                    ? candidate.roleLabel
                    : "Unassigned",
              } satisfies TodayScheduleRow;
            })
            .filter((row): row is TodayScheduleRow => Boolean(row))
        : [];
      setTodaySchedule({
        date: typeof data.date === "string" ? data.date : "",
        weekday: typeof data.weekday === "number" ? data.weekday : 0,
        weekdayLabel:
          typeof data.weekdayLabel === "string" ? data.weekdayLabel : "",
        timezone: typeof data.timezone === "string" ? data.timezone : "UTC",
        rows,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to load today's schedule.";
      const shouldUseLegacyFallback =
        message.toLowerCase().includes("employee not found") ||
        message.includes("(404)");

      if (shouldUseLegacyFallback) {
        try {
          const fallback = await buildTodayScheduleFromLegacyEndpoints();
          setTodaySchedule(fallback);
          setTodayScheduleStatus(null);
          return;
        } catch {
          // fall through to original error below
        }
      }

      setTodaySchedule(null);
      setTodayScheduleStatus(message);
    } finally {
      setTodayScheduleLoading(false);
    }
  };

  const loadCompanyOrderCatalog = async () => {
    setCompanyOrderLoading(true);
    setCompanyOrderStatus(null);
    try {
      const data = (await fetchJson("/company-orders/catalog")) as {
        suppliers?: CompanyOrderCatalogSupplier[];
      };
      const suppliers = Array.isArray(data.suppliers) ? data.suppliers : [];
      setCompanyOrderCatalog(suppliers);
      setCompanyOrderSupplier((previous) => {
        if (
          previous &&
          suppliers.some((supplier) => supplier.supplierName === previous)
        ) {
          return previous;
        }
        return suppliers[0]?.supplierName || "";
      });
    } catch (error) {
      setCompanyOrderStatus(
        error instanceof Error
          ? error.message
          : "Unable to load company catalog.",
      );
    } finally {
      setCompanyOrderLoading(false);
    }
  };

  const loadCompanyOrders = async () => {
    setCompanyOrderLoading(true);
    setCompanyOrderStatus(null);
    try {
      const query = new URLSearchParams();
      query.set("limit", "40");
      if (companyOrdersOfficeId) {
        query.set("officeId", companyOrdersOfficeId);
      }
      const data = (await fetchJson(
        `/company-orders?${query.toString()}`,
      )) as { orders?: CompanyOrderRow[] };
      const orders = Array.isArray(data.orders) ? data.orders : [];
      setCompanyOrderRows(orders);
      if (orders[0]?.weekStartDate) {
        setLastSubmittedCompanyOrderWeekStart(orders[0].weekStartDate);
      }
    } catch (error) {
      setCompanyOrderRows([]);
      setCompanyOrderStatus(
        error instanceof Error
          ? error.message
          : "Unable to load company orders.",
      );
    } finally {
      setCompanyOrderLoading(false);
    }
  };

  const loadLiquorControlData = async () => {
    if (!loggedIn || !hasLiquorManagerAccess || !companyOrdersOfficeId) {
      setLiquorCatalog([]);
      setLiquorCounts([]);
      setLiquorBottleScans([]);
      setLiquorInvoiceRows([]);
      setLiquorInvoiceImageDataUrl("");
      setLiquorInvoiceImageName("");
      return;
    }
    setLiquorLoading(true);
    setLiquorStatus(null);
    try {
      const query = new URLSearchParams();
      query.set("limit", "300");
      query.set("officeId", companyOrdersOfficeId);
      const scanRequest = hasLiquorPremiumAccess
        ? (fetchJson(
            `/liquor-inventory/bottle-scans?${query.toString()}`,
          ) as Promise<{
            scans?: Array<Record<string, unknown>>;
          }>)
        : Promise.resolve({ scans: [] });
      const [catalogPayload, countPayload, scanPayload] = await Promise.all([
        fetchJson("/liquor-inventory/catalog?includeInactive=1") as Promise<{
          items?: Array<Record<string, unknown>>;
        }>,
        fetchJson(`/liquor-inventory/counts?${query.toString()}`) as Promise<{
          counts?: Array<Record<string, unknown>>;
        }>,
        scanRequest,
      ]);

      const items = Array.isArray(catalogPayload.items)
        ? catalogPayload.items
            .map((candidate) => {
              const id =
                typeof candidate.id === "string" ? candidate.id.trim() : "";
              const name =
                typeof candidate.name === "string" ? candidate.name.trim() : "";
              if (!id || !name) {
                return null;
              }
              const unitCost =
                typeof candidate.unitCost === "number" &&
                Number.isFinite(candidate.unitCost)
                  ? candidate.unitCost
                  : 0;
              return {
                id,
                name,
                brand:
                  typeof candidate.brand === "string" ? candidate.brand : null,
                supplierName:
                  typeof candidate.supplierName === "string"
                    ? candidate.supplierName
                    : null,
                sizeMl:
                  typeof candidate.sizeMl === "number" &&
                  Number.isFinite(candidate.sizeMl)
                    ? candidate.sizeMl
                    : null,
                unitCost,
                isActive:
                  typeof candidate.isActive === "boolean"
                    ? candidate.isActive
                    : true,
              } satisfies LiquorCatalogItem;
            })
            .filter((row): row is LiquorCatalogItem => Boolean(row))
        : [];

      const counts = Array.isArray(countPayload.counts)
        ? countPayload.counts
            .map((candidate) => {
              const id =
                typeof candidate.id === "string" ? candidate.id.trim() : "";
              const itemId =
                typeof candidate.itemId === "string"
                  ? candidate.itemId.trim()
                  : "";
              if (!id || !itemId) {
                return null;
              }
              const quantity =
                typeof candidate.quantity === "number" &&
                Number.isFinite(candidate.quantity)
                  ? candidate.quantity
                  : 0;
              return {
                id,
                itemId,
                countDate:
                  typeof candidate.countDate === "string"
                    ? candidate.countDate
                    : todayDateKey(),
                quantity,
                barQuantity:
                  typeof candidate.barQuantity === "number" &&
                  Number.isFinite(candidate.barQuantity)
                    ? candidate.barQuantity
                    : null,
                bodegaQuantity:
                  typeof candidate.bodegaQuantity === "number" &&
                  Number.isFinite(candidate.bodegaQuantity)
                    ? candidate.bodegaQuantity
                    : null,
              } satisfies LiquorCountRow;
            })
            .filter((row): row is LiquorCountRow => Boolean(row))
        : [];

      const scans = Array.isArray(scanPayload.scans)
        ? scanPayload.scans
            .map((candidate) => {
              const id =
                typeof candidate.id === "string" ? candidate.id.trim() : "";
              const itemId =
                typeof candidate.itemId === "string"
                  ? candidate.itemId.trim()
                  : "";
              if (!id || !itemId) {
                return null;
              }
              return {
                id,
                itemId,
                itemName:
                  typeof candidate.itemName === "string"
                    ? candidate.itemName
                    : "Item",
                containerKey:
                  typeof candidate.containerKey === "string"
                    ? candidate.containerKey
                    : null,
                fillPercent:
                  typeof candidate.fillPercent === "number" &&
                  Number.isFinite(candidate.fillPercent)
                    ? candidate.fillPercent
                    : 0,
                estimatedMl:
                  typeof candidate.estimatedMl === "number" &&
                  Number.isFinite(candidate.estimatedMl)
                    ? candidate.estimatedMl
                    : null,
                measuredAt:
                  typeof candidate.measuredAt === "string"
                    ? candidate.measuredAt
                    : new Date().toISOString(),
                createdAt:
                  typeof candidate.createdAt === "string"
                    ? candidate.createdAt
                    : new Date().toISOString(),
              } satisfies LiquorBottleScanRow;
            })
            .filter((row): row is LiquorBottleScanRow => Boolean(row))
        : [];

      setLiquorCatalog(items);
      setLiquorCounts(counts);
      setLiquorBottleScans(scans);
    } catch (error) {
      setLiquorStatus(
        error instanceof Error
          ? error.message
          : "Unable to load liquor control.",
      );
    } finally {
      setLiquorLoading(false);
    }
  };

  const updateLiquorSheetDraft = (
    itemId: string,
    field: keyof LiquorSheetDraft,
    value: string,
  ) => {
    setLiquorSheetDrafts((previous) => ({
      ...previous,
      [itemId]: {
        ...(previous[itemId] || {
          supplierName: "",
          unitCost: "",
          sizeMl: "",
          barQuantity: "",
          bodegaQuantity: "",
        }),
        [field]: value,
      },
    }));
  };

  const saveLiquorCatalogRow = async (itemId: string) => {
    if (!hasLiquorManagerAccess) {
      setLiquorStatus("Manager reports access is required for liquor control.");
      return;
    }
    const draft = liquorSheetDrafts[itemId];
    if (!draft) {
      return;
    }
    const unitCost = Number(draft.unitCost);
    const sizeMlRaw = draft.sizeMl.trim();
    const sizeMl = sizeMlRaw ? Number(sizeMlRaw) : undefined;
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      setLiquorStatus("Price must be zero or greater.");
      return;
    }
    if (
      sizeMlRaw &&
      (sizeMl === undefined || !Number.isFinite(sizeMl) || sizeMl <= 0)
    ) {
      setLiquorStatus("Qty/ML must be greater than zero.");
      return;
    }

    setLiquorSavingItemId(itemId);
    try {
      await fetchJson(`/liquor-inventory/catalog/${itemId}`, {
        method: "PUT",
        body: JSON.stringify({
          supplierName: draft.supplierName.trim() || undefined,
          unitCost,
          sizeMl,
        }),
      });
      setLiquorStatus("Liquor catalog row saved.");
      await loadLiquorControlData();
    } catch (error) {
      setLiquorStatus(
        error instanceof Error
          ? error.message
          : "Unable to save liquor catalog row.",
      );
    } finally {
      setLiquorSavingItemId(null);
    }
  };

  const saveLiquorCountRow = async (itemId: string) => {
    if (!hasLiquorManagerAccess) {
      setLiquorStatus("Manager reports access is required for liquor control.");
      return;
    }
    if (!companyOrdersOfficeId) {
      setLiquorStatus("Select a location before saving liquor inventory.");
      return;
    }
    const draft = liquorSheetDrafts[itemId];
    if (!draft) {
      return;
    }
    const barQuantity = draft.barQuantity.trim() ? Number(draft.barQuantity) : 0;
    const bodegaQuantity = draft.bodegaQuantity.trim()
      ? Number(draft.bodegaQuantity)
      : 0;
    if (!Number.isFinite(barQuantity) || barQuantity < 0) {
      setLiquorStatus("Bar quantity must be zero or greater.");
      return;
    }
    if (!Number.isFinite(bodegaQuantity) || bodegaQuantity < 0) {
      setLiquorStatus("Bodega quantity must be zero or greater.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(liquorCountDate.trim())) {
      setLiquorStatus("Count date must use YYYY-MM-DD format.");
      return;
    }

    setLiquorSavingCountItemId(itemId);
    try {
      await fetchJson("/liquor-inventory/counts", {
        method: "POST",
        body: JSON.stringify({
          itemId,
          officeId: companyOrdersOfficeId,
          countDate: liquorCountDate.trim(),
          quantity: Number((barQuantity + bodegaQuantity).toFixed(3)),
          barQuantity,
          bodegaQuantity,
        }),
      });
      setLiquorStatus("Liquor inventory row saved.");
      await loadLiquorControlData();
    } catch (error) {
      setLiquorStatus(
        error instanceof Error
          ? error.message
          : "Unable to save liquor inventory row.",
      );
    } finally {
      setLiquorSavingCountItemId(null);
    }
  };

  const analyzeLiquorBottleForItem = async (itemId: string) => {
    if (!hasLiquorManagerAccess) {
      setLiquorStatus("Manager reports access is required for liquor control.");
      return;
    }
    if (!hasLiquorPremiumAccess) {
      setLiquorStatus("Premium liquor features are disabled for this tenant.");
      return;
    }
    if (!companyOrdersOfficeId) {
      setLiquorStatus("Select a location before bottle scan.");
      return;
    }
    setLiquorAnalyzingItemId(itemId);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setLiquorStatus("Camera permission is required for bottle scan.");
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
      const fallbackMimeType = asset.uri.toLowerCase().endsWith(".png")
        ? "image/png"
        : "image/jpeg";
      const mimeType = asset.mimeType || fallbackMimeType;
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const imageDataUrl = `data:${mimeType};base64,${base64}`;

      const payload = (await fetchJson("/liquor-inventory/bottle-scans/analyze", {
        method: "POST",
        body: JSON.stringify({
          itemId,
          officeId: companyOrdersOfficeId,
          measuredAt: new Date().toISOString(),
          containerKey: liquorScanContainerKey.trim() || undefined,
          imageDataUrl,
        }),
      })) as {
        analysis?: { fillPercent?: number };
        comparison?: { spentMlClamped?: number | null };
      };

      const fillPercent =
        typeof payload.analysis?.fillPercent === "number"
          ? payload.analysis.fillPercent.toFixed(1)
          : "n/a";
      const spentMl =
        typeof payload.comparison?.spentMlClamped === "number"
          ? payload.comparison.spentMlClamped.toFixed(1)
          : "n/a";
      setLiquorStatus(`Bottle scan saved. Fill ${fillPercent}% • Spent ${spentMl} ml.`);
      await loadLiquorControlData();
    } catch (error) {
      setLiquorStatus(
        error instanceof Error
          ? error.message
          : "Unable to analyze bottle photo.",
      );
    } finally {
      setLiquorAnalyzingItemId(null);
    }
  };

  const normalizeLiquorInvoiceRows = (
    rows: Array<Record<string, unknown>>,
  ): LiquorInvoiceExtractedRow[] =>
    rows
      .map((candidate, index) => {
        const liquorName =
          typeof candidate.liquorName === "string"
            ? candidate.liquorName.trim()
            : "";
        if (!liquorName) {
          return null;
        }
        const matchedItem =
          candidate.matchedItem && typeof candidate.matchedItem === "object"
            ? (candidate.matchedItem as Record<string, unknown>)
            : null;
        const costShock =
          candidate.costShock && typeof candidate.costShock === "object"
            ? (candidate.costShock as Record<string, unknown>)
            : null;
        const costShockSeverity =
          typeof costShock?.severity === "string" &&
          (costShock.severity === "normal" ||
            costShock.severity === "elevated" ||
            costShock.severity === "critical")
            ? costShock.severity
            : "normal";
        const costShockDeltaPct =
          typeof costShock?.deltaPct === "number" &&
          Number.isFinite(costShock.deltaPct)
            ? costShock.deltaPct
            : null;
        return {
          rowNumber:
            typeof candidate.rowNumber === "number" &&
            Number.isFinite(candidate.rowNumber)
              ? candidate.rowNumber
              : index + 1,
          company:
            typeof candidate.company === "string" ? candidate.company.trim() : null,
          liquorName,
          kind: typeof candidate.kind === "string" ? candidate.kind.trim() : null,
          upc: typeof candidate.upc === "string" ? candidate.upc.trim() : null,
          ml:
            typeof candidate.ml === "number" && Number.isFinite(candidate.ml)
              ? candidate.ml
              : null,
          unitCost:
            typeof candidate.unitCost === "number" &&
            Number.isFinite(candidate.unitCost)
              ? candidate.unitCost
              : null,
          quantity:
            typeof candidate.quantity === "number" &&
            Number.isFinite(candidate.quantity)
              ? candidate.quantity
              : null,
          matchedItemId:
            matchedItem && typeof matchedItem.id === "string"
              ? matchedItem.id.trim()
              : null,
          matchedItemName:
            matchedItem && typeof matchedItem.name === "string"
              ? matchedItem.name.trim()
              : null,
          suggestedAction:
            candidate.suggestedAction === "update" ? "update" : "create",
          costShockDeltaPct,
          costShockSeverity,
          costShockFlag: Boolean(costShock?.isShock),
        } satisfies LiquorInvoiceExtractedRow;
      })
      .filter((row): row is LiquorInvoiceExtractedRow => Boolean(row));

  const pickLiquorInvoicePhoto = async () => {
    if (!hasLiquorManagerAccess) {
      setLiquorStatus("Manager reports access is required for liquor control.");
      return;
    }
    if (!hasLiquorPremiumAccess) {
      setLiquorStatus("Premium liquor features are disabled for this tenant.");
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setLiquorStatus("Photo library permission is required for invoice OCR.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.75,
    });
    if (result.canceled || !result.assets.length) {
      return;
    }
    const asset = result.assets[0];
    const fallbackMimeType = asset.uri.toLowerCase().endsWith(".png")
      ? "image/png"
      : "image/jpeg";
    const mimeType = asset.mimeType || fallbackMimeType;
    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    setLiquorInvoiceImageDataUrl(`data:${mimeType};base64,${base64}`);
    setLiquorInvoiceImageName(
      asset.fileName ||
        asset.uri.split("/").pop() ||
        `invoice-${new Date().toISOString().slice(0, 10)}`,
    );
  };

  const analyzeLiquorInvoicePhoto = async () => {
    if (!hasLiquorManagerAccess) {
      setLiquorStatus("Manager reports access is required for liquor control.");
      return;
    }
    if (!hasLiquorPremiumAccess) {
      setLiquorStatus("Premium liquor features are disabled for this tenant.");
      return;
    }
    if (!companyOrdersOfficeId) {
      setLiquorStatus("Select a location before invoice OCR.");
      return;
    }
    if (!liquorInvoiceImageDataUrl) {
      setLiquorStatus("Select an invoice photo first.");
      return;
    }
    setLiquorInvoiceAnalyzing(true);
    try {
      const payload = (await fetchJson("/liquor-inventory/invoices/analyze", {
        method: "POST",
        body: JSON.stringify({
          officeId: companyOrdersOfficeId,
          invoiceDate: liquorInvoiceDate.trim() || undefined,
          invoiceNumber: liquorInvoiceNumber.trim() || undefined,
          supplierName: liquorInvoiceSupplier.trim() || undefined,
          notes: liquorInvoiceNotes.trim() || undefined,
          imageDataUrl: liquorInvoiceImageDataUrl,
        }),
      })) as LiquorInvoiceAnalyzeResponse;

      const rows = Array.isArray(payload.rows)
        ? normalizeLiquorInvoiceRows(payload.rows)
        : [];
      setLiquorInvoiceRows(rows);
      setLiquorInvoiceImageDataUrl("");
      setLiquorInvoiceImageName("");
      const extractedCount =
        typeof payload.analysis?.totalExtractedRows === "number" &&
        Number.isFinite(payload.analysis.totalExtractedRows)
          ? payload.analysis.totalExtractedRows
          : rows.length;
      setLiquorStatus(`Invoice analyzed. ${extractedCount} rows extracted.`);
    } catch (error) {
      setLiquorStatus(
        error instanceof Error ? error.message : "Unable to analyze invoice photo.",
      );
    } finally {
      setLiquorInvoiceAnalyzing(false);
    }
  };

  const applyLiquorInvoiceRows = async () => {
    if (!hasLiquorManagerAccess) {
      setLiquorStatus("Manager reports access is required for liquor control.");
      return;
    }
    if (!hasLiquorPremiumAccess) {
      setLiquorStatus("Premium liquor features are disabled for this tenant.");
      return;
    }
    if (!companyOrdersOfficeId) {
      setLiquorStatus("Select a location before invoice OCR.");
      return;
    }
    if (liquorInvoiceRows.length === 0) {
      setLiquorStatus("Analyze an invoice with at least one row before applying.");
      return;
    }
    setLiquorInvoiceApplying(true);
    try {
      await fetchJson("/liquor-inventory/invoices/apply", {
        method: "POST",
        body: JSON.stringify({
          officeId: companyOrdersOfficeId,
          invoiceDate: liquorInvoiceDate.trim() || undefined,
          invoiceNumber: liquorInvoiceNumber.trim() || undefined,
          supplierName: liquorInvoiceSupplier.trim() || undefined,
          notes: liquorInvoiceNotes.trim() || undefined,
          createPurchaseMovements: liquorInvoiceIncludePurchases,
          rows: liquorInvoiceRows.map((row) => ({
            existingItemId: row.matchedItemId || undefined,
            apply: true,
            company: row.company || undefined,
            liquorName: row.liquorName,
            kind: row.kind || undefined,
            upc: row.upc || undefined,
            ml: row.ml ?? undefined,
            unitCost: row.unitCost ?? undefined,
            quantity: row.quantity ?? undefined,
          })),
        }),
      });
      setLiquorInvoiceRows([]);
      setLiquorStatus("Invoice rows applied.");
      await loadLiquorControlData();
    } catch (error) {
      setLiquorStatus(
        error instanceof Error ? error.message : "Unable to apply invoice rows.",
      );
    } finally {
      setLiquorInvoiceApplying(false);
    }
  };

  const setCompanyOrderDraftQuantity = (
    supplierName: string,
    key: string,
    rawValue: string,
  ) => {
    const value = normalizeCompanyOrderQuantityInput(rawValue);
    setCompanyOrderDrafts((prev) => {
      const supplierDraft = prev[supplierName] || {};
      if (!value) {
        if (!(key in supplierDraft)) {
          return prev;
        }
        const nextSupplierDraft = { ...supplierDraft };
        delete nextSupplierDraft[key];
        const next = { ...prev };
        if (Object.keys(nextSupplierDraft).length === 0) {
          delete next[supplierName];
        } else {
          next[supplierName] = nextSupplierDraft;
        }
        return next;
      }
      if (supplierDraft[key] === value) {
        return prev;
      }
      return {
        ...prev,
        [supplierName]: {
          ...supplierDraft,
          [key]: value,
        },
      };
    });
  };

  const handleCompanyOrderAddItem = (item: CompanyOrderCatalogItem) => {
    if (!selectedCompanyOrderSupplier) {
      return;
    }
    const supplierName = selectedCompanyOrderSupplier.supplierName;
    const key = companyOrderItemKey(item.nameEs, item.nameEn);
    const current = Number(selectedCompanySupplierDraft[key] || "0");
    const next = Number.isFinite(current) && current > 0 ? current + 1 : 1;
    setCompanyOrderDraftQuantity(supplierName, key, String(next));
  };

  const handleCompanyOrderStepItem = (
    supplierName: string,
    key: string,
    delta: number,
  ) => {
    const current = Number((companyOrderDrafts[supplierName] || {})[key] || "0");
    const next = Number((current + delta).toFixed(2));
    if (!Number.isFinite(next) || next <= 0) {
      setCompanyOrderDraftQuantity(supplierName, key, "");
      return;
    }
    setCompanyOrderDraftQuantity(supplierName, key, String(next));
  };

  const handleCompanyOrderRemoveItem = (supplierName: string, key: string) => {
    setCompanyOrderDraftQuantity(supplierName, key, "");
  };

  const submitCompanyOrder = async () => {
    setCompanyOrderStatus(null);
    const payloadBySupplier = new Map<
      string,
      Array<{ nameEs: string; nameEn: string; quantity: number }>
    >();
    companyOrderCartItems.forEach((item) => {
      const supplierItems = payloadBySupplier.get(item.supplierName) || [];
      supplierItems.push({
        nameEs: item.nameEs,
        nameEn: item.nameEn,
        quantity: item.quantity,
      });
      payloadBySupplier.set(item.supplierName, supplierItems);
    });
    const supplierPayloads = Array.from(payloadBySupplier.entries()).map(
      ([supplierName, items]) => ({ supplierName, items }),
    );

    if (supplierPayloads.length === 0) {
      setCompanyOrderStatus("Enter at least one item quantity.");
      return;
    }

    setCompanyOrderSaving(true);
    try {
      let weekStartDate = lastSubmittedCompanyOrderWeekStart;
      for (const payload of supplierPayloads) {
        const createdOrder = (await fetchJson("/company-orders", {
          method: "POST",
          body: JSON.stringify({
            supplierName: payload.supplierName,
            officeId: companyOrdersOfficeId || undefined,
            notes: companyOrderNotes.trim() || undefined,
            items: payload.items,
          }),
        })) as { weekStartDate?: string };
        if (typeof createdOrder.weekStartDate === "string") {
          weekStartDate = createdOrder.weekStartDate;
        }
      }
      setLastSubmittedCompanyOrderWeekStart(weekStartDate);
      setCompanyOrderStatus(
        `Company order submitted for ${supplierPayloads.length} suppliers.`,
      );
      setCompanyOrderDrafts({});
      setCompanyOrderNotes("");
      setCompanyOrderSearch("");
      await loadCompanyOrders();
    } catch (error) {
      setCompanyOrderStatus(
        error instanceof Error ? error.message : "Unable to submit order.",
      );
    } finally {
      setCompanyOrderSaving(false);
    }
  };

  const handleCompanyOrderExport = async (format: "pdf" | "csv" | "excel") => {
    setCompanyOrderExportingFormat(format);
    try {
      const weekStartDate =
        lastSubmittedCompanyOrderWeekStart || getCurrentWeekStartDateKey();
      const ok = await fetchCompanyOrderExport(format, weekStartDate);
      if (ok) {
        setCompanyOrderStatus(
          `${format.toUpperCase()} ready for week ${weekStartDate}.`,
        );
      } else {
        setCompanyOrderStatus("Unable to export company order.");
      }
    } catch (error) {
      setCompanyOrderStatus(
        error instanceof Error ? error.message : "Unable to export company order.",
      );
    } finally {
      setCompanyOrderExportingFormat(null);
    }
  };

  const loadSchedule = async (employeeId: string) => {
    try {
      const data = (await fetchJson(`/employee-schedules/${employeeId}`)) as {
        days?: ScheduleDay[];
      };
      if (data.days && data.days.length === 7) {
        setScheduleDays(data.days);
      } else {
        setScheduleDays(defaultScheduleDays());
      }
    } catch {
      setScheduleDays(defaultScheduleDays());
    }
  };

  const updateScheduleDay = (
    weekday: number,
    key: keyof ScheduleDay,
    value: string | boolean,
  ) => {
    setScheduleDays((prev) =>
      prev.map((day) => {
        if (day.weekday !== weekday) return day;
        if (key === "enabled") {
          const enabled = Boolean(value);
          if (!enabled) {
            return { ...day, enabled, startTime: "", endTime: "" };
          }
          return {
            ...day,
            enabled,
            startTime: day.startTime || "09:00",
            endTime: day.endTime || "17:00",
          };
        }
        return { ...day, [key]: value };
      }),
    );
  };

  const adjustScheduleTime = (
    weekday: number,
    key: ScheduleTimeKey,
    part: "hour" | "minute" | "meridiem",
    direction: 1 | -1 = 1,
  ) => {
    setScheduleDays((prev) =>
      prev.map((day) => {
        if (day.weekday !== weekday) {
          return day;
        }
        const current = parseScheduleTimeParts(day[key] || "");
        if (part === "hour") {
          const nextHour = current.hour + direction;
          current.hour = nextHour > 12 ? 1 : nextHour < 1 ? 12 : nextHour;
        } else if (part === "minute") {
          const nextMinute = current.minute + direction * 5;
          if (nextMinute >= 60) {
            current.minute = 0;
          } else if (nextMinute < 0) {
            current.minute = 55;
          } else {
            current.minute = nextMinute;
          }
        } else {
          current.meridiem = current.meridiem === "AM" ? "PM" : "AM";
        }

        return { ...day, [key]: toTwentyFourHourTime(current) };
      }),
    );
  };

  const setScheduleMeridiem = (
    weekday: number,
    key: ScheduleTimeKey,
    meridiem: Meridiem,
  ) => {
    setScheduleDays((prev) =>
      prev.map((day) => {
        if (day.weekday !== weekday) {
          return day;
        }
        const current = parseScheduleTimeParts(day[key] || "");
        if (current.meridiem === meridiem) {
          return day;
        }
        return {
          ...day,
          [key]: toTwentyFourHourTime({ ...current, meridiem }),
        };
      }),
    );
  };

  const saveSchedule = async () => {
    if (!scheduleEmployeeId) {
      setScheduleStatus("Select an employee first.");
      return;
    }
    setScheduleStatus(null);
    try {
      const normalizedDays = scheduleDays
        .filter((day) => day.enabled)
        .map((day) => ({
          weekday: day.weekday,
          enabled: true,
          ...(sanitizeTime(day.startTime)
            ? { startTime: sanitizeTime(day.startTime) }
            : {}),
          ...(sanitizeTime(day.endTime)
            ? { endTime: sanitizeTime(day.endTime) }
            : {}),
        }));
      await fetchJson(`/employee-schedules/${scheduleEmployeeId}`, {
        method: "PUT",
        body: JSON.stringify({ days: normalizedDays }),
      });
      setScheduleStatus("Schedule saved.");
      void loadTodaySchedule();
    } catch (error) {
      setScheduleStatus(
        error instanceof Error ? error.message : "Unable to save schedule.",
      );
    }
  };

  const handleSubmitManagerPendingTips = async () => {
    if (!sessionManagerEmployeeId || !managerPendingTipWorkDate) {
      return;
    }

    const cash = Number.parseFloat(managerCashTips || "0");
    const credit = Number.parseFloat(managerCreditCardTips || "0");
    if (
      !Number.isFinite(cash) ||
      cash < 0 ||
      !Number.isFinite(credit) ||
      credit < 0
    ) {
      setManagerPunchStatus("Tips must be valid non-negative amounts.");
      return;
    }

    setManagerTipSaving(true);
    setManagerPunchStatus(null);
    try {
      await fetchJson(`/employee-tips/${sessionManagerEmployeeId}`, {
        method: "POST",
        body: JSON.stringify({
          cashTips: cash,
          creditCardTips: credit,
          workDate: managerPendingTipWorkDate,
        }),
      });
      const submittedDate = managerPendingTipWorkDate;
      setManagerPendingTipWorkDate(null);
      setManagerCashTips("0");
      setManagerCreditCardTips("0");
      setManagerPunchStatus(
        `Tips saved for ${submittedDate}. You can clock in now.`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save tips.";
      if (message.toLowerCase().includes("already submitted")) {
        const submittedDate = managerPendingTipWorkDate;
        setManagerPendingTipWorkDate(null);
        setManagerCashTips("0");
        setManagerCreditCardTips("0");
        setManagerPunchStatus(
          `Tips already submitted for ${submittedDate}. You can clock in now.`,
        );
      } else {
        setManagerPunchStatus(message);
      }
    } finally {
      setManagerTipSaving(false);
    }
  };

  const handleManagerSelfPunch = async () => {
    if (!sessionManagerEmployeeId) {
      return;
    }
    if (managerClockExempt) {
      setManagerPunchStatus(
        "Owner privilege is active. Clock in/out is not required.",
      );
      return;
    }
    if (managerNextPunchType === "IN" && managerPendingTipWorkDate) {
      setManagerPunchStatus(
        `Submit tips for ${managerPendingTipWorkDate} before clocking in.`,
      );
      return;
    }

    setManagerPunchLoading(true);
    setManagerPunchStatus(null);
    try {
      const pinValue = managerPin.trim();
      await fetchJson(`/employee-punches/${sessionManagerEmployeeId}`, {
        method: "POST",
        body: JSON.stringify({
          type: managerNextPunchType,
          pin: pinValue || undefined,
          notes:
            managerNextPunchType === "OUT"
              ? "Manager self clock-out"
              : "Manager self clock-in",
        }),
      });

      if (managerNextPunchType === "IN") {
        setManagerPendingTipWorkDate(null);
      }
      setManagerPin("");
      setManagerPunchStatus(
        managerNextPunchType === "OUT"
          ? "You are clocked out."
          : "You are clocked in.",
      );
      await loadActiveNow();
      await loadNotifications();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to record your punch.";
      const pendingDate = extractPendingTipsWorkDate(message);
      if (pendingDate) {
        setManagerPendingTipWorkDate(pendingDate);
        setManagerPunchStatus(
          `Submit tips for ${pendingDate} before clocking in.`,
        );
      } else {
        setManagerPunchStatus(message);
      }
    } finally {
      setManagerPunchLoading(false);
    }
  };

  const handleForcePunch = async (employeeId: string, type: "IN" | "OUT") => {
    setPunchStatus(null);
    setPunchLoadingId(employeeId);
    try {
      await fetchJson("/employee-punches/records", {
        method: "POST",
        body: JSON.stringify({
          employeeId,
          type,
          occurredAt: new Date().toISOString(),
          notes: type === "OUT" ? "Admin clock-out" : "Admin clock-in",
        }),
      });
      setPunchStatus(
        type === "OUT" ? "Employee clocked out." : "Employee clocked in.",
      );
      await loadActiveNow();
      await loadNotifications();
    } catch (error) {
      setPunchStatus(
        error instanceof Error
          ? error.message
          : "Unable to clock out employee.",
      );
    } finally {
      setPunchLoadingId(null);
    }
  };

  const text = copy[language] ?? copy.en;
  const inline = useCallback(
    (message: string) => {
      if (language !== "es") {
        return message;
      }

      const submitTipsMatch = /^Submit tips for (.+) before clocking in\.$/.exec(
        message,
      );
      if (submitTipsMatch) {
        return `Envía propinas del ${submitTipsMatch[1]} antes de marcar entrada.`;
      }

      const pendingTipsMatch = /^Pending tips for (.+)\.$/.exec(message);
      if (pendingTipsMatch) {
        return `Propinas pendientes del ${pendingTipsMatch[1]}.`;
      }

      const bottleScanMatch =
        /^Bottle scan saved\. Fill ([0-9.]+)% • Spent ([0-9.]+) ml\.$/.exec(
          message,
        );
      if (bottleScanMatch) {
        return `Escaneo de botella guardado. Nivel ${bottleScanMatch[1]}% • Consumido ${bottleScanMatch[2]} ml.`;
      }

      const invoiceAnalyzeMatch =
        /^Invoice analyzed\. ([0-9]+) rows extracted\.$/.exec(message);
      if (invoiceAnalyzeMatch) {
        return `Factura analizada. ${invoiceAnalyzeMatch[1]} filas extraídas.`;
      }

      const map: Record<string, string> = {
        "Unable to access local storage for download.":
          "No se puede acceder al almacenamiento local para la descarga.",
        "Download ready": "Descarga lista",
        "Enter tenant, username, and password.":
          "Ingresa tenant, usuario y contraseña.",
        "Select an employee.": "Selecciona un empleado.",
        "Subject is required.": "El asunto es obligatorio.",
        "Message is required.": "El mensaje es obligatorio.",
        "Clock-in override rejected.": "Anulación de entrada rechazada.",
        "Clock-in override approved.": "Anulación de entrada aprobada.",
        "Enter a full name.": "Ingresa el nombre completo.",
        "User created.": "Usuario creado.",
        "User disabled.": "Usuario deshabilitado.",
        "User enabled.": "Usuario habilitado.",
        "Loaded user for editing.": "Usuario cargado para edición.",
        "Select a user to edit.": "Selecciona un usuario para editar.",
        "Full name is required.": "El nombre completo es obligatorio.",
        "PIN must be 4 digits.": "El PIN debe tener 4 dígitos.",
        "Hourly rate must be 0 or higher.":
          "La tarifa por hora debe ser 0 o mayor.",
        "User updated.": "Usuario actualizado.",
        "Enter a location name.": "Ingresa un nombre de ubicación.",
        "Enter valid numeric geofence values.":
          "Ingresa valores numéricos válidos para la geocerca.",
        "Latitude and longitude are required together.":
          "Latitud y longitud son requeridas en conjunto.",
        "Location created. Switched to new location panel.":
          "Ubicación creada. Se cambió al panel de la nueva ubicación.",
        "Select a location first.": "Selecciona una ubicación primero.",
        "Location geofence updated.": "Geocerca de ubicación actualizada.",
        "Enter a group name.": "Ingresa un nombre de grupo.",
        "Group created.": "Grupo creado.",
        "From and To dates are required.":
          "Las fechas Desde y Hasta son obligatorias.",
        "Use MM/DD/YYYY dates.": "Usa fechas MM/DD/YYYY.",
        "Report date is required in MM/DD/YYYY format.":
          "La fecha del reporte es obligatoria en formato MM/DD/YYYY.",
        "Daily sales report saved.": "Reporte de ventas diarias guardado.",
        "Receipt photo attached.": "Foto del recibo adjunta.",
        "Unable to resolve today date.":
          "No se pudo resolver la fecha de hoy.",
        "Company name is required.": "El nombre de la empresa es obligatorio.",
        "Invoice number is required.":
          "El número de factura es obligatorio.",
        "Expense amount must be a non-negative number.":
          "El monto del gasto debe ser un número no negativo.",
        "Check number is required for check expenses.":
          "El número de cheque es obligatorio para gastos en cheque.",
        "Pay-to company is required for check expenses.":
          "La empresa beneficiaria es obligatoria para gastos en cheque.",
        "Expense saved, but receipt upload could not start.":
          "Gasto guardado, pero la carga del recibo no pudo iniciar.",
        "Daily expense and receipt saved.":
          "Gasto diario y recibo guardados.",
        "Daily expense saved.": "Gasto diario guardado.",
        "Tips must be valid non-negative amounts.":
          "Las propinas deben ser montos válidos no negativos.",
        "You are clocked out.": "Has marcado salida.",
        "You are clocked in.": "Has marcado entrada.",
        "Unable to record your punch.": "No se pudo registrar tu marcación.",
        "Employee clocked out.": "Empleado con salida registrada.",
        "Employee clocked in.": "Empleado con entrada registrada.",
        "Unable to clock out employee.":
          "No se pudo registrar la salida del empleado.",
        "Manager reports access is required for liquor control.":
          "Se requiere acceso de reportes de manager para control de licor.",
        "Select a location before saving liquor inventory.":
          "Selecciona una ubicación antes de guardar el inventario de licor.",
        "Select a location before bottle scan.":
          "Selecciona una ubicación antes de escanear botella.",
        "Price must be zero or greater.": "El precio debe ser cero o mayor.",
        "Qty/ML must be greater than zero.":
          "Cant/ML debe ser mayor que cero.",
        "Liquor catalog row saved.":
          "Fila del catálogo de licor guardada.",
        "Unable to save liquor catalog row.":
          "No se pudo guardar la fila del catálogo de licor.",
        "Bar quantity must be zero or greater.":
          "La cantidad de bar debe ser cero o mayor.",
        "Bodega quantity must be zero or greater.":
          "La cantidad de bodega debe ser cero o mayor.",
        "Count date must use YYYY-MM-DD format.":
          "La fecha de conteo debe usar formato YYYY-MM-DD.",
        "Liquor inventory row saved.":
          "Fila de inventario de licor guardada.",
        "Unable to save liquor inventory row.":
          "No se pudo guardar la fila de inventario de licor.",
        "Camera permission is required for bottle scan.":
          "Se requiere permiso de cámara para escanear botella.",
        "Unable to analyze bottle photo.":
          "No se pudo analizar la foto de la botella.",
        "Photo library permission is required for invoice OCR.":
          "Se requiere permiso de galería para OCR de factura.",
        "Select a location before invoice OCR.":
          "Selecciona una ubicación antes del OCR de factura.",
        "Select an invoice photo first.":
          "Selecciona primero una foto de factura.",
        "Analyze an invoice with at least one row before applying.":
          "Analiza una factura con al menos una fila antes de aplicar.",
        "Invoice rows applied.": "Filas de factura aplicadas.",
        "Unable to analyze invoice photo.":
          "No se pudo analizar la foto de la factura.",
        "Unable to apply invoice rows.":
          "No se pudieron aplicar las filas de factura.",
        "Premium liquor features are disabled for this tenant.":
          "Las funciones premium de licor están deshabilitadas para este tenant.",
        "Enter at least one item quantity.":
          "Ingresa al menos una cantidad de artículo.",
        "Unable to export company order.":
          "No se pudo exportar la orden de empresa.",
        "Select an employee first.": "Selecciona primero un empleado.",
        "Schedule saved.": "Horario guardado.",
        "Clock Out": "Marcar Salida",
        "Clock In": "Marcar Entrada",
        Servers: "Meseros",
        "Working...": "Procesando...",
        "Saving tips...": "Guardando propinas...",
        Approve: "Aprobar",
        Active: "Activo",
        Disabled: "Deshabilitado",
        Yes: "Sí",
        "Save Changes": "Guardar Cambios",
        Disable: "Deshabilitar",
        Enable: "Habilitar",
        "Saving...": "Guardando...",
        Current: "Actual",
        Switch: "Cambiar",
        "Generating...": "Generando...",
        "Sending...": "Enviando...",
        "Refreshing...": "Actualizando...",
        "Preparing...": "Preparando...",
        "Submitting...": "Enviando...",
        "Refresh Orders": "Actualizar Órdenes",
        "Refresh Liquor": "Actualizar Licor",
        "Save Item": "Guardar Artículo",
        "Save Count": "Guardar Conteo",
        "Scan Bottle": "Escanear Botella",
        "Invoice OCR + Cost Shock": "OCR de Facturas + Choque de Costos",
        "Invoice Date": "Fecha Factura",
        "Invoice #": "Factura #",
        Supplier: "Proveedor",
        Notes: "Notas",
        "Create purchase movements": "Crear movimientos de compra",
        "Invoice Photo": "Foto de Factura",
        "Analyze Invoice": "Analizar Factura",
        "Apply Invoice Rows": "Aplicar Filas",
        "No invoice rows extracted yet.": "Aún no hay filas de factura extraídas.",
        Match: "Coincidencia",
        Severity: "Severidad",
      };

      return map[message] || message;
    },
    [language],
  );
  const inlineOrNull = useCallback(
    (message: string | null) => (message ? inline(message) : message),
    [inline],
  );
  const todayExpenseDate = formatUsDate(new Date());
  const activeLocationLabel = useMemo(() => {
    if (!scopedLocationId) {
      return text.allLocations;
    }
    const office = offices.find((item) => item.id === scopedLocationId);
    return office?.name || text.noLocationAssigned;
  }, [offices, scopedLocationId, text.allLocations, text.noLocationAssigned]);
  const officeGeoTarget = useMemo(() => {
    if (!offices.length) {
      return null;
    }
    if (scopedLocationId) {
      return offices.find((item) => item.id === scopedLocationId) || null;
    }
    return offices[0] || null;
  }, [offices, scopedLocationId]);

  useEffect(() => {
    if (!officeGeoTarget) {
      setOfficeGeoLatitude("");
      setOfficeGeoLongitude("");
      setOfficeGeoRadius("120");
      setOfficeGeoStatus(null);
      return;
    }
    setOfficeGeoLatitude(
      officeGeoTarget.latitude !== null &&
        officeGeoTarget.latitude !== undefined
        ? String(officeGeoTarget.latitude)
        : "",
    );
    setOfficeGeoLongitude(
      officeGeoTarget.longitude !== null &&
        officeGeoTarget.longitude !== undefined
        ? String(officeGeoTarget.longitude)
        : "",
    );
    setOfficeGeoRadius(
      officeGeoTarget.geofenceRadiusMeters !== null &&
        officeGeoTarget.geofenceRadiusMeters !== undefined
        ? String(officeGeoTarget.geofenceRadiusMeters)
        : "120",
    );
    setOfficeGeoStatus(null);
  }, [
    officeGeoTarget?.id,
    officeGeoTarget?.latitude,
    officeGeoTarget?.longitude,
    officeGeoTarget?.geofenceRadiusMeters,
  ]);

  const selectedScheduleEmployee = useMemo(
    () =>
      employees.find((employee) => employee.id === scheduleEmployeeId) || null,
    [employees, scheduleEmployeeId],
  );
  const activeMessageEmployees = useMemo(
    () =>
      employees
        .filter((employee) => employee.active)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [employees],
  );
  useEffect(() => {
    if (activeMessageEmployees.length === 0) {
      setEmployeeMessageEmployeeId("");
      return;
    }
    const stillValid = activeMessageEmployees.some(
      (employee) => employee.id === employeeMessageEmployeeId,
    );
    if (!stillValid) {
      setEmployeeMessageEmployeeId(activeMessageEmployees[0].id);
    }
  }, [activeMessageEmployees, employeeMessageEmployeeId]);
  const filteredScheduleEmployees = useMemo(() => {
    const lookup = scheduleEmployeeSearch.trim().toLowerCase();
    if (!lookup) {
      return employees;
    }
    return employees.filter((employee) =>
      employee.name.toLowerCase().includes(lookup),
    );
  }, [employees, scheduleEmployeeSearch]);
  const selectedCompanyOrderSupplier = useMemo(
    () =>
      companyOrderCatalog.find(
        (supplier) => supplier.supplierName === companyOrderSupplier,
      ) || null,
    [companyOrderCatalog, companyOrderSupplier],
  );
  const filteredCompanyOrderItems = useMemo(() => {
    const source = selectedCompanyOrderSupplier?.items || [];
    const lookup = companyOrderSearch.trim().toLowerCase();
    if (!lookup) {
      return source;
    }
    return source.filter((item) => {
      const es = item.nameEs.toLowerCase();
      const en = item.nameEn.toLowerCase();
      return es.includes(lookup) || en.includes(lookup);
    });
  }, [companyOrderSearch, selectedCompanyOrderSupplier]);
  const companyOrderHasSearch = companyOrderSearch.trim().length > 0;
  const baseCompanyOrderItems = useMemo(() => {
    if (!selectedCompanyOrderSupplier) {
      return [] as CompanyOrderCatalogItem[];
    }
    if (!companyOrderShowOnlyAdded) {
      return filteredCompanyOrderItems;
    }
    const supplierDraft =
      companyOrderDrafts[selectedCompanyOrderSupplier.supplierName] || {};
    return filteredCompanyOrderItems.filter((item) => {
      const key = companyOrderItemKey(item.nameEs, item.nameEn);
      return Number(supplierDraft[key] || "0") > 0;
    });
  }, [
    companyOrderDrafts,
    companyOrderShowOnlyAdded,
    filteredCompanyOrderItems,
    selectedCompanyOrderSupplier,
  ]);
  const visibleCompanyOrderItems = useMemo(() => {
    if (companyOrderHasSearch || companyOrderShowOnlyAdded) {
      return baseCompanyOrderItems;
    }
    return baseCompanyOrderItems.slice(0, companyOrderVisibleCount);
  }, [
    baseCompanyOrderItems,
    companyOrderHasSearch,
    companyOrderShowOnlyAdded,
    companyOrderVisibleCount,
  ]);
  const hasMoreCompanyOrderItems = useMemo(() => {
    if (companyOrderHasSearch || companyOrderShowOnlyAdded) {
      return false;
    }
    return baseCompanyOrderItems.length > visibleCompanyOrderItems.length;
  }, [
    baseCompanyOrderItems.length,
    companyOrderHasSearch,
    companyOrderShowOnlyAdded,
    visibleCompanyOrderItems.length,
  ]);
  useEffect(() => {
    setCompanyOrderVisibleCount(16);
  }, [companyOrderHasSearch, companyOrderShowOnlyAdded, companyOrderSupplier]);
  useEffect(() => {
    setLiquorSheetDrafts((previous) => {
      const next: Record<string, LiquorSheetDraft> = {};
      liquorSheetRows.forEach((row) => {
        const existing = previous[row.item.id];
        next[row.item.id] = existing || {
          supplierName: row.item.supplierName || "",
          unitCost: String(row.item.unitCost ?? ""),
          sizeMl: row.item.sizeMl === null ? "" : String(row.item.sizeMl),
          barQuantity: String(row.barQuantity || ""),
          bodegaQuantity: String(row.bodegaQuantity || ""),
        };
      });
      return next;
    });
  }, [liquorSheetRows]);
  const selectedCompanySupplierDraft = useMemo(
    () => companyOrderDrafts[companyOrderSupplier] || {},
    [companyOrderDrafts, companyOrderSupplier],
  );
  const companyOrderCartItems = useMemo(
    () =>
      companyOrderCatalog.flatMap((supplier) => {
        const supplierDraft = companyOrderDrafts[supplier.supplierName] || {};
        return supplier.items
          .map((item) => {
            const key = companyOrderItemKey(item.nameEs, item.nameEn);
            const quantity = Number(supplierDraft[key] || "");
            if (!Number.isFinite(quantity) || quantity <= 0) {
              return null;
            }
            return {
              supplierName: supplier.supplierName,
              key,
              nameEs: item.nameEs,
              nameEn: item.nameEn,
              quantity,
            };
          })
          .filter(
            (
              entry,
            ): entry is {
              supplierName: string;
              key: string;
              nameEs: string;
              nameEn: string;
              quantity: number;
            } => Boolean(entry),
          );
      }),
    [companyOrderCatalog, companyOrderDrafts],
  );
  const selectedCompanyOrderCount = useMemo(
    () =>
      Object.values(companyOrderDrafts)
        .flatMap((draft) => Object.values(draft))
        .filter((value) => Number(value) > 0).length,
    [companyOrderDrafts],
  );
  const selectedCompanyOrderTotalUnits = useMemo(
    () =>
      Number(
        companyOrderCartItems
          .reduce((sum, item) => sum + item.quantity, 0)
          .toFixed(2),
      ),
    [companyOrderCartItems],
  );
  const selectedCompanyOrderSupplierCount = useMemo(
    () =>
      Object.values(companyOrderDrafts).filter((draft) =>
        Object.values(draft).some((value) => Number(value) > 0),
      ).length,
    [companyOrderDrafts],
  );
  const todayRoleTabs = useMemo(() => {
    const labels = new Set<string>();
    (todaySchedule?.rows || []).forEach((row) => {
      const label = row.roleLabel.trim() || "Unassigned";
      labels.add(label);
    });
    return ["All", ...Array.from(labels).sort((a, b) => a.localeCompare(b))];
  }, [todaySchedule]);
  const activeTodayRoleFilter = todayRoleTabs.includes(todayRoleFilter)
    ? todayRoleFilter
    : "All";
  const filteredTodayScheduleRows = useMemo(() => {
    const rows = todaySchedule?.rows || [];
    if (activeTodayRoleFilter === "All") {
      return rows;
    }
    return rows.filter((row) => row.roleLabel === activeTodayRoleFilter);
  }, [activeTodayRoleFilter, todaySchedule]);
  const todayScheduleLabel = useMemo(() => {
    if (!todaySchedule) {
      return "Who should work today, filtered by role.";
    }
    const weekdayLabel = todaySchedule.weekdayLabel || "Today";
    const dateLabel = todaySchedule.date
      ? formatDisplayDate(todaySchedule.date)
      : "Today";
    const timezoneLabel = todaySchedule.timezone
      ? ` (${todaySchedule.timezone})`
      : "";
    return `${weekdayLabel}, ${dateLabel}${timezoneLabel}`;
  }, [todaySchedule]);
  const pendingScheduleOverrides = useMemo(
    () =>
      notifications
        .map((notice) => {
          const parsed = parseScheduleOverrideNotification(notice);
          if (!parsed || parsed.status !== "PENDING") {
            return null;
          }
          return {
            requestId: parsed.requestId,
            employeeName:
              parsed.employeeName || notice.employeeName || "Employee",
            message: notice.message,
            reasonMessage: parsed.reasonMessage,
            attemptedAt: parsed.attemptedAt,
            workDate: parsed.workDate,
          };
        })
        .filter(
          (
            row,
          ): row is {
            requestId: string;
            employeeName: string;
            message: string;
            reasonMessage: string;
            attemptedAt: string;
            workDate: string;
          } => Boolean(row),
        ),
    [notifications],
  );
  const canAccessTab = useCallback(
    (tab: Screen) => {
      if (tab === "dashboard") return permissions.dashboard;
      if (tab === "users") return permissions.users;
      if (tab === "offices")
        return permissions.locations || permissions.manageMultiLocation;
      if (tab === "groups") return permissions.groups;
      if (tab === "schedules") return permissions.schedules;
      if (tab === "companyOrders") return permissions.companyOrders;
      if (tab === "capture") return permissions.salesCapture;
      if (tab === "reports") return permissions.reports;
      if (tab === "alerts") return permissions.notifications;
      return true;
    },
    [permissions],
  );
  const visibleTabs = useMemo(
    () => tabs.filter((tab) => canAccessTab(tab)),
    [canAccessTab],
  );

  useEffect(() => {
    if (!loggedIn) {
      return;
    }
    if (visibleTabs.length === 0) {
      return;
    }
    if (!visibleTabs.includes(screen)) {
      setScreen(visibleTabs[0]);
    }
  }, [loggedIn, screen, visibleTabs]);

  const renderLogin = () => (
    <View style={[styles.card, isLight && styles.cardLight]}>
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
        {text.loginTitle}
      </Text>
      <Text style={[styles.label, isLight && styles.labelLight]}>
        {text.tenant}
      </Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        placeholder={text.tenantPlaceholder}
        value={tenantInput}
        onChangeText={setTenantInput}
        autoCapitalize="none"
      />
      <Text style={[styles.label, isLight && styles.labelLight]}>
        {text.username}
      </Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        placeholder="admin"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <Text style={[styles.label, isLight && styles.labelLight]}>
        {text.password}
      </Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        placeholder="••••••"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {loginStatus && (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {inlineOrNull(loginStatus)}
        </Text>
      )}
      <TouchableOpacity
        style={[styles.button, styles.primary]}
        onPress={handleLogin}
        disabled={loginLoading}
      >
        <Text style={[styles.primaryText, isLight && styles.primaryTextLight]}>
          {loginLoading ? text.signingIn : text.signIn}
        </Text>
      </TouchableOpacity>
      <Text style={[styles.helperText, isLight && styles.helperTextLight]}>
        {text.pushHelp}
      </Text>
      {dataSyncError && (
        <Text
          style={[
            styles.statusText,
            { color: isLight ? "#b91c1c" : "#fca5a5" },
          ]}
        >
          API sync: {dataSyncError}
        </Text>
      )}
    </View>
  );

  const renderDashboard = () => (
    <>
      <View style={[styles.card, isLight && styles.cardLight]}>
        <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
          Admin Overview
        </Text>
        <View style={styles.summaryGrid}>
          <LinearGradient
            colors={isLight ? ["#eef2ff", "#e0e7ff"] : ["#2b3550", "#1e2a44"]}
            style={[styles.summaryTile, isLight && styles.summaryTileLight]}
          >
            <View style={styles.summaryHeader}>
              <Text
                style={[
                  styles.summaryLabel,
                  isLight && styles.summaryLabelLight,
                ]}
              >
                TOTAL USERS
              </Text>
              <View style={[styles.summaryIcon, styles.summaryIconUsers]} />
            </View>
            <Text
              style={[styles.summaryValue, isLight && styles.summaryValueLight]}
            >
              {summary.total}
            </Text>
          </LinearGradient>
          <LinearGradient
            colors={isLight ? ["#f3f4f6", "#e5e7eb"] : ["#3a3340", "#2a2434"]}
            style={[styles.summaryTile, isLight && styles.summaryTileLight]}
          >
            <View style={styles.summaryHeader}>
              <Text
                style={[
                  styles.summaryLabel,
                  isLight && styles.summaryLabelLight,
                ]}
              >
                SYS ADMINS
              </Text>
              <View style={[styles.summaryIcon, styles.summaryIconShield]} />
            </View>
            <Text
              style={[styles.summaryValue, isLight && styles.summaryValueLight]}
            >
              {summary.admins}
            </Text>
          </LinearGradient>
          <LinearGradient
            colors={isLight ? ["#e8f5f2", "#d7efe8"] : ["#2a3f45", "#20323a"]}
            style={[styles.summaryTile, isLight && styles.summaryTileLight]}
          >
            <View style={styles.summaryHeader}>
              <Text
                style={[
                  styles.summaryLabel,
                  isLight && styles.summaryLabelLight,
                ]}
              >
                TIME ADMINS
              </Text>
              <View style={[styles.summaryIcon, styles.summaryIconTime]} />
            </View>
            <Text
              style={[styles.summaryValue, isLight && styles.summaryValueLight]}
            >
              {summary.timeAdmins}
            </Text>
          </LinearGradient>
          <LinearGradient
            colors={isLight ? ["#f7f2ff", "#ede9fe"] : ["#3d364a", "#2c2636"]}
            style={[styles.summaryTile, isLight && styles.summaryTileLight]}
          >
            <View style={styles.summaryHeader}>
              <Text
                style={[
                  styles.summaryLabel,
                  isLight && styles.summaryLabelLight,
                ]}
              >
                REPORTS
              </Text>
              <View style={[styles.summaryIcon, styles.summaryIconReports]} />
            </View>
            <Text
              style={[styles.summaryValue, isLight && styles.summaryValueLight]}
            >
              {summary.reports}
            </Text>
          </LinearGradient>
        </View>
        {dataSyncError ? (
          <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
            API sync: {dataSyncError}
          </Text>
        ) : null}
        {sessionManagerEmployeeId ? (
          <>
            <View style={[styles.divider, isLight && styles.dividerLight]} />
            <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
              My Shift
            </Text>
            <View style={[styles.workingCard, isLight && styles.workingCardLight]}>
              <Text style={[styles.listName, isLight && styles.listNameLight]}>
                {managerProfile?.name || activeAdminUsername || "Manager"}
              </Text>
              {managerClockExempt ? (
                <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                  Owner privilege is active for this manager account. Clock in/out
                  is not required.
                </Text>
              ) : (
                <>
                  <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                    {language === "es" ? "Estado actual:" : "Current status:"}{" "}
                    {managerCurrentPunchStatus}
                  </Text>
                  <TextInput
                    style={[styles.input, styles.inputCompact]}
                    placeholder="PIN (if required)"
                    secureTextEntry
                    keyboardType="number-pad"
                    value={managerPin}
                    onChangeText={(value) =>
                      setManagerPin(value.replace(/\D+/g, "").slice(0, 4))
                    }
                    maxLength={4}
                  />
                  <TouchableOpacity
                    style={[
                      managerCanClockOut
                        ? styles.inlineButton
                        : styles.inlineButtonIn,
                      isLight &&
                        (managerCanClockOut
                          ? styles.inlineButtonLight
                          : styles.inlineButtonInLight),
                      managerPunchLoading && styles.inlineButtonDisabled,
                    ]}
                    onPress={handleManagerSelfPunch}
                    disabled={managerPunchLoading}
                  >
                    <Text
                      style={[
                        managerCanClockOut
                          ? styles.inlineButtonText
                          : styles.inlineButtonTextIn,
                        isLight &&
                          (managerCanClockOut
                            ? styles.inlineButtonTextLight
                            : styles.inlineButtonTextInLight),
                      ]}
                    >
                      {managerPunchLoading
                        ? inline("Working...")
                        : inline(managerActionLabel)}
                    </Text>
                  </TouchableOpacity>
                  {managerPendingTipWorkDate ? (
                    <View style={styles.tipCard}>
                      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                        {language === "es"
                          ? `Propinas pendientes requeridas para ${managerPendingTipWorkDate}.`
                          : `Pending tips required for ${managerPendingTipWorkDate}.`}
                      </Text>
                      <TextInput
                        style={[styles.input, styles.inputCompact]}
                        placeholder={
                          language === "es" ? "Propinas en efectivo" : "Cash tips"
                        }
                        keyboardType="decimal-pad"
                        value={managerCashTips}
                        onChangeText={setManagerCashTips}
                      />
                      <TextInput
                        style={[styles.input, styles.inputCompact]}
                        placeholder={
                          language === "es"
                            ? "Propinas de tarjeta"
                            : "Credit card tips"
                        }
                        keyboardType="decimal-pad"
                        value={managerCreditCardTips}
                        onChangeText={setManagerCreditCardTips}
                      />
                      <TouchableOpacity
                        style={[
                          styles.inlineButtonIn,
                          isLight && styles.inlineButtonInLight,
                          managerTipSaving && styles.inlineButtonDisabled,
                        ]}
                        onPress={handleSubmitManagerPendingTips}
                        disabled={managerTipSaving}
                      >
                        <Text
                          style={[
                            styles.inlineButtonTextIn,
                            isLight && styles.inlineButtonTextInLight,
                          ]}
                        >
                          {managerTipSaving
                            ? inline("Saving tips...")
                            : language === "es"
                              ? "Enviar Propinas Pendientes"
                              : "Submit Pending Tips"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </>
              )}
              {managerPunchStatus ? (
                <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
                  {inlineOrNull(managerPunchStatus)}
                </Text>
              ) : null}
            </View>
          </>
        ) : null}
        <View style={[styles.divider, isLight && styles.dividerLight]} />
        <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
          Working Now
        </Text>
        {activeNow.length === 0 ? (
          <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
            No active employees.
          </Text>
        ) : (
          activeNow.map((row) => {
            const status = row.status.toUpperCase();
            const isActive = ["IN", "BREAK", "LUNCH"].includes(status);
            const actionLabel = isActive ? "Clock Out" : "Clock In";
            const actionType = isActive ? "OUT" : "IN";
            return (
              <View
                key={row.id}
                style={[styles.workingCard, isLight && styles.workingCardLight]}
              >
                <View style={styles.workingRow}>
                  <View style={styles.workingLeft}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {row.name
                          .split(" ")
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </Text>
                    </View>
                    <Text
                      style={[styles.listName, isLight && styles.listNameLight]}
                    >
                      {row.name}
                    </Text>
                  </View>
                  <View style={styles.listActions}>
                    <View
                      style={[
                        styles.statusPill,
                        !isActive && styles.statusPillOut,
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          !isActive && styles.statusDotOut,
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusPillText,
                          !isActive && styles.statusPillTextOut,
                        ]}
                      >
                        {status}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        isActive ? styles.inlineButton : styles.inlineButtonIn,
                        isLight &&
                          (isActive
                            ? styles.inlineButtonLight
                            : styles.inlineButtonInLight),
                        punchLoadingId === row.id &&
                          styles.inlineButtonDisabled,
                      ]}
                      onPress={() => handleForcePunch(row.id, actionType)}
                      disabled={punchLoadingId === row.id}
                    >
                      <Text
                        style={[
                          isActive
                            ? styles.inlineButtonText
                            : styles.inlineButtonTextIn,
                          isLight &&
                            (isActive
                              ? styles.inlineButtonTextLight
                              : styles.inlineButtonTextInLight),
                        ]}
                      >
                        {punchLoadingId === row.id
                          ? inline("Working...")
                          : inline(actionLabel)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
        <View style={[styles.divider, isLight && styles.dividerLight]} />
        <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
          {language === "es"
            ? "Aprobaciones Pendientes de Entrada"
            : "Pending Clock-In Approvals"}
        </Text>
        {pendingScheduleOverrides.length === 0 ? (
          <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
            {language === "es"
              ? "No hay solicitudes pendientes de aprobación."
              : "No pending approval requests."}
          </Text>
        ) : (
          pendingScheduleOverrides.map((request) => {
            const isBusy = scheduleOverrideLoadingId === request.requestId;
            return (
              <View
                key={request.requestId}
                style={[styles.workingCard, isLight && styles.workingCardLight]}
              >
                <View style={styles.reportRowMain}>
                  <Text
                    style={[styles.listName, isLight && styles.listNameLight]}
                  >
                    {request.employeeName}
                  </Text>
                  <Text
                    style={[styles.listMeta, isLight && styles.listMetaLight]}
                  >
                    {request.message}
                  </Text>
                  {request.reasonMessage ? (
                    <Text
                      style={[styles.listMeta, isLight && styles.listMetaLight]}
                    >
                      {request.reasonMessage}
                    </Text>
                  ) : null}
                      {request.workDate ? (
                        <Text
                          style={[styles.listMeta, isLight && styles.listMetaLight]}
                        >
                          {language === "es" ? "Fecha de trabajo:" : "Work date:"}{" "}
                          {formatDisplayDate(request.workDate)}
                        </Text>
                      ) : null}
                      {request.attemptedAt ? (
                        <Text
                          style={[styles.listMeta, isLight && styles.listMetaLight]}
                        >
                          {language === "es" ? "Intento:" : "Attempted:"}{" "}
                          {new Date(request.attemptedAt).toLocaleString()}
                        </Text>
                      ) : null}
                </View>
                <View style={[styles.rowActions, { marginTop: 10 }]}>
                  <TouchableOpacity
                    style={[
                      styles.secondaryButton,
                      styles.actionButtonCompact,
                      isLight && styles.secondaryButtonLight,
                      isBusy && styles.inlineButtonDisabled,
                    ]}
                    disabled={isBusy}
                    onPress={() =>
                      handleScheduleOverrideDecision(request.requestId, true)
                    }
                  >
                    <Text
                      style={[
                        styles.secondaryButtonText,
                        isLight && styles.secondaryButtonTextLight,
                      ]}
                    >
                      {isBusy ? inline("Working...") : inline("Approve")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.secondaryButton,
                      styles.actionButtonCompact,
                      styles.secondaryButtonDanger,
                      isBusy && styles.inlineButtonDisabled,
                    ]}
                    disabled={isBusy}
                    onPress={() =>
                      handleScheduleOverrideDecision(request.requestId, false)
                    }
                  >
                    <Text
                      style={[
                        styles.secondaryButtonText,
                        styles.secondaryButtonDangerText,
                      ]}
                    >
                      {language === "es" ? "Rechazar" : "Reject"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
        {punchStatus && (
          <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
            {inlineOrNull(punchStatus)}
          </Text>
        )}
        {dataSyncError && (
          <Text
            style={[
              styles.statusText,
              { color: isLight ? "#b91c1c" : "#fca5a5" },
            ]}
          >
            API sync: {dataSyncError}
          </Text>
        )}
        <Text style={[styles.footerNote, isLight && styles.footerNoteLight]}>
          Powered by Websys Workforce
        </Text>
      </View>
    </>
  );

  const renderUsers = () => (
    <View style={[styles.card, isLight && styles.cardLight]}>
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
        Users
      </Text>
      <View style={styles.rowActions}>
        <Text style={[styles.label, isLight && styles.labelLight]}>
          Current Users: {employees.length}
        </Text>
        <TouchableOpacity
          style={[
            styles.secondaryButton,
            isLight && styles.secondaryButtonLight,
            styles.actionButtonCompact,
          ]}
          onPress={() => {
            loadEmployees();
            loadActiveNow();
            loadSummary();
          }}
        >
          <Text
            style={[
              styles.secondaryButtonText,
              isLight && styles.secondaryButtonTextLight,
            ]}
          >
            {language === "es" ? "Actualizar" : "Refresh"}
          </Text>
        </TouchableOpacity>
      </View>
      {employees.length === 0 ? (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          {language === "es"
            ? "Aún no hay usuarios cargados. Toca Actualizar."
            : "No users loaded yet. Tap Refresh."}
        </Text>
      ) : (
        <View
          style={[styles.userQuickList, isLight && styles.userQuickListLight]}
        >
          {employees.slice(0, 8).map((employee) => {
            const status = employee.active ? "Active" : "Disabled";
            return (
              <Text
                key={`quick-${employee.id}`}
                style={[styles.listMeta, isLight && styles.listMetaLight]}
              >
                {employee.name} · {inline(status)}
              </Text>
            );
          })}
        </View>
      )}
      {dataSyncError ? (
        <Text
          style={[
            styles.statusText,
            { color: isLight ? "#b91c1c" : "#fca5a5" },
          ]}
        >
          API sync: {dataSyncError}
        </Text>
      ) : null}
      <View style={[styles.divider, isLight && styles.dividerLight]} />
      <Text style={[styles.label, isLight && styles.labelLight]}>
        Create New User
      </Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        placeholder="Full name"
        value={newUserName}
        onChangeText={setNewUserName}
      />
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        placeholder="Email"
        value={newUserEmail}
        onChangeText={setNewUserEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        placeholder="4-digit PIN"
        value={newUserPin}
        onChangeText={setNewUserPin}
        keyboardType="number-pad"
        maxLength={4}
      />
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            newUserIsManager && styles.toggleActive,
            newUserIsManager && isLight && styles.toggleActiveLight,
          ]}
          onPress={() =>
            setNewUserIsManager((prev) => {
              const enabled = !prev;
              if (!enabled) {
                setNewUserIsOwnerManager(false);
              }
              return enabled;
            })
          }
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              newUserIsManager && isLight && styles.toggleTextLightActive,
            ]}
          >
            Manager
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            newUserIsOwnerManager && styles.toggleActive,
            newUserIsOwnerManager && isLight && styles.toggleActiveLight,
            !newUserIsManager && styles.inlineButtonDisabled,
          ]}
          onPress={() =>
            setNewUserIsOwnerManager((prev) =>
              newUserIsManager ? !prev : false,
            )
          }
          disabled={!newUserIsManager}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              newUserIsOwnerManager &&
                isLight &&
                styles.toggleTextLightActive,
            ]}
          >
            Manager Owner
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            newUserIsAdmin && styles.toggleActive,
            newUserIsAdmin && isLight && styles.toggleActiveLight,
          ]}
          onPress={() => setNewUserIsAdmin((prev) => !prev)}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              newUserIsAdmin && isLight && styles.toggleTextLightActive,
            ]}
          >
            Sys Admin
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            newUserIsTimeAdmin && styles.toggleActive,
            newUserIsTimeAdmin && isLight && styles.toggleActiveLight,
          ]}
          onPress={() => setNewUserIsTimeAdmin((prev) => !prev)}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              newUserIsTimeAdmin && isLight && styles.toggleTextLightActive,
            ]}
          >
            Time Admin
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            newUserIsReports && styles.toggleActive,
            newUserIsReports && isLight && styles.toggleActiveLight,
          ]}
          onPress={() => setNewUserIsReports((prev) => !prev)}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              newUserIsReports && isLight && styles.toggleTextLightActive,
            ]}
          >
            Reports
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            newUserIsKitchenManager && styles.toggleActive,
            newUserIsKitchenManager && isLight && styles.toggleActiveLight,
          ]}
          onPress={() => setNewUserIsKitchenManager((prev) => !prev)}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              newUserIsKitchenManager &&
                isLight &&
                styles.toggleTextLightActive,
            ]}
          >
            Kitchen Manager
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            newUserIsServer && styles.toggleActive,
            newUserIsServer && isLight && styles.toggleActiveLight,
          ]}
          onPress={() => setNewUserIsServer((prev) => !prev)}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              newUserIsServer && isLight && styles.toggleTextLightActive,
            ]}
          >
            Server
          </Text>
        </TouchableOpacity>
      </View>
      {userStatus && (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {inlineOrNull(userStatus)}
        </Text>
      )}
      <TouchableOpacity
        style={[styles.button, styles.primary]}
        onPress={handleCreateUser}
      >
        <Text style={[styles.primaryText, isLight && styles.primaryTextLight]}>
          Create User
        </Text>
      </TouchableOpacity>

      <View style={[styles.divider, isLight && styles.dividerLight]} />
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
        Edit User
      </Text>
      {editUserLoading && (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          Loading user...
        </Text>
      )}
      {!editingUserId ? (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          Tap Edit on a user below to load their profile.
        </Text>
      ) : (
        <>
          <Text style={[styles.label, isLight && styles.labelLight]}>
            Full Name
          </Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={editUserForm.fullName}
            onChangeText={(value) =>
              setEditUserForm((prev) => ({ ...prev, fullName: value }))
            }
            placeholder="Full name"
          />
          <Text style={[styles.label, isLight && styles.labelLight]}>
            Display Name
          </Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={editUserForm.displayName}
            onChangeText={(value) =>
              setEditUserForm((prev) => ({ ...prev, displayName: value }))
            }
            placeholder="Display name"
          />
          <Text style={[styles.label, isLight && styles.labelLight]}>
            Email
          </Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={editUserForm.email}
            onChangeText={(value) =>
              setEditUserForm((prev) => ({ ...prev, email: value }))
            }
            autoCapitalize="none"
            placeholder="Email"
          />
          <Text style={[styles.label, isLight && styles.labelLight]}>
            Reset PIN (optional)
          </Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={editUserForm.pin}
            onChangeText={(value) =>
              setEditUserForm((prev) => ({ ...prev, pin: value }))
            }
            keyboardType="number-pad"
            maxLength={4}
            placeholder="4-digit PIN"
          />
          <Text style={[styles.label, isLight && styles.labelLight]}>
            Hourly Rate
          </Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={editUserForm.hourlyRate}
            onChangeText={(value) =>
              setEditUserForm((prev) => ({ ...prev, hourlyRate: value }))
            }
            keyboardType="decimal-pad"
            placeholder="15.00"
          />

          <Text style={[styles.label, isLight && styles.labelLight]}>
            Location
          </Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.togglePill,
                isLight && styles.togglePillLight,
                !editUserForm.officeId && styles.toggleActive,
                !editUserForm.officeId && isLight && styles.toggleActiveLight,
              ]}
              onPress={() =>
                setEditUserForm((prev) => ({ ...prev, officeId: "" }))
              }
            >
              <Text
                style={[
                  styles.toggleText,
                  isLight && styles.toggleTextLight,
                  !editUserForm.officeId &&
                    isLight &&
                    styles.toggleTextLightActive,
                ]}
              >
                No Location
              </Text>
            </TouchableOpacity>
            {offices.map((office) => (
              <TouchableOpacity
                key={office.id}
                style={[
                  styles.togglePill,
                  isLight && styles.togglePillLight,
                  editUserForm.officeId === office.id && styles.toggleActive,
                  editUserForm.officeId === office.id &&
                    isLight &&
                    styles.toggleActiveLight,
                ]}
                onPress={() =>
                  setEditUserForm((prev) => ({ ...prev, officeId: office.id }))
                }
              >
                <Text
                  style={[
                    styles.toggleText,
                    isLight && styles.toggleTextLight,
                    editUserForm.officeId === office.id &&
                      isLight &&
                      styles.toggleTextLightActive,
                  ]}
                >
                  {office.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, isLight && styles.labelLight]}>
            Group
          </Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.togglePill,
                isLight && styles.togglePillLight,
                !editUserForm.groupId && styles.toggleActive,
                !editUserForm.groupId && isLight && styles.toggleActiveLight,
              ]}
              onPress={() =>
                setEditUserForm((prev) => ({ ...prev, groupId: "" }))
              }
            >
              <Text
                style={[
                  styles.toggleText,
                  isLight && styles.toggleTextLight,
                  !editUserForm.groupId &&
                    isLight &&
                    styles.toggleTextLightActive,
                ]}
              >
                No Group
              </Text>
            </TouchableOpacity>
            {groups.map((group) => (
              <TouchableOpacity
                key={group.id}
                style={[
                  styles.togglePill,
                  isLight && styles.togglePillLight,
                  editUserForm.groupId === group.id && styles.toggleActive,
                  editUserForm.groupId === group.id &&
                    isLight &&
                    styles.toggleActiveLight,
                ]}
                onPress={() =>
                  setEditUserForm((prev) => ({ ...prev, groupId: group.id }))
                }
              >
                <Text
                  style={[
                    styles.toggleText,
                    isLight && styles.toggleTextLight,
                    editUserForm.groupId === group.id &&
                      isLight &&
                      styles.toggleTextLightActive,
                  ]}
                >
                  {group.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
            Owner status:{" "}
            {editUserForm.isManager
              ? editUserForm.isOwnerManager
                ? "Yes"
                : "No"
              : "N/A"}
          </Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.togglePill,
                isLight && styles.togglePillLight,
                editUserForm.isManager && styles.toggleActive,
                editUserForm.isManager && isLight && styles.toggleActiveLight,
              ]}
              onPress={() =>
                setEditUserForm((prev) => ({
                  ...prev,
                  isManager: !prev.isManager,
                  isOwnerManager: !prev.isManager ? prev.isOwnerManager : false,
                }))
              }
            >
              <Text
                style={[
                  styles.toggleText,
                  isLight && styles.toggleTextLight,
                  editUserForm.isManager &&
                    isLight &&
                    styles.toggleTextLightActive,
                ]}
              >
                Manager
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.togglePill,
                isLight && styles.togglePillLight,
                editUserForm.isOwnerManager && styles.toggleActive,
                editUserForm.isOwnerManager &&
                  isLight &&
                  styles.toggleActiveLight,
                !editUserForm.isManager && styles.inlineButtonDisabled,
              ]}
              onPress={() =>
                setEditUserForm((prev) => ({
                  ...prev,
                  isOwnerManager: prev.isManager ? !prev.isOwnerManager : false,
                }))
              }
              disabled={!editUserForm.isManager}
            >
              <Text
                style={[
                  styles.toggleText,
                  isLight && styles.toggleTextLight,
                  editUserForm.isOwnerManager &&
                    isLight &&
                    styles.toggleTextLightActive,
                ]}
              >
                Manager Owner
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.togglePill,
                isLight && styles.togglePillLight,
                editUserForm.isAdmin && styles.toggleActive,
                editUserForm.isAdmin && isLight && styles.toggleActiveLight,
              ]}
              onPress={() =>
                setEditUserForm((prev) => ({ ...prev, isAdmin: !prev.isAdmin }))
              }
            >
              <Text
                style={[
                  styles.toggleText,
                  isLight && styles.toggleTextLight,
                  editUserForm.isAdmin &&
                    isLight &&
                    styles.toggleTextLightActive,
                ]}
              >
                Sys Admin
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.togglePill,
                isLight && styles.togglePillLight,
                editUserForm.isTimeAdmin && styles.toggleActive,
                editUserForm.isTimeAdmin && isLight && styles.toggleActiveLight,
              ]}
              onPress={() =>
                setEditUserForm((prev) => ({
                  ...prev,
                  isTimeAdmin: !prev.isTimeAdmin,
                }))
              }
            >
              <Text
                style={[
                  styles.toggleText,
                  isLight && styles.toggleTextLight,
                  editUserForm.isTimeAdmin &&
                    isLight &&
                    styles.toggleTextLightActive,
                ]}
              >
                Time Admin
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.togglePill,
                isLight && styles.togglePillLight,
                editUserForm.isReports && styles.toggleActive,
                editUserForm.isReports && isLight && styles.toggleActiveLight,
              ]}
              onPress={() =>
                setEditUserForm((prev) => ({
                  ...prev,
                  isReports: !prev.isReports,
                }))
              }
            >
              <Text
                style={[
                  styles.toggleText,
                  isLight && styles.toggleTextLight,
                  editUserForm.isReports &&
                    isLight &&
                    styles.toggleTextLightActive,
                ]}
              >
                Reports
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.togglePill,
                isLight && styles.togglePillLight,
                editUserForm.isKitchenManager && styles.toggleActive,
                editUserForm.isKitchenManager &&
                  isLight &&
                  styles.toggleActiveLight,
              ]}
              onPress={() =>
                setEditUserForm((prev) => ({
                  ...prev,
                  isKitchenManager: !prev.isKitchenManager,
                }))
              }
            >
              <Text
                style={[
                  styles.toggleText,
                  isLight && styles.toggleTextLight,
                  editUserForm.isKitchenManager &&
                    isLight &&
                    styles.toggleTextLightActive,
                ]}
              >
                Kitchen Manager
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.togglePill,
                isLight && styles.togglePillLight,
                editUserForm.isServer && styles.toggleActive,
                editUserForm.isServer && isLight && styles.toggleActiveLight,
              ]}
              onPress={() =>
                setEditUserForm((prev) => ({
                  ...prev,
                  isServer: !prev.isServer,
                }))
              }
            >
              <Text
                style={[
                  styles.toggleText,
                  isLight && styles.toggleTextLight,
                  editUserForm.isServer &&
                    isLight &&
                    styles.toggleTextLightActive,
                ]}
              >
                Server
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.togglePill,
                isLight && styles.togglePillLight,
                editUserForm.disabled && styles.toggleDanger,
              ]}
              onPress={() =>
                setEditUserForm((prev) => ({
                  ...prev,
                  disabled: !prev.disabled,
                }))
              }
            >
              <Text
                style={[
                  styles.toggleText,
                  isLight && styles.toggleTextLight,
                  editUserForm.disabled && styles.toggleTextLightActive,
                ]}
              >
                {inline(editUserForm.disabled ? "Disabled" : "Active")}
              </Text>
            </TouchableOpacity>
          </View>
          {editUserStatus && (
            <Text
              style={[styles.statusText, isLight && styles.statusTextLight]}
            >
              {inlineOrNull(editUserStatus)}
            </Text>
          )}
          <View style={styles.rowActions}>
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                isLight && styles.secondaryButtonLight,
                styles.actionButtonCompact,
                (editUserLoading || editUserSaving) &&
                  styles.inlineButtonDisabled,
              ]}
              onPress={cancelEditUser}
              disabled={editUserLoading || editUserSaving}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  isLight && styles.secondaryButtonTextLight,
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.primary,
                styles.actionButtonPrimary,
                (editUserLoading || editUserSaving) &&
                  styles.inlineButtonDisabled,
              ]}
              onPress={saveUserEdits}
              disabled={editUserLoading || editUserSaving}
            >
              <Text
                style={[styles.primaryText, isLight && styles.primaryTextLight]}
              >
                {editUserSaving ? inline("Saving...") : inline("Save Changes")}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <Text
        style={[
          styles.cardTitle,
          { marginTop: 18 },
          isLight && styles.cardTitleLight,
        ]}
      >
        Users
      </Text>
      <ScrollView
        style={styles.userList}
        contentContainerStyle={styles.userListContent}
        nestedScrollEnabled
      >
        {employees.map((employee) => {
          const currentPunchStatus =
            employeePunchStatus.get(employee.id) || "OUT";
          const canClockOut = ["IN", "BREAK", "LUNCH"].includes(
            currentPunchStatus,
          );

          return (
            <View key={employee.id} style={[styles.listRow, styles.userListRow]}>
              <View style={styles.userListMain}>
                <Text
                  style={[styles.listName, isLight && styles.listNameLight]}
                >
                  {employee.name}
                </Text>
                <Text
                  style={[styles.listMeta, isLight && styles.listMetaLight]}
                >
                  {employee.email ||
                    (language === "es" ? "Sin correo" : "No email")}{" "}
                  • {inline(employee.active ? "Active" : "Disabled")} •{" "}
                  {language === "es" ? "Marcación:" : "Punch:"}{" "}
                  {currentPunchStatus}
                </Text>
                {employee.isManager && (
                  <Text
                    style={[styles.listMeta, isLight && styles.listMetaLight]}
                  >
                    {language === "es" ? "Manager Owner:" : "Manager Owner:"}{" "}
                    {employee.isOwnerManager ? inline("Yes") : "No"}
                  </Text>
                )}
              </View>
              <View style={[styles.rowActions, styles.userRowActions]}>
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    isLight && styles.secondaryButtonLight,
                    styles.actionButtonCompact,
                  ]}
                  onPress={() => loadUserForEdit(employee.id)}
                >
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      isLight && styles.secondaryButtonTextLight,
                    ]}
                  >
                    Edit
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    isLight && styles.secondaryButtonLight,
                    styles.actionButtonCompact,
                    employee.active && styles.secondaryButtonDanger,
                  ]}
                  onPress={() =>
                    handleSetUserDisabled(employee.id, employee.active)
                  }
                >
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      isLight && styles.secondaryButtonTextLight,
                      employee.active && styles.secondaryButtonDangerText,
                    ]}
                  >
                    {inline(employee.active ? "Disable" : "Enable")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    isLight && styles.secondaryButtonLight,
                    styles.actionButtonCompact,
                    canClockOut && styles.secondaryButtonDanger,
                    (punchLoadingId === employee.id || !canClockOut) &&
                      styles.inlineButtonDisabled,
                  ]}
                  onPress={() => handleForcePunch(employee.id, "OUT")}
                  disabled={punchLoadingId === employee.id || !canClockOut}
                >
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      isLight && styles.secondaryButtonTextLight,
                      canClockOut && styles.secondaryButtonDangerText,
                    ]}
                  >
                    {punchLoadingId === employee.id
                      ? inline("Working...")
                      : canClockOut
                        ? inline("Clock Out")
                        : language === "es"
                          ? "Sin entrada activa"
                          : "Not Clocked In"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderOffices = () => (
    <View style={[styles.card, isLight && styles.cardLight]}>
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
        Locations
      </Text>
      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
        {text.activeLocation}: {activeLocationLabel}
      </Text>
      {canManageMultiLocation ? (
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[
              styles.togglePill,
              isLight && styles.togglePillLight,
              !scopedLocationId && styles.toggleActive,
              !scopedLocationId && isLight && styles.toggleActiveLight,
            ]}
            onPress={() => setActiveLocationId("")}
          >
            <Text
              style={[
                styles.toggleText,
                isLight && styles.toggleTextLight,
                !scopedLocationId && isLight && styles.toggleTextLightActive,
              ]}
            >
              {text.allLocations}
            </Text>
          </TouchableOpacity>
          {offices.map((office) => (
            <TouchableOpacity
              key={`scope-${office.id}`}
              style={[
                styles.togglePill,
                isLight && styles.togglePillLight,
                scopedLocationId === office.id && styles.toggleActive,
                scopedLocationId === office.id &&
                  isLight &&
                  styles.toggleActiveLight,
              ]}
              onPress={() => setActiveLocationId(office.id)}
            >
              <Text
                style={[
                  styles.toggleText,
                  isLight && styles.toggleTextLight,
                  scopedLocationId === office.id &&
                    isLight &&
                    styles.toggleTextLightActive,
                ]}
              >
                {office.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      {canCreateLocations ? (
        <>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            placeholder="New location name"
            value={newOfficeName}
            onChangeText={setNewOfficeName}
          />
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            placeholder="Latitude (optional)"
            value={newOfficeLatitude}
            onChangeText={setNewOfficeLatitude}
            keyboardType="decimal-pad"
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            placeholder="Longitude (optional)"
            value={newOfficeLongitude}
            onChangeText={setNewOfficeLongitude}
            keyboardType="decimal-pad"
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            placeholder="Radius meters (optional, default 120)"
            value={newOfficeRadius}
            onChangeText={setNewOfficeRadius}
            keyboardType="number-pad"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.button, styles.primary]}
            onPress={handleCreateOffice}
          >
            <Text
              style={[styles.primaryText, isLight && styles.primaryTextLight]}
            >
              Create Location
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          Location creation is disabled for this manager.
        </Text>
      )}
      {officeStatus && (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {inlineOrNull(officeStatus)}
        </Text>
      )}
      {officeGeoTarget ? (
        <>
          <View style={[styles.divider, isLight && styles.dividerLight]} />
          <Text style={[styles.listName, isLight && styles.listNameLight]}>
            Geofence: {officeGeoTarget.name}
          </Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            placeholder="Latitude"
            value={officeGeoLatitude}
            onChangeText={setOfficeGeoLatitude}
            keyboardType="decimal-pad"
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            placeholder="Longitude"
            value={officeGeoLongitude}
            onChangeText={setOfficeGeoLongitude}
            keyboardType="decimal-pad"
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            placeholder="Radius meters (25-5000)"
            value={officeGeoRadius}
            onChangeText={setOfficeGeoRadius}
            keyboardType="number-pad"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[
              styles.button,
              styles.secondaryButton,
              isLight && styles.secondaryButtonLight,
              officeGeoSaving && styles.inlineButtonDisabled,
            ]}
            onPress={handleSaveOfficeGeofence}
            disabled={officeGeoSaving}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                isLight && styles.secondaryButtonTextLight,
              ]}
            >
              {officeGeoSaving
                ? inline("Saving...")
                : language === "es"
                  ? "Guardar Geocerca"
                  : "Save Geofence"}
            </Text>
          </TouchableOpacity>
          {officeGeoStatus && (
            <Text
              style={[styles.statusText, isLight && styles.statusTextLight]}
            >
              {inlineOrNull(officeGeoStatus)}
            </Text>
          )}
        </>
      ) : null}
      <View style={[styles.divider, isLight && styles.dividerLight]} />
      {offices.length === 0 ? (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          No locations created yet.
        </Text>
      ) : (
        offices.map((office) => (
          <View key={office.id} style={styles.listRow}>
            <View>
              <Text style={[styles.listName, isLight && styles.listNameLight]}>
                {office.name}
              </Text>
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                {scopedLocationId === office.id
                  ? "Current location panel"
                  : "Tap switch to open this location panel"}
              </Text>
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                {office.latitude !== null &&
                office.latitude !== undefined &&
                office.longitude !== null &&
                office.longitude !== undefined
                  ? `Geofence: ${office.latitude.toFixed(5)}, ${office.longitude.toFixed(5)} • ${
                      office.geofenceRadiusMeters || 120
                    }m`
                  : "Geofence: not configured"}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                isLight && styles.secondaryButtonLight,
                styles.actionButtonCompact,
              ]}
              onPress={() => {
                setActiveLocationId(office.id);
                setScreen("dashboard");
              }}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  isLight && styles.secondaryButtonTextLight,
                ]}
              >
                {inline(scopedLocationId === office.id ? "Current" : "Switch")}
              </Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );

  const renderGroups = () => (
    <View style={[styles.card, isLight && styles.cardLight]}>
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
        Groups
      </Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        placeholder="New group name"
        value={newGroupName}
        onChangeText={setNewGroupName}
      />
      {groupStatus && (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {inlineOrNull(groupStatus)}
        </Text>
      )}
      <TouchableOpacity
        style={[styles.button, styles.primary]}
        onPress={handleCreateGroup}
      >
        <Text style={[styles.primaryText, isLight && styles.primaryTextLight]}>
          Create Group
        </Text>
      </TouchableOpacity>
      <View style={[styles.divider, isLight && styles.dividerLight]} />
      {groups.map((group) => (
        <Text
          key={group.id}
          style={[styles.listName, isLight && styles.listNameLight]}
        >
          {group.name}
        </Text>
      ))}
    </View>
  );

  const renderCapture = () => (
    <View style={[styles.card, isLight && styles.cardLight]}>
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
        {text.captureTitle}
      </Text>
      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
        {text.captureSubtitle}
      </Text>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            captureMode === "sales" && styles.toggleActive,
            captureMode === "sales" && isLight && styles.toggleActiveLight,
          ]}
          onPress={() => setCaptureMode("sales")}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              captureMode === "sales" &&
                isLight &&
                styles.toggleTextLightActive,
            ]}
          >
            {text.salesToggle}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            captureMode === "expense" && styles.toggleActive,
            captureMode === "expense" && isLight && styles.toggleActiveLight,
          ]}
          onPress={() => setCaptureMode("expense")}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              captureMode === "expense" &&
                isLight &&
                styles.toggleTextLightActive,
            ]}
          >
            {text.expenseToggle}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.divider, isLight && styles.dividerLight]} />
      {captureMode === "sales" ? (
        <>
          <Text
            style={[
              styles.cardTitle,
              styles.reportSectionTitle,
              isLight && styles.cardTitleLight,
            ]}
          >
            {text.salesTitle}
          </Text>
          <Text style={[styles.label, isLight && styles.labelLight]}>
            {text.salesDate}
          </Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={salesDate}
            onChangeText={setSalesDate}
            placeholder="MM/DD/YYYY"
          />
          <Text style={[styles.label, isLight && styles.labelLight]}>
            {text.foodSales}
          </Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={salesFood}
            onChangeText={setSalesFood}
            keyboardType="decimal-pad"
          />
          <Text style={[styles.label, isLight && styles.labelLight]}>
            {text.liquorSales}
          </Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={salesLiquor}
            onChangeText={setSalesLiquor}
            keyboardType="decimal-pad"
          />
          <Text style={[styles.label, isLight && styles.labelLight]}>
            {text.cashPayments}
          </Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={salesCash}
            onChangeText={setSalesCash}
            keyboardType="decimal-pad"
          />
          <Text style={[styles.label, isLight && styles.labelLight]}>
            {text.bankBatch}
          </Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={salesBatch}
            onChangeText={setSalesBatch}
            placeholder="Batch reference"
          />
          <Text style={[styles.label, isLight && styles.labelLight]}>
            {text.notesOptional}
          </Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={salesNotes}
            onChangeText={setSalesNotes}
            placeholder="Manager notes"
          />
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              isLight && styles.secondaryButtonLight,
              styles.actionButtonCompact,
              salesSaveLoading && styles.inlineButtonDisabled,
            ]}
            onPress={saveSalesReport}
            disabled={salesSaveLoading}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                isLight && styles.secondaryButtonTextLight,
              ]}
            >
              {salesSaveLoading ? text.saving : text.saveDailySales}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text
            style={[
              styles.cardTitle,
              styles.reportSectionTitle,
              isLight && styles.cardTitleLight,
            ]}
          >
            {text.expenseTitle}
          </Text>
          <Text style={[styles.label, isLight && styles.labelLight]}>
            {text.expenseDate}
          </Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={todayExpenseDate}
            editable={false}
            selectTextOnFocus={false}
          />
          <Text style={[styles.label, isLight && styles.labelLight]}>
            {text.invoiceNumber}
          </Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={salesExpenseInvoice}
            onChangeText={setSalesExpenseInvoice}
            placeholder="INV-001"
          />
          <Text style={[styles.label, isLight && styles.labelLight]}>
            {text.companyName}
          </Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={salesExpenseCompany}
            onChangeText={setSalesExpenseCompany}
            placeholder="Vendor name"
          />
          <Text style={[styles.label, isLight && styles.labelLight]}>
            {text.paymentMethod}
          </Text>
          <View style={styles.toggleRow}>
            {(["CHECK", "DEBIT_CARD", "CASH"] as ExpensePaymentMethod[]).map(
              (method) => (
                <TouchableOpacity
                  key={`expense-method-${method}`}
                  style={[
                    styles.togglePill,
                    isLight && styles.togglePillLight,
                    salesExpenseMethod === method && styles.toggleActive,
                    salesExpenseMethod === method &&
                      isLight &&
                      styles.toggleActiveLight,
                  ]}
                  onPress={() => setSalesExpenseMethod(method)}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      isLight && styles.toggleTextLight,
                      salesExpenseMethod === method &&
                        isLight &&
                        styles.toggleTextLightActive,
                    ]}
                  >
                    {expensePaymentMethodLabel(method)}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </View>
          <Text style={[styles.label, isLight && styles.labelLight]}>
            {salesExpenseMethod === "CHECK"
              ? text.checkTotal
              : salesExpenseMethod === "DEBIT_CARD"
                ? text.debitTotal
                : text.cashTotal}
          </Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={salesExpenseAmount}
            onChangeText={setSalesExpenseAmount}
            keyboardType="decimal-pad"
          />
          {salesExpenseMethod === "CHECK" && (
            <>
              <Text style={[styles.label, isLight && styles.labelLight]}>
                {text.checkNumber}
              </Text>
              <TextInput
                style={[styles.input, isLight && styles.inputLight]}
                value={salesExpenseCheckNumber}
                onChangeText={setSalesExpenseCheckNumber}
                placeholder="CHK-1002"
              />
              <Text style={[styles.label, isLight && styles.labelLight]}>
                {text.payToCompany}
              </Text>
              <TextInput
                style={[styles.input, isLight && styles.inputLight]}
                value={salesExpensePayToCompany}
                onChangeText={setSalesExpensePayToCompany}
                placeholder="Company receiving payment"
              />
            </>
          )}
          <Text style={[styles.label, isLight && styles.labelLight]}>
            {text.notesOptional}
          </Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={salesExpenseNotes}
            onChangeText={setSalesExpenseNotes}
            placeholder="Expense notes"
          />
          <Text style={[styles.label, isLight && styles.labelLight]}>
            {text.receiptPhoto}
          </Text>
          <View style={styles.rowActions}>
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                isLight && styles.secondaryButtonLight,
                styles.actionButtonCompact,
                salesExpenseReceiptLoading && styles.inlineButtonDisabled,
              ]}
              onPress={captureSalesExpenseReceipt}
              disabled={salesExpenseReceiptLoading}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  isLight && styles.secondaryButtonTextLight,
                ]}
              >
                {salesExpenseReceiptLoading
                  ? text.openingCamera
                  : salesExpenseReceipt
                    ? text.retakePhoto
                    : text.takePhoto}
              </Text>
            </TouchableOpacity>
            {salesExpenseReceipt ? (
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  styles.secondaryButtonDanger,
                  styles.actionButtonCompact,
                ]}
                onPress={() => setSalesExpenseReceipt(null)}
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    styles.secondaryButtonDangerText,
                  ]}
                >
                  {text.removePhoto}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {salesExpenseReceipt ? (
            <Text
              style={[styles.helperText, isLight && styles.helperTextLight]}
            >
              {text.attached} {salesExpenseReceipt.fileName}
            </Text>
          ) : (
            <Text
              style={[styles.helperText, isLight && styles.helperTextLight]}
            >
              {text.noPhoto}
            </Text>
          )}
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              isLight && styles.secondaryButtonLight,
              styles.actionButtonCompact,
              salesExpenseSaveLoading && styles.inlineButtonDisabled,
            ]}
            onPress={saveSalesExpense}
            disabled={salesExpenseSaveLoading}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                isLight && styles.secondaryButtonTextLight,
              ]}
            >
              {salesExpenseSaveLoading ? text.saving : text.saveDailyExpense}
            </Text>
          </TouchableOpacity>
        </>
      )}
      {salesActionStatus && (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {inlineOrNull(salesActionStatus)}
        </Text>
      )}
    </View>
  );

  const renderReports = () => (
    <View style={[styles.card, isLight && styles.cardLight]}>
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
        Run Reports
      </Text>
      <View style={styles.toggleRow}>
        {reportTypeOrder.map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.togglePill,
              isLight && styles.togglePillLight,
              reportType === type && styles.toggleActive,
              reportType === type && isLight && styles.toggleActiveLight,
            ]}
            onPress={() => setReportType(type)}
          >
            <Text
              style={[
                styles.toggleText,
                isLight && styles.toggleTextLight,
                reportType === type && isLight && styles.toggleTextLightActive,
              ]}
            >
              {type.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.label, isLight && styles.labelLight]}>
        From (MM/DD/YYYY)
      </Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        value={fromDate}
        onChangeText={setFromDate}
        placeholder="MM/DD/YYYY"
      />
      <Text style={[styles.label, isLight && styles.labelLight]}>
        To (MM/DD/YYYY)
      </Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        value={toDate}
        onChangeText={setToDate}
        placeholder="MM/DD/YYYY"
      />

      <Text style={[styles.label, isLight && styles.labelLight]}>
        Employee Filter
      </Text>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            !reportEmployeeId && styles.toggleActive,
            !reportEmployeeId && isLight && styles.toggleActiveLight,
          ]}
          onPress={() => setReportEmployeeId("")}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              !reportEmployeeId && isLight && styles.toggleTextLightActive,
            ]}
          >
            All Employees
          </Text>
        </TouchableOpacity>
        {employees.map((employee) => (
          <TouchableOpacity
            key={`report-filter-${employee.id}`}
            style={[
              styles.togglePill,
              isLight && styles.togglePillLight,
              reportEmployeeId === employee.id && styles.toggleActive,
              reportEmployeeId === employee.id &&
                isLight &&
                styles.toggleActiveLight,
            ]}
            onPress={() => setReportEmployeeId(employee.id)}
          >
            <Text
              style={[
                styles.toggleText,
                isLight && styles.toggleTextLight,
                reportEmployeeId === employee.id &&
                  isLight &&
                  styles.toggleTextLightActive,
              ]}
            >
              {employee.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {reportStatus && (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {inlineOrNull(reportStatus)}
        </Text>
      )}
      <TouchableOpacity
        style={[
          styles.button,
          styles.primary,
          reportLoading && styles.inlineButtonDisabled,
        ]}
        onPress={runReport}
        disabled={reportLoading}
      >
        <Text style={[styles.primaryText, isLight && styles.primaryTextLight]}>
          {reportLoading
            ? inline("Generating...")
            : language === "es"
              ? "Generar Reporte"
              : "Generate Report"}
        </Text>
      </TouchableOpacity>
      <View style={[styles.divider, isLight && styles.dividerLight]} />
      {reportRows.length === 0 ? (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          No report data loaded.
        </Text>
      ) : reportType === "audit" ? (
        reportRows.map((row: any) => (
          <View key={row.id} style={styles.listRow}>
            <View>
              <Text style={[styles.listName, isLight && styles.listNameLight]}>
                {row.employeeName}
              </Text>
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                {row.type}
              </Text>
            </View>
            <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
              {new Date(row.occurredAt).toLocaleString()}
            </Text>
          </View>
        ))
      ) : reportType === "tips" ? (
        reportRows.map((row: any) => (
          <View key={row.id} style={styles.listRow}>
            <View>
              <Text style={[styles.listName, isLight && styles.listNameLight]}>
                {row.name}
              </Text>
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                CC $
                {row.totalCreditCardTips?.toFixed?.(2) ??
                  row.totalCreditCardTips}{" "}
                • Cash ${row.totalCashTips?.toFixed?.(2) ?? row.totalCashTips}
              </Text>
            </View>
            <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
              ${row.totalTips?.toFixed?.(2) ?? row.totalTips}
            </Text>
          </View>
        ))
      ) : (
        reportRows.map((row: any) => (
          <View key={row.id} style={styles.listRow}>
            <View>
              <Text style={[styles.listName, isLight && styles.listNameLight]}>
                {row.name}
              </Text>
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                {row.totalHoursFormatted}
              </Text>
            </View>
            <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
              {row.totalHoursDecimal} hrs
            </Text>
          </View>
        ))
      )}
    </View>
  );

  const renderAlerts = () => (
    <View style={[styles.card, isLight && styles.cardLight]}>
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
        Alerts
      </Text>
      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
        Push notifications include punches, schedule override requests, 6-hour
        no-break alerts, and 7-day tip summaries.
      </Text>
      <View style={[styles.divider, isLight && styles.dividerLight]} />
      <Text style={[styles.listName, isLight && styles.listNameLight]}>
        Send Employee Message
      </Text>
      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
        This message appears as a pop-up the next time the employee clocks in.
      </Text>
      {activeMessageEmployees.length === 0 ? (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          No active employees available.
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.toggleRow, styles.employeeMessageTabs]}
        >
          {activeMessageEmployees.map((employee) => {
            const isActive = employee.id === employeeMessageEmployeeId;
            return (
              <TouchableOpacity
                key={`message-employee-${employee.id}`}
                style={[
                  styles.togglePill,
                  isLight && styles.togglePillLight,
                  isActive && styles.toggleActive,
                  isActive && isLight && styles.toggleActiveLight,
                ]}
                onPress={() => setEmployeeMessageEmployeeId(employee.id)}
              >
                <Text
                  style={[
                    styles.toggleText,
                    isLight && styles.toggleTextLight,
                    isActive && isLight && styles.toggleTextLightActive,
                  ]}
                >
                  {employee.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      <Text style={[styles.label, isLight && styles.labelLight]}>Subject</Text>
      <TextInput
        value={employeeMessageSubject}
        onChangeText={setEmployeeMessageSubject}
        style={[styles.input, isLight && styles.inputLight]}
        placeholder="Subject"
        placeholderTextColor={isLight ? "#94a3b8" : "#64748b"}
        maxLength={120}
      />
      <Text style={[styles.label, isLight && styles.labelLight]}>Message</Text>
      <TextInput
        value={employeeMessageBody}
        onChangeText={setEmployeeMessageBody}
        style={[
          styles.input,
          styles.employeeMessageInput,
          isLight && styles.inputLight,
        ]}
        placeholder="Message for employee"
        placeholderTextColor={isLight ? "#94a3b8" : "#64748b"}
        multiline
        maxLength={2000}
      />
      <TouchableOpacity
        style={[
          styles.button,
          styles.primary,
          employeeMessageSending && styles.inlineButtonDisabled,
        ]}
        onPress={() => {
          void sendEmployeeMessage();
        }}
        disabled={employeeMessageSending}
      >
        <Text style={[styles.primaryText, isLight && styles.primaryTextLight]}>
          {employeeMessageSending
            ? inline("Sending...")
            : language === "es"
              ? "Enviar Mensaje al Empleado"
              : "Send Employee Message"}
        </Text>
      </TouchableOpacity>
      {employeeMessageStatus && (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {inlineOrNull(employeeMessageStatus)}
        </Text>
      )}
      <TouchableOpacity
        style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
        onPress={loadNotifications}
      >
        <Text
          style={[
            styles.secondaryButtonText,
            isLight && styles.secondaryButtonTextLight,
          ]}
        >
          Refresh Alerts
        </Text>
      </TouchableOpacity>
      {alertsStatus && (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {inlineOrNull(alertsStatus)}
        </Text>
      )}
      <View style={[styles.divider, isLight && styles.dividerLight]} />
      {notifications.length === 0 ? (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          No alerts yet.
        </Text>
      ) : (
        notifications.map((notice) => {
          const scheduleOverride = parseScheduleOverrideNotification(notice);
          const canApproveOverride = scheduleOverride?.status === "PENDING";
          const isBusy =
            Boolean(scheduleOverride?.requestId) &&
            scheduleOverrideLoadingId === scheduleOverride.requestId;

          return (
            <View key={notice.id} style={styles.listRow}>
              <View style={styles.reportRowMain}>
                <Text
                  style={[styles.listName, isLight && styles.listNameLight]}
                >
                  {notice.message}
                </Text>
                <Text
                  style={[styles.listMeta, isLight && styles.listMetaLight]}
                >
                  {notice.employeeName ? `${notice.employeeName} • ` : ""}
                  {new Date(notice.createdAt).toLocaleString()}
                </Text>
                {scheduleOverride?.reasonMessage ? (
                  <Text
                    style={[styles.listMeta, isLight && styles.listMetaLight]}
                  >
                    {scheduleOverride.reasonMessage}
                  </Text>
                ) : null}
                {scheduleOverride?.workDate ? (
                  <Text
                    style={[styles.listMeta, isLight && styles.listMetaLight]}
                  >
                    {language === "es" ? "Fecha de trabajo:" : "Work date:"}{" "}
                    {formatDisplayDate(scheduleOverride.workDate)}
                  </Text>
                ) : null}
                {scheduleOverride?.status &&
                scheduleOverride.status !== "PENDING" ? (
                  <Text
                    style={[styles.listMeta, isLight && styles.listMetaLight]}
                  >
                    {language === "es" ? "Estado:" : "Status:"}{" "}
                    {scheduleOverride.status}
                  </Text>
                ) : null}
                {canApproveOverride && scheduleOverride ? (
                  <View style={styles.rowActions}>
                    <TouchableOpacity
                      style={[
                        styles.secondaryButton,
                        styles.actionButtonCompact,
                        isLight && styles.secondaryButtonLight,
                        isBusy && styles.inlineButtonDisabled,
                      ]}
                      disabled={isBusy}
                      onPress={() =>
                        handleScheduleOverrideDecision(
                          scheduleOverride.requestId,
                          true,
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.secondaryButtonText,
                          isLight && styles.secondaryButtonTextLight,
                        ]}
                      >
                        {isBusy ? inline("Working...") : inline("Approve")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.secondaryButton,
                        styles.actionButtonCompact,
                        styles.secondaryButtonDanger,
                        isBusy && styles.inlineButtonDisabled,
                      ]}
                      disabled={isBusy}
                      onPress={() =>
                        handleScheduleOverrideDecision(
                          scheduleOverride.requestId,
                          false,
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.secondaryButtonText,
                          styles.secondaryButtonDangerText,
                        ]}
                      >
                        Reject
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  const renderSchedules = () => (
    <View style={[styles.card, isLight && styles.cardLight]}>
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
        Schedules
      </Text>
      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
        Schedule for {selectedScheduleEmployee?.name || "employee"}
      </Text>
      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
        Enable days an employee is allowed to clock in. Optional start/end times
        can restrict clock-ins to a window.
      </Text>

      <View
        style={[
          styles.scheduleTodayCard,
          isLight && styles.scheduleTodayCardLight,
        ]}
      >
        <View style={styles.scheduleTodayHeader}>
          <View style={styles.scheduleTodayTitleWrap}>
            <Text
              style={[
                styles.scheduleTodayTitle,
                isLight && styles.scheduleTodayTitleLight,
              ]}
            >
              Today's Team
            </Text>
            <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
              {todayScheduleLabel}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              isLight && styles.secondaryButtonLight,
              styles.actionButtonCompact,
              todayScheduleLoading && styles.inlineButtonDisabled,
            ]}
            onPress={() => {
              void loadTodaySchedule();
            }}
            disabled={todayScheduleLoading}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                isLight && styles.secondaryButtonTextLight,
              ]}
            >
              {todayScheduleLoading
                ? inline("Refreshing...")
                : language === "es"
                  ? "Actualizar"
                  : "Refresh"}
            </Text>
          </TouchableOpacity>
        </View>

        {todayScheduleStatus ? (
          <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
            {inlineOrNull(todayScheduleStatus)}
          </Text>
        ) : (
          <>
            <View style={[styles.toggleRow, styles.scheduleRoleTabs]}>
              {todayRoleTabs.map((role) => (
                <TouchableOpacity
                  key={`schedule-role-${role}`}
                  style={[
                    styles.togglePill,
                    isLight && styles.togglePillLight,
                    activeTodayRoleFilter === role && styles.toggleActive,
                    activeTodayRoleFilter === role &&
                      isLight &&
                      styles.toggleActiveLight,
                  ]}
                  onPress={() => setTodayRoleFilter(role)}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      isLight && styles.toggleTextLight,
                      activeTodayRoleFilter === role &&
                        isLight &&
                        styles.toggleTextLightActive,
                    ]}
                  >
                    {role}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {filteredTodayScheduleRows.length === 0 ? (
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                No employees are scheduled for this role today.
              </Text>
            ) : (
              filteredTodayScheduleRows.map((row) => (
                <View
                  key={`today-${row.employeeId}`}
                  style={[
                    styles.scheduleTodayRow,
                    isLight && styles.scheduleTodayRowLight,
                  ]}
                >
                  <View style={styles.scheduleTodayRowMain}>
                    <Text
                      style={[styles.listName, isLight && styles.listNameLight]}
                    >
                      {row.employeeName}
                    </Text>
                    <Text
                      style={[styles.listMeta, isLight && styles.listMetaLight]}
                    >
                      {row.roleLabel} • {row.officeName || "All locations"}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.scheduleTodayShift,
                      isLight && styles.scheduleTodayShiftLight,
                    ]}
                  >
                    {formatScheduleShiftLabel(row.startTime, row.endTime)}
                  </Text>
                </View>
              ))
            )}
          </>
        )}
      </View>

      <Text style={[styles.label, isLight && styles.labelLight]}>Employee</Text>
      <TouchableOpacity
        style={[
          styles.scheduleEmployeePicker,
          isLight && styles.scheduleEmployeePickerLight,
        ]}
        disabled={employees.length === 0}
        onPress={() => setScheduleEmployeePickerOpen((previous) => !previous)}
      >
        <Text
          style={[
            styles.scheduleEmployeePickerText,
            isLight && styles.scheduleEmployeePickerTextLight,
          ]}
        >
          {selectedScheduleEmployee?.name || "Select employee"}
        </Text>
        <Text
          style={[
            styles.scheduleEmployeePickerArrow,
            isLight && styles.scheduleEmployeePickerTextLight,
          ]}
        >
          {scheduleEmployeePickerOpen ? "▲" : "▼"}
        </Text>
      </TouchableOpacity>
      {scheduleEmployeePickerOpen && (
        <View
          style={[
            styles.scheduleEmployeeMenu,
            isLight && styles.scheduleEmployeeMenuLight,
          ]}
        >
          <TextInput
            style={[
              styles.scheduleEmployeeSearchInput,
              isLight && styles.scheduleEmployeeSearchInputLight,
            ]}
            placeholder="Search employee..."
            placeholderTextColor={isLight ? "#64748b" : "#94a3b8"}
            value={scheduleEmployeeSearch}
            onChangeText={setScheduleEmployeeSearch}
          />
          <ScrollView
            style={styles.scheduleEmployeeList}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {filteredScheduleEmployees.length === 0 ? (
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                No employees found.
              </Text>
            ) : (
              filteredScheduleEmployees.map((employee) => (
                <TouchableOpacity
                  key={employee.id}
                  style={[
                    styles.scheduleEmployeeItem,
                    isLight && styles.scheduleEmployeeItemLight,
                    scheduleEmployeeId === employee.id &&
                      styles.scheduleEmployeeItemActive,
                    scheduleEmployeeId === employee.id &&
                      isLight &&
                      styles.scheduleEmployeeItemActiveLight,
                  ]}
                  onPress={() => {
                    setScheduleEmployeeId(employee.id);
                    setScheduleEmployeePickerOpen(false);
                    setScheduleEmployeeSearch("");
                  }}
                >
                  <Text
                    style={[
                      styles.scheduleEmployeeItemText,
                      isLight && styles.scheduleEmployeeItemTextLight,
                      scheduleEmployeeId === employee.id &&
                        styles.scheduleEmployeeItemTextActive,
                    ]}
                  >
                    {employee.name}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {scheduleDays.map((day) => {
        const startParts = parseScheduleTimeParts(day.startTime || "09:00");
        const endParts = parseScheduleTimeParts(day.endTime || "17:00");
        return (
          <View key={day.weekday} style={styles.scheduleRow}>
            <TouchableOpacity
              style={[
                styles.scheduleToggle,
                isLight && styles.scheduleToggleLight,
                day.enabled && styles.scheduleToggleActive,
              ]}
              onPress={() =>
                updateScheduleDay(day.weekday, "enabled", !day.enabled)
              }
            >
              <Text
                style={[
                  styles.scheduleToggleText,
                  isLight && styles.scheduleToggleTextLight,
                  day.enabled && styles.scheduleToggleTextActive,
                ]}
              >
                {day.label}
              </Text>
            </TouchableOpacity>
            <View style={styles.scheduleTimes}>
              <View
                style={[
                  styles.scheduleTimeCard,
                  isLight && styles.scheduleTimeCardLight,
                  !day.enabled && styles.scheduleInputDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.scheduleTimeLabel,
                    isLight && styles.listMetaLight,
                  ]}
                >
                  Start
                </Text>
                <Text
                  style={[
                    styles.scheduleTimeValue,
                    isLight && styles.listNameLight,
                  ]}
                >
                  {formatScheduleTimeLabel(day.startTime || "09:00")}
                </Text>
                <View style={styles.scheduleControlRow}>
                  <TouchableOpacity
                    style={[
                      styles.scheduleStepButton,
                      isLight && styles.scheduleStepButtonLight,
                    ]}
                    disabled={!day.enabled}
                    onPress={() =>
                      adjustScheduleTime(day.weekday, "startTime", "hour", -1)
                    }
                  >
                    <Text
                      style={[
                        styles.scheduleStepButtonText,
                        isLight && styles.scheduleStepButtonTextLight,
                      ]}
                    >
                      -H
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.scheduleStepButton,
                      isLight && styles.scheduleStepButtonLight,
                    ]}
                    disabled={!day.enabled}
                    onPress={() =>
                      adjustScheduleTime(day.weekday, "startTime", "hour", 1)
                    }
                  >
                    <Text
                      style={[
                        styles.scheduleStepButtonText,
                        isLight && styles.scheduleStepButtonTextLight,
                      ]}
                    >
                      +H
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.scheduleStepButton,
                      isLight && styles.scheduleStepButtonLight,
                    ]}
                    disabled={!day.enabled}
                    onPress={() =>
                      adjustScheduleTime(day.weekday, "startTime", "minute", -1)
                    }
                  >
                    <Text
                      style={[
                        styles.scheduleStepButtonText,
                        isLight && styles.scheduleStepButtonTextLight,
                      ]}
                    >
                      -M
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.scheduleStepButton,
                      isLight && styles.scheduleStepButtonLight,
                    ]}
                    disabled={!day.enabled}
                    onPress={() =>
                      adjustScheduleTime(day.weekday, "startTime", "minute", 1)
                    }
                  >
                    <Text
                      style={[
                        styles.scheduleStepButtonText,
                        isLight && styles.scheduleStepButtonTextLight,
                      ]}
                    >
                      +M
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.scheduleMeridiemGroup}>
                    {(["AM", "PM"] as const).map((option) => (
                      <TouchableOpacity
                        key={`start-${day.weekday}-${option}`}
                        style={[
                          styles.scheduleMeridiemButton,
                          isLight && styles.scheduleMeridiemButtonLight,
                          startParts.meridiem === option &&
                            styles.scheduleMeridiemButtonActive,
                          startParts.meridiem === option &&
                            isLight &&
                            styles.scheduleMeridiemButtonActiveLight,
                        ]}
                        disabled={!day.enabled}
                        onPress={() =>
                          setScheduleMeridiem(day.weekday, "startTime", option)
                        }
                      >
                        <Text
                          style={[
                            styles.scheduleMeridiemText,
                            isLight && styles.scheduleMeridiemTextLight,
                            startParts.meridiem === option &&
                              styles.scheduleMeridiemTextActive,
                          ]}
                        >
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
              <View
                style={[
                  styles.scheduleTimeCard,
                  isLight && styles.scheduleTimeCardLight,
                  !day.enabled && styles.scheduleInputDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.scheduleTimeLabel,
                    isLight && styles.listMetaLight,
                  ]}
                >
                  End
                </Text>
                <Text
                  style={[
                    styles.scheduleTimeValue,
                    isLight && styles.listNameLight,
                  ]}
                >
                  {formatScheduleTimeLabel(day.endTime || "17:00")}
                </Text>
                <View style={styles.scheduleControlRow}>
                  <TouchableOpacity
                    style={[
                      styles.scheduleStepButton,
                      isLight && styles.scheduleStepButtonLight,
                    ]}
                    disabled={!day.enabled}
                    onPress={() =>
                      adjustScheduleTime(day.weekday, "endTime", "hour", -1)
                    }
                  >
                    <Text
                      style={[
                        styles.scheduleStepButtonText,
                        isLight && styles.scheduleStepButtonTextLight,
                      ]}
                    >
                      -H
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.scheduleStepButton,
                      isLight && styles.scheduleStepButtonLight,
                    ]}
                    disabled={!day.enabled}
                    onPress={() =>
                      adjustScheduleTime(day.weekday, "endTime", "hour", 1)
                    }
                  >
                    <Text
                      style={[
                        styles.scheduleStepButtonText,
                        isLight && styles.scheduleStepButtonTextLight,
                      ]}
                    >
                      +H
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.scheduleStepButton,
                      isLight && styles.scheduleStepButtonLight,
                    ]}
                    disabled={!day.enabled}
                    onPress={() =>
                      adjustScheduleTime(day.weekday, "endTime", "minute", -1)
                    }
                  >
                    <Text
                      style={[
                        styles.scheduleStepButtonText,
                        isLight && styles.scheduleStepButtonTextLight,
                      ]}
                    >
                      -M
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.scheduleStepButton,
                      isLight && styles.scheduleStepButtonLight,
                    ]}
                    disabled={!day.enabled}
                    onPress={() =>
                      adjustScheduleTime(day.weekday, "endTime", "minute", 1)
                    }
                  >
                    <Text
                      style={[
                        styles.scheduleStepButtonText,
                        isLight && styles.scheduleStepButtonTextLight,
                      ]}
                    >
                      +M
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.scheduleMeridiemGroup}>
                    {(["AM", "PM"] as const).map((option) => (
                      <TouchableOpacity
                        key={`end-${day.weekday}-${option}`}
                        style={[
                          styles.scheduleMeridiemButton,
                          isLight && styles.scheduleMeridiemButtonLight,
                          endParts.meridiem === option &&
                            styles.scheduleMeridiemButtonActive,
                          endParts.meridiem === option &&
                            isLight &&
                            styles.scheduleMeridiemButtonActiveLight,
                        ]}
                        disabled={!day.enabled}
                        onPress={() =>
                          setScheduleMeridiem(day.weekday, "endTime", option)
                        }
                      >
                        <Text
                          style={[
                            styles.scheduleMeridiemText,
                            isLight && styles.scheduleMeridiemTextLight,
                            endParts.meridiem === option &&
                              styles.scheduleMeridiemTextActive,
                          ]}
                        >
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          </View>
        );
      })}
      {scheduleStatus && (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {inlineOrNull(scheduleStatus)}
        </Text>
      )}
      <TouchableOpacity
        style={[styles.button, styles.primary]}
        onPress={saveSchedule}
      >
        <Text style={[styles.primaryText, isLight && styles.primaryTextLight]}>
          {language === "es" ? "Guardar Horario" : "Save Schedule"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCompanyOrders = () => (
    <View style={[styles.card, isLight && styles.cardLight]}>
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
        Company Orders
      </Text>
      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
        Supplier catalog imported from your Excel. Kitchen managers and
        managers can submit orders here.
      </Text>
      <View style={styles.companyOrderExportRow}>
        <TouchableOpacity
          style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
          disabled={companyOrderExportingFormat !== null}
          onPress={() => {
            void handleCompanyOrderExport("pdf");
          }}
        >
          <Text
            style={[
              styles.secondaryButtonText,
              isLight && styles.secondaryButtonTextLight,
            ]}
          >
            {companyOrderExportingFormat === "pdf"
              ? inline("Preparing...")
              : language === "es"
                ? "Descargar PDF"
                : "Download PDF"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
          disabled={companyOrderExportingFormat !== null}
          onPress={() => {
            void handleCompanyOrderExport("csv");
          }}
        >
          <Text
            style={[
              styles.secondaryButtonText,
              isLight && styles.secondaryButtonTextLight,
            ]}
          >
            {companyOrderExportingFormat === "csv"
              ? inline("Preparing...")
              : language === "es"
                ? "Descargar CSV"
                : "Download CSV"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
          disabled={companyOrderExportingFormat !== null}
          onPress={() => {
            void handleCompanyOrderExport("excel");
          }}
        >
          <Text
            style={[
              styles.secondaryButtonText,
              isLight && styles.secondaryButtonTextLight,
            ]}
          >
            {companyOrderExportingFormat === "excel"
              ? inline("Preparing...")
              : language === "es"
                ? "Descargar Excel"
                : "Download Excel"}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.label, isLight && styles.labelLight]}>Supplier</Text>
      <View style={styles.toggleRow}>
        {companyOrderCatalog.map((supplier) => {
          const isActive = supplier.supplierName === companyOrderSupplier;
          const supplierSelectedCount = Object.values(
            companyOrderDrafts[supplier.supplierName] || {},
          ).filter((value) => Number(value) > 0).length;
          return (
            <TouchableOpacity
              key={`company-supplier-${supplier.supplierName}`}
              style={[
                styles.togglePill,
                isLight && styles.togglePillLight,
                isActive && styles.toggleActive,
                isActive && isLight && styles.toggleActiveLight,
              ]}
              onPress={() => setCompanyOrderSupplier(supplier.supplierName)}
            >
              <Text
                style={[
                  styles.toggleText,
                  isLight && styles.toggleTextLight,
                  isActive && isLight && styles.toggleTextLightActive,
                ]}
              >
                {supplier.supplierName}
                {supplierSelectedCount > 0
                  ? ` (${supplierSelectedCount})`
                  : ""}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={[styles.label, isLight && styles.labelLight]}>
        Search Item
      </Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        value={companyOrderSearch}
        onChangeText={setCompanyOrderSearch}
        placeholder="Search Spanish or English name"
      />
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            !companyOrderShowOnlyAdded && styles.toggleActive,
            !companyOrderShowOnlyAdded && isLight && styles.toggleActiveLight,
          ]}
          onPress={() => setCompanyOrderShowOnlyAdded(false)}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              !companyOrderShowOnlyAdded && isLight && styles.toggleTextLightActive,
            ]}
          >
            All Items
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            companyOrderShowOnlyAdded && styles.toggleActive,
            companyOrderShowOnlyAdded && isLight && styles.toggleActiveLight,
          ]}
          onPress={() => setCompanyOrderShowOnlyAdded(true)}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              companyOrderShowOnlyAdded && isLight && styles.toggleTextLightActive,
            ]}
          >
            In Cart
          </Text>
        </TouchableOpacity>
      </View>
      {selectedCompanyOrderSupplier ? (
        <View style={styles.companyOrderItemsWrap}>
          {visibleCompanyOrderItems.length === 0 ? (
            <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
              No matching catalog items.
            </Text>
          ) : (
            visibleCompanyOrderItems.map((item) => {
              const key = companyOrderItemKey(item.nameEs, item.nameEn);
              return (
                <View key={`company-item-${key}`} style={styles.listRow}>
                  <View style={styles.reportRowMain}>
                    <Text
                      style={[styles.listName, isLight && styles.listNameLight]}
                    >
                      {item.nameEs}
                    </Text>
                    <Text
                      style={[styles.listMeta, isLight && styles.listMetaLight]}
                    >
                      {item.nameEn}
                    </Text>
                  </View>
                  {Number(selectedCompanySupplierDraft[key] || "0") > 0 ? (
                    <Text
                      style={[styles.listMeta, isLight && styles.listMetaLight]}
                    >
                      Qty {selectedCompanySupplierDraft[key]}
                    </Text>
                  ) : null}
                  <TouchableOpacity
                    style={[
                      styles.companyOrderAddButton,
                      isLight && styles.companyOrderAddButtonLight,
                    ]}
                    onPress={() => handleCompanyOrderAddItem(item)}
                  >
                    <Text
                      style={[
                        styles.companyOrderAddButtonText,
                        isLight && styles.companyOrderAddButtonTextLight,
                      ]}
                    >
                      Add
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
          {hasMoreCompanyOrderItems ? (
            <TouchableOpacity
              style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
              onPress={() =>
                setCompanyOrderVisibleCount((current) => current + 16)
              }
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  isLight && styles.secondaryButtonTextLight,
                ]}
              >
                Show More
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          No suppliers loaded.
        </Text>
      )}
      <View style={styles.companyOrderCartSection}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Text style={[styles.listName, isLight && styles.listNameLight]}>
            Order Summary
          </Text>
          <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
            {selectedCompanyOrderCount} items • Qty {selectedCompanyOrderTotalUnits}
          </Text>
        </View>
        {companyOrderCartItems.length === 0 ? (
          <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
            No items added yet.
          </Text>
        ) : (
          companyOrderCartItems.map((item) => (
            <View
              key={`company-cart-${item.supplierName}-${item.key}`}
              style={styles.companyOrderCartRow}
            >
              <View style={styles.reportRowMain}>
                <Text style={[styles.listName, isLight && styles.listNameLight]}>
                  {item.nameEs}
                </Text>
                <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                  {item.nameEn} • {item.supplierName}
                </Text>
              </View>
              <View style={styles.companyOrderCartActions}>
                <TouchableOpacity
                  style={[
                    styles.companyOrderStepButton,
                    isLight && styles.companyOrderStepButtonLight,
                  ]}
                  onPress={() =>
                    handleCompanyOrderStepItem(item.supplierName, item.key, -1)
                  }
                >
                  <Text
                    style={[
                      styles.companyOrderStepButtonText,
                      isLight && styles.companyOrderStepButtonTextLight,
                    ]}
                  >
                    -
                  </Text>
                </TouchableOpacity>
                <View
                  style={[
                    styles.companyOrderQtyBadge,
                    isLight && styles.companyOrderQtyBadgeLight,
                  ]}
                >
                  <Text
                    style={[
                      styles.companyOrderQtyBadgeText,
                      isLight && styles.companyOrderQtyBadgeTextLight,
                    ]}
                  >
                    {Number(item.quantity.toFixed(2))}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.companyOrderStepButton,
                    isLight && styles.companyOrderStepButtonLight,
                  ]}
                  onPress={() =>
                    handleCompanyOrderStepItem(item.supplierName, item.key, 1)
                  }
                >
                  <Text
                    style={[
                      styles.companyOrderStepButtonText,
                      isLight && styles.companyOrderStepButtonTextLight,
                    ]}
                  >
                    +
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.companyOrderRemoveButton,
                    isLight && styles.companyOrderRemoveButtonLight,
                  ]}
                  onPress={() =>
                    handleCompanyOrderRemoveItem(item.supplierName, item.key)
                  }
                >
                  <Text
                    style={[
                      styles.companyOrderRemoveButtonText,
                      isLight && styles.companyOrderRemoveButtonTextLight,
                    ]}
                  >
                    Remove
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
      <Text style={[styles.label, isLight && styles.labelLight]}>Notes</Text>
      <TextInput
        style={[
          styles.input,
          styles.employeeMessageInput,
          isLight && styles.inputLight,
        ]}
        value={companyOrderNotes}
        onChangeText={setCompanyOrderNotes}
        placeholder="Order notes"
        multiline
      />
      <TouchableOpacity
        style={[
          styles.button,
          styles.primary,
          companyOrderSaving && styles.inlineButtonDisabled,
        ]}
        onPress={() => {
          void submitCompanyOrder();
        }}
        disabled={companyOrderSaving}
      >
        <Text style={[styles.primaryText, isLight && styles.primaryTextLight]}>
          {companyOrderSaving
            ? inline("Submitting...")
            : language === "es"
              ? `Enviar Orden de Empresa (${selectedCompanyOrderSupplierCount} proveedores / ${selectedCompanyOrderCount} artículos)`
              : `Submit Company Order (${selectedCompanyOrderSupplierCount} suppliers / ${selectedCompanyOrderCount} items)`}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
        onPress={() => {
          void loadCompanyOrders();
        }}
      >
        <Text
          style={[
            styles.secondaryButtonText,
            isLight && styles.secondaryButtonTextLight,
          ]}
        >
          {companyOrderLoading
            ? inline("Refreshing...")
            : inline("Refresh Orders")}
        </Text>
      </TouchableOpacity>
      {companyOrderStatus && (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {inlineOrNull(companyOrderStatus)}
        </Text>
      )}
      <View style={[styles.divider, isLight && styles.dividerLight]} />
      <Text style={[styles.listName, isLight && styles.listNameLight]}>
        Recent Orders
      </Text>
      {companyOrderRows.length === 0 ? (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          No orders yet.
        </Text>
      ) : (
        companyOrderRows.map((order) => (
          <View key={`company-order-${order.id}`} style={styles.listRow}>
            <View style={styles.reportRowMain}>
              <Text style={[styles.listName, isLight && styles.listNameLight]}>
                {order.supplierName}
              </Text>
              {order.orderLabel ? (
                <Text
                  style={[styles.listMeta, isLight && styles.listMetaLight]}
                >
                  {order.orderLabel}
                </Text>
              ) : null}
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                {formatDisplayDate(order.orderDate.slice(0, 10))} •{" "}
                {order.itemCount} items
              </Text>
              {Array.isArray(order.contributors) &&
              order.contributors.length > 0 ? (
                <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                  Contributors: {order.contributors.join(", ")}
                </Text>
              ) : null}
              <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                Qty {order.totalQuantity} •{" "}
                {order.officeName || "All locations"}
              </Text>
              {order.notes ? (
                <Text
                  style={[styles.listMeta, isLight && styles.listMetaLight]}
                >
                  {order.notes}
                </Text>
              ) : null}
            </View>
          </View>
        ))
      )}
      <View style={[styles.divider, isLight && styles.dividerLight]} />
      <Text style={[styles.listName, isLight && styles.listNameLight]}>
        Liquor Control
      </Text>
      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
        Manager-only liquor inventory by row: company, price, qty/ml, bar,
        bodega, inventario, total.
      </Text>
      {!liquorInventoryEnabled ? (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          Liquor inventory is disabled for this tenant.
        </Text>
      ) : !hasLiquorManagerAccess ? (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          Manager account with reports access is required.
        </Text>
      ) : (
        <>
          <View style={styles.companyOrderExportRow}>
            <TouchableOpacity
              style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
              disabled={liquorLoading}
              onPress={() => {
                void loadLiquorControlData();
              }}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  isLight && styles.secondaryButtonTextLight,
                ]}
              >
                {liquorLoading
                  ? inline("Refreshing...")
                  : inline("Refresh Liquor")}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.label, isLight && styles.labelLight]}>Count Date</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={liquorCountDate}
            onChangeText={setLiquorCountDate}
            placeholder="YYYY-MM-DD"
          />
          <Text style={[styles.label, isLight && styles.labelLight]}>
            Container Key
          </Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={liquorScanContainerKey}
            onChangeText={setLiquorScanContainerKey}
            placeholder="bar-1 (optional)"
          />
          {!hasLiquorPremiumAccess ? (
            <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
              {inline("Premium liquor features are disabled for this tenant.")}
            </Text>
          ) : (
            <>
              <Text style={[styles.listName, isLight && styles.listNameLight]}>
                {inline("Invoice OCR + Cost Shock")}
              </Text>
              <Text style={[styles.label, isLight && styles.labelLight]}>
                {inline("Invoice Date")}
              </Text>
              <TextInput
                style={[styles.input, isLight && styles.inputLight]}
                value={liquorInvoiceDate}
                onChangeText={setLiquorInvoiceDate}
                placeholder="YYYY-MM-DD"
              />
              <Text style={[styles.label, isLight && styles.labelLight]}>
                {inline("Invoice #")}
              </Text>
              <TextInput
                style={[styles.input, isLight && styles.inputLight]}
                value={liquorInvoiceNumber}
                onChangeText={setLiquorInvoiceNumber}
                placeholder="INV-1001"
              />
              <Text style={[styles.label, isLight && styles.labelLight]}>
                {inline("Supplier")}
              </Text>
              <TextInput
                style={[styles.input, isLight && styles.inputLight]}
                value={liquorInvoiceSupplier}
                onChangeText={setLiquorInvoiceSupplier}
                placeholder="Supplier"
              />
              <Text style={[styles.label, isLight && styles.labelLight]}>
                {inline("Notes")}
              </Text>
              <TextInput
                style={[styles.input, isLight && styles.inputLight]}
                value={liquorInvoiceNotes}
                onChangeText={setLiquorInvoiceNotes}
                placeholder="Optional notes"
              />
              <TouchableOpacity
                style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
                onPress={() =>
                  setLiquorInvoiceIncludePurchases((previous) => !previous)
                }
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    isLight && styles.secondaryButtonTextLight,
                  ]}
                >
                  {liquorInvoiceIncludePurchases ? "✓ " : "○ "}
                  {inline("Create purchase movements")}
                </Text>
              </TouchableOpacity>
              <View style={styles.companyOrderExportRow}>
                <TouchableOpacity
                  style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
                  onPress={() => {
                    void pickLiquorInvoicePhoto();
                  }}
                >
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      isLight && styles.secondaryButtonTextLight,
                    ]}
                  >
                    {inline("Invoice Photo")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
                  disabled={liquorInvoiceAnalyzing}
                  onPress={() => {
                    void analyzeLiquorInvoicePhoto();
                  }}
                >
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      isLight && styles.secondaryButtonTextLight,
                    ]}
                  >
                    {liquorInvoiceAnalyzing
                      ? inline("Preparing...")
                      : inline("Analyze Invoice")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
                  disabled={liquorInvoiceApplying}
                  onPress={() => {
                    void applyLiquorInvoiceRows();
                  }}
                >
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      isLight && styles.secondaryButtonTextLight,
                    ]}
                  >
                    {liquorInvoiceApplying
                      ? inline("Preparing...")
                      : inline("Apply Invoice Rows")}
                  </Text>
                </TouchableOpacity>
              </View>
              {liquorInvoiceImageName ? (
                <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                  {inline("Invoice Photo")}: {liquorInvoiceImageName}
                </Text>
              ) : null}
              {liquorInvoiceRows.length === 0 ? (
                <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                  {inline("No invoice rows extracted yet.")}
                </Text>
              ) : (
                liquorInvoiceRows.slice(0, 12).map((row) => (
                  <View
                    key={`liquor-invoice-row-${row.rowNumber}-${row.liquorName}`}
                    style={styles.listRow}
                  >
                    <View style={styles.reportRowMain}>
                      <Text style={[styles.listName, isLight && styles.listNameLight]}>
                        {row.liquorName}
                      </Text>
                      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                        {row.company || "-"} • {row.kind || "-"} •{" "}
                        {row.quantity === null ? "-" : row.quantity}
                      </Text>
                      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                        {inline("Match")}: {row.matchedItemName || row.suggestedAction} •{" "}
                        {inline("Severity")}: {row.costShockSeverity}
                        {row.costShockDeltaPct !== null
                          ? ` • ${(row.costShockDeltaPct * 100).toFixed(1)}%`
                          : ""}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </>
          )}
          {liquorStatus ? (
            <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
              {inlineOrNull(liquorStatus)}
            </Text>
          ) : null}
          {liquorSheetRows.length === 0 ? (
            <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
              No liquor items yet.
            </Text>
          ) : (
            liquorSheetRows.map((row) => {
              const draft = liquorSheetDrafts[row.item.id] || {
                supplierName: row.item.supplierName || "",
                unitCost: String(row.item.unitCost || ""),
                sizeMl: row.item.sizeMl === null ? "" : String(row.item.sizeMl),
                barQuantity: String(row.barQuantity || ""),
                bodegaQuantity: String(row.bodegaQuantity || ""),
              };
              const isSavingItem = liquorSavingItemId === row.item.id;
              const isSavingCount = liquorSavingCountItemId === row.item.id;
              const isAnalyzing = liquorAnalyzingItemId === row.item.id;
              return (
                <View key={`liquor-row-${row.item.id}`} style={styles.listRow}>
                  <View style={styles.reportRowMain}>
                    <Text style={[styles.listName, isLight && styles.listNameLight]}>
                      {row.item.name}
                    </Text>
                    <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                      {row.item.brand || "Liquor item"}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 8,
                    }}
                  >
                    <View style={{ width: "48%" }}>
                      <Text style={[styles.label, isLight && styles.labelLight]}>
                        Company
                      </Text>
                      <TextInput
                        style={[styles.input, isLight && styles.inputLight]}
                        value={draft.supplierName}
                        onChangeText={(value) =>
                          updateLiquorSheetDraft(
                            row.item.id,
                            "supplierName",
                            value,
                          )
                        }
                        placeholder="Supplier"
                      />
                    </View>
                    <View style={{ width: "48%" }}>
                      <Text style={[styles.label, isLight && styles.labelLight]}>
                        Price
                      </Text>
                      <TextInput
                        style={[styles.input, isLight && styles.inputLight]}
                        value={draft.unitCost}
                        onChangeText={(value) =>
                          updateLiquorSheetDraft(row.item.id, "unitCost", value)
                        }
                        keyboardType="decimal-pad"
                        inputMode="decimal"
                        placeholder="0.00"
                      />
                    </View>
                    <View style={{ width: "30%" }}>
                      <Text style={[styles.label, isLight && styles.labelLight]}>
                        Qty/ML
                      </Text>
                      <TextInput
                        style={[styles.input, isLight && styles.inputLight]}
                        value={draft.sizeMl}
                        onChangeText={(value) =>
                          updateLiquorSheetDraft(row.item.id, "sizeMl", value)
                        }
                        keyboardType="decimal-pad"
                        inputMode="decimal"
                        placeholder="750"
                      />
                    </View>
                    <View style={{ width: "30%" }}>
                      <Text style={[styles.label, isLight && styles.labelLight]}>
                        Bar
                      </Text>
                      <TextInput
                        style={[styles.input, isLight && styles.inputLight]}
                        value={draft.barQuantity}
                        onChangeText={(value) =>
                          updateLiquorSheetDraft(row.item.id, "barQuantity", value)
                        }
                        keyboardType="decimal-pad"
                        inputMode="decimal"
                        placeholder="0"
                      />
                    </View>
                    <View style={{ width: "30%" }}>
                      <Text style={[styles.label, isLight && styles.labelLight]}>
                        Bodega
                      </Text>
                      <TextInput
                        style={[styles.input, isLight && styles.inputLight]}
                        value={draft.bodegaQuantity}
                        onChangeText={(value) =>
                          updateLiquorSheetDraft(
                            row.item.id,
                            "bodegaQuantity",
                            value,
                          )
                        }
                        keyboardType="decimal-pad"
                        inputMode="decimal"
                        placeholder="0"
                      />
                    </View>
                    <View style={{ width: "46%" }}>
                      <Text style={[styles.label, isLight && styles.labelLight]}>
                        Inventario
                      </Text>
                      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                        {row.inventory.toFixed(3)}
                      </Text>
                    </View>
                    <View style={{ width: "46%" }}>
                      <Text style={[styles.label, isLight && styles.labelLight]}>
                        Total
                      </Text>
                      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                        {row.total === null ? "-" : `$${row.total.toFixed(2)}`}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 8,
                    }}
                  >
                    <TouchableOpacity
                      style={[
                        styles.secondaryButton,
                        isLight && styles.secondaryButtonLight,
                      ]}
                      disabled={isSavingItem}
                      onPress={() => {
                        void saveLiquorCatalogRow(row.item.id);
                      }}
                    >
                      <Text
                        style={[
                          styles.secondaryButtonText,
                          isLight && styles.secondaryButtonTextLight,
                        ]}
                      >
                        {isSavingItem
                          ? inline("Saving...")
                          : inline("Save Item")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.secondaryButton,
                        isLight && styles.secondaryButtonLight,
                      ]}
                      disabled={isSavingCount}
                      onPress={() => {
                        void saveLiquorCountRow(row.item.id);
                      }}
                    >
                      <Text
                        style={[
                          styles.secondaryButtonText,
                          isLight && styles.secondaryButtonTextLight,
                        ]}
                      >
                        {isSavingCount
                          ? inline("Saving...")
                          : inline("Save Count")}
                      </Text>
                    </TouchableOpacity>
                    {hasLiquorPremiumAccess ? (
                      <TouchableOpacity
                        style={[
                          styles.secondaryButton,
                          isLight && styles.secondaryButtonLight,
                        ]}
                        disabled={isAnalyzing}
                        onPress={() => {
                          void analyzeLiquorBottleForItem(row.item.id);
                        }}
                      >
                        <Text
                          style={[
                            styles.secondaryButtonText,
                            isLight && styles.secondaryButtonTextLight,
                          ]}
                        >
                          {isAnalyzing
                            ? language === "es"
                              ? "Analizando..."
                              : "Analyzing..."
                            : inline("Scan Bottle")}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
          {hasLiquorPremiumAccess ? (
            <>
              <Text style={[styles.listName, isLight && styles.listNameLight]}>
                Bottle Scan History
              </Text>
              {liquorBottleScans.length === 0 ? (
                <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                  No bottle scans yet.
                </Text>
              ) : (
                liquorBottleScans.slice(0, 12).map((scan) => (
                  <View key={`liquor-scan-${scan.id}`} style={styles.listRow}>
                    <View style={styles.reportRowMain}>
                      <Text style={[styles.listName, isLight && styles.listNameLight]}>
                        {scan.itemName}
                      </Text>
                      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                        {formatDisplayDate(scan.measuredAt.slice(0, 10))} • Fill{" "}
                        {scan.fillPercent.toFixed(1)}%
                      </Text>
                      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
                        Est. ml{" "}
                        {scan.estimatedMl === null ? "-" : scan.estimatedMl.toFixed(1)}
                        {scan.containerKey ? ` • ${scan.containerKey}` : ""}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </>
          ) : null}
        </>
      )}
    </View>
  );

  const renderContent = () => {
    if (!loggedIn) return renderLogin();
    switch (screen) {
      case "dashboard":
        return renderDashboard();
      case "users":
        return renderUsers();
      case "offices":
        return renderOffices();
      case "groups":
        return renderGroups();
      case "capture":
        return renderCapture();
      case "reports":
        return renderReports();
      case "alerts":
        return renderAlerts();
      case "schedules":
        return renderSchedules();
      case "companyOrders":
        return renderCompanyOrders();
      default:
        return renderDashboard();
    }
  };

  const themeColors = useMemo(() => {
    if (theme === "light") {
      return ["#eef2f7", "#e6ebf3", "#dde3ee"] as const;
    }
    return ["#0c121d", "#141b2a", "#1c2334"] as const;
  }, [theme]);
  const isLight = theme === "light";
  const activeApiLabel = useMemo(
    () => formatApiBaseLabel(resolvedApiBase || apiBaseCandidates[0] || ""),
    [resolvedApiBase],
  );

  return (
    <LinearGradient colors={themeColors} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.keyboardWrap}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
            automaticallyAdjustKeyboardInsets
          >
            <View style={styles.brandRow}>
              <Image
                source={BRAND_LOGO}
                style={styles.brandLogo}
                resizeMode="contain"
              />
              <View style={styles.brandTextBlock}>
                <Text style={[styles.title, isLight && styles.titleLight]}>
                  ClockIn Admin
                </Text>
                <Text
                  style={[styles.subtitle, isLight && styles.subtitleLight]}
                >
                  {text.subtitle}
                </Text>
              </View>
              <View style={styles.headerActions}>
                <View
                  style={[
                    styles.languageSelector,
                    isLight && styles.languageSelectorLight,
                  ]}
                >
                  <Text
                    style={[
                      styles.languageLabel,
                      isLight && styles.languageLabelLight,
                    ]}
                  >
                    {text.language}
                  </Text>
                  {(["en", "es"] as Lang[]).map((langOption) => (
                    <TouchableOpacity
                      key={langOption}
                      style={[
                        styles.languageOption,
                        isLight && styles.languageOptionLight,
                        language === langOption &&
                          (isLight
                            ? styles.languageOptionActiveLight
                            : styles.languageOptionActive),
                      ]}
                      onPress={() => setLanguage(langOption)}
                    >
                      <Text
                        style={[
                          styles.languageOptionText,
                          isLight && styles.languageOptionTextLight,
                          language === langOption &&
                            styles.languageOptionTextActive,
                        ]}
                      >
                        {langOption.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={[
                    styles.themeToggle,
                    isLight && styles.themeToggleLight,
                  ]}
                  onPress={() =>
                    setTheme((prev) => (prev === "dark" ? "light" : "dark"))
                  }
                >
                  <Text
                    style={[
                      styles.themeToggleText,
                      isLight && styles.themeToggleTextLight,
                    ]}
                  >
                    {theme === "dark" ? text.light : text.dark}
                  </Text>
                </TouchableOpacity>
                {loggedIn && (
                  <TouchableOpacity
                    style={[
                      styles.themeToggle,
                      styles.headerLogoutButton,
                      isLight && styles.headerLogoutButtonLight,
                    ]}
                    onPress={clearAdminSession}
                  >
                    <Text
                      style={[
                        styles.themeToggleText,
                        styles.headerLogoutText,
                        isLight && styles.headerLogoutTextLight,
                      ]}
                    >
                      {text.logout}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {loggedIn && (
              <View style={[styles.tabShell, isLight && styles.tabShellLight]}>
                <View style={styles.tenantPill}>
                  <Text
                    style={[
                      styles.tenantPillText,
                      isLight && styles.tenantPillTextLight,
                    ]}
                  >
                    {text.tenant}: {activeTenantLabel || activeTenant}
                  </Text>
                </View>
                <View style={styles.tenantPill}>
                  <Text
                    style={[
                      styles.tenantPillText,
                      isLight && styles.tenantPillTextLight,
                    ]}
                  >
                    API: {activeApiLabel}
                  </Text>
                </View>
                {canManageMultiLocation ? (
                  <View style={styles.tenantPill}>
                    <Text
                      style={[
                        styles.tenantPillText,
                        isLight && styles.tenantPillTextLight,
                      ]}
                    >
                      {text.activeLocation}: {activeLocationLabel}
                    </Text>
                  </View>
                ) : null}
                {visibleTabs.map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[
                      styles.tab,
                      isLight && styles.tabLight,
                      screen === tab &&
                        (isLight ? styles.tabActiveLight : styles.tabActive),
                    ]}
                    onPress={() => setScreen(tab)}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        isLight && styles.tabTextLight,
                        screen === tab && isLight && styles.tabTextLightActive,
                      ]}
                    >
                      {tabLabels[language][tab]}
                    </Text>
                  </TouchableOpacity>
                ))}
                {canManageMultiLocation ? (
                  <TouchableOpacity
                    style={[
                      styles.tab,
                      styles.tabLocationSwitch,
                      isLight && styles.tabLocationSwitchLight,
                    ]}
                    onPress={() => setScreen("offices")}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        isLight && styles.tabTextLight,
                        isLight && styles.tabTextLightActive,
                      ]}
                    >
                      {text.switchLocation}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.tab,
                      styles.tabDanger,
                      isLight && styles.tabDangerLight,
                    ]}
                    onPress={clearAdminSession}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        isLight && styles.tabTextLight,
                        isLight && styles.tabTextLightDanger,
                      ]}
                    >
                      {text.logout}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {renderContent()}
          </ScrollView>
        </KeyboardAvoidingView>
        <StatusBar style={theme === "dark" ? "light" : "dark"} />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  keyboardWrap: { flex: 1 },
  container: { padding: 20, paddingBottom: 40, gap: 16 },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  brandLogo: { width: 118, height: 44 },
  brandTextBlock: {
    flex: 1,
    minWidth: 160,
  },
  title: { fontSize: 24, fontWeight: "700", color: "#eef2ff" },
  subtitle: { color: "rgba(226, 232, 240, 0.7)", marginTop: 4, fontSize: 13 },
  headerActions: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    flexShrink: 1,
    justifyContent: "flex-end",
  },
  languageSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  languageSelectorLight: { backgroundColor: "#e2e8f0" },
  languageLabel: {
    color: "#f9f4ea",
    fontWeight: "600",
    fontSize: 11,
  },
  languageLabelLight: { color: "#0f172a" },
  languageOption: {
    borderRadius: 999,
    backgroundColor: "rgba(148, 163, 184, 0.35)",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  languageOptionLight: { backgroundColor: "#cbd5e1" },
  languageOptionActive: { backgroundColor: "#2f5bff" },
  languageOptionActiveLight: { backgroundColor: "#2563eb" },
  languageOptionText: {
    color: "#f8fafc",
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.4,
  },
  languageOptionTextLight: { color: "#0f172a" },
  languageOptionTextActive: { color: "#f8fafc" },
  themeToggle: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  headerLogoutButton: { backgroundColor: "rgba(239, 68, 68, 0.7)" },
  headerLogoutButtonLight: { backgroundColor: "#ef4444" },
  themeToggleText: {
    color: "#f9f4ea",
    fontWeight: "600",
    fontSize: 12,
  },
  headerLogoutText: { color: "#ffffff" },
  headerLogoutTextLight: { color: "#ffffff" },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tabShell: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderRadius: 999,
    padding: 6,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  tabShellLight: { backgroundColor: "#e2e8f0" },
  tenantPill: {
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
  },
  tenantPillText: {
    color: "#dbeafe",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  tenantPillTextLight: { color: "#1e3a8a" },
  tab: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  tabActive: { backgroundColor: "#2f5bff" },
  tabLocationSwitch: { backgroundColor: "#2563eb" },
  tabLocationSwitchLight: { backgroundColor: "#2563eb" },
  tabDanger: { backgroundColor: "rgba(239, 68, 68, 0.7)" },
  tabText: { color: "#f9f4ea", fontWeight: "600", fontSize: 12 },
  titleLight: { color: "#0f172a" },
  subtitleLight: { color: "#475569" },
  themeToggleLight: { backgroundColor: "#e2e8f0" },
  themeToggleTextLight: { color: "#0f172a" },
  tabLight: { backgroundColor: "#e2e8f0" },
  tabActiveLight: { backgroundColor: "#2563eb" },
  tabDangerLight: { backgroundColor: "#ef4444" },
  tabTextLight: { color: "#0f172a" },
  tabTextLightActive: { color: "#f8fafc" },
  tabTextLightDanger: { color: "#f8fafc" },
  card: {
    backgroundColor: "rgba(16, 23, 35, 0.65)",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#e2e8f0",
    marginBottom: 12,
  },
  cardLight: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  cardTitleLight: { color: "#0f172a" },
  label: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "#94a3b8",
    marginTop: 10,
    marginBottom: 6,
  },
  labelLight: { color: "#475569" },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    marginBottom: 8,
    color: "#e2e8f0",
  },
  inputCompact: {
    marginTop: 8,
    marginBottom: 0,
  },
  tipCard: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.24)",
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    padding: 10,
    gap: 8,
  },
  employeeMessageTabs: {
    paddingRight: 8,
  },
  employeeMessageInput: {
    minHeight: 96,
    textAlignVertical: "top",
    paddingTop: 10,
  },
  statusText: { marginTop: 8, color: "#cbd5f5" },
  helperText: { color: "#94a3b8", marginTop: 8, fontSize: 12 },
  inputLight: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(15, 23, 42, 0.12)",
    color: "#0f172a",
  },
  statusTextLight: { color: "#334155" },
  helperTextLight: { color: "#64748b" },
  button: {
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  primary: { backgroundColor: "#2f5bff" },
  primaryText: { fontWeight: "700", color: "#eef2ff" },
  primaryTextLight: { color: "#f8fafc" },
  secondaryButton: {
    marginTop: 8,
    backgroundColor: "rgba(148, 163, 184, 0.16)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
  },
  secondaryButtonText: { fontSize: 12, fontWeight: "600", color: "#e2e8f0" },
  secondaryButtonLight: { backgroundColor: "#e2e8f0" },
  secondaryButtonTextLight: { color: "#0f172a" },
  secondaryButtonDanger: { backgroundColor: "#dc2626" },
  secondaryButtonDangerText: { color: "#ffffff" },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  userRowActions: {
    width: "100%",
    justifyContent: "flex-start",
  },
  actionButtonCompact: {
    marginTop: 0,
    alignSelf: "auto",
  },
  actionButtonPrimary: {
    minWidth: 140,
    marginTop: 0,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryTile: {
    backgroundColor: "rgba(148, 163, 184, 0.1)",
    borderRadius: 14,
    padding: 12,
    minWidth: 120,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
  summaryHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  summaryIcon: {
    width: 22,
    height: 22,
    borderRadius: 8,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
  },
  summaryIconUsers: { backgroundColor: "rgba(59, 130, 246, 0.35)" },
  summaryIconShield: { backgroundColor: "rgba(244, 114, 182, 0.35)" },
  summaryIconTime: { backgroundColor: "rgba(34, 197, 94, 0.35)" },
  summaryIconReports: { backgroundColor: "rgba(148, 163, 184, 0.35)" },
  summaryLabel: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#cbd5f5",
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#e2e8f0",
    marginTop: 6,
  },
  summaryTileLight: { backgroundColor: "#f8fafc" },
  summaryLabelLight: { color: "#64748b" },
  summaryValueLight: { color: "#0f172a" },
  toggleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  togglePill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(148, 163, 184, 0.2)",
  },
  toggleActive: { backgroundColor: "#2f5bff" },
  toggleDanger: { backgroundColor: "#dc2626" },
  toggleText: { fontSize: 11, fontWeight: "600", color: "#e2e8f0" },
  togglePillLight: { backgroundColor: "#e2e8f0" },
  toggleActiveLight: { backgroundColor: "#2563eb" },
  toggleTextLight: { color: "#0f172a" },
  toggleTextLightActive: { color: "#f8fafc" },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.14)",
  },
  userListRow: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 8,
  },
  userListMain: {
    width: "100%",
  },
  listActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  listName: { fontSize: 14, fontWeight: "600", color: "#e2e8f0" },
  listMeta: { fontSize: 12, color: "#94a3b8" },
  listNameLight: { color: "#0f172a" },
  listMetaLight: { color: "#64748b" },
  companyOrderItemsWrap: {
    gap: 4,
    marginTop: 8,
  },
  companyOrderCartSection: {
    marginTop: 10,
    gap: 8,
  },
  companyOrderCartRow: {
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(15, 23, 42, 0.25)",
    gap: 8,
  },
  companyOrderCartActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  companyOrderStepButton: {
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
    borderRadius: 8,
    minWidth: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    backgroundColor: "rgba(59, 130, 246, 0.18)",
  },
  companyOrderStepButtonLight: {
    borderColor: "rgba(37, 99, 235, 0.35)",
    backgroundColor: "#eff6ff",
  },
  companyOrderStepButtonText: {
    color: "#dbeafe",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 18,
  },
  companyOrderStepButtonTextLight: {
    color: "#1d4ed8",
  },
  companyOrderQtyBadge: {
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
    borderRadius: 8,
    minWidth: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "rgba(15, 23, 42, 0.2)",
  },
  companyOrderQtyBadgeLight: {
    borderColor: "rgba(15, 23, 42, 0.18)",
    backgroundColor: "#f8fafc",
  },
  companyOrderQtyBadgeText: {
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: "700",
  },
  companyOrderQtyBadgeTextLight: {
    color: "#0f172a",
  },
  companyOrderRemoveButton: {
    marginLeft: "auto",
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.4)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(248, 113, 113, 0.12)",
  },
  companyOrderRemoveButtonLight: {
    borderColor: "rgba(220, 38, 38, 0.3)",
    backgroundColor: "#fef2f2",
  },
  companyOrderRemoveButtonText: {
    color: "#fecaca",
    fontSize: 12,
    fontWeight: "700",
  },
  companyOrderRemoveButtonTextLight: {
    color: "#b91c1c",
  },
  companyOrderExportRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  companyOrderQtyInput: {
    width: 82,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
    backgroundColor: "rgba(15, 23, 42, 0.2)",
    color: "#e2e8f0",
    paddingHorizontal: 10,
    textAlign: "center",
    fontWeight: "700",
  },
  companyOrderAddButton: {
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(59, 130, 246, 0.18)",
  },
  companyOrderAddButtonLight: {
    borderColor: "rgba(37, 99, 235, 0.35)",
    backgroundColor: "#eff6ff",
  },
  companyOrderAddButtonText: {
    color: "#dbeafe",
    fontSize: 12,
    fontWeight: "700",
  },
  companyOrderAddButtonTextLight: {
    color: "#1d4ed8",
  },
  userQuickList: {
    gap: 4,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    backgroundColor: "rgba(15, 23, 42, 0.25)",
    marginBottom: 8,
  },
  userQuickListLight: {
    borderColor: "rgba(15, 23, 42, 0.12)",
    backgroundColor: "#f8fafc",
  },
  userList: { maxHeight: 260, marginTop: 8 },
  userListContent: { paddingBottom: 8 },
  reportSectionTitle: { marginTop: 14, fontSize: 16, marginBottom: 8 },
  reportTotalsGrid: {
    marginTop: 8,
    marginBottom: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: "rgba(15, 23, 42, 0.38)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    padding: 10,
  },
  reportTotalsGridLight: {
    backgroundColor: "#f8fafc",
    borderColor: "rgba(15, 23, 42, 0.12)",
  },
  reportTotalsTile: {
    minWidth: 120,
    flexGrow: 1,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  reportTotalsLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#94a3b8",
  },
  reportTotalsValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "700",
    color: "#e2e8f0",
  },
  reportRowMain: {
    flex: 1,
    paddingRight: 8,
    gap: 2,
  },
  scheduleTodayCard: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.22)",
    backgroundColor: "rgba(15, 23, 42, 0.42)",
    padding: 10,
    gap: 8,
  },
  scheduleTodayCardLight: {
    borderColor: "rgba(15, 23, 42, 0.14)",
    backgroundColor: "#f8fafc",
  },
  scheduleTodayHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  scheduleTodayTitleWrap: {
    flex: 1,
    gap: 2,
  },
  scheduleTodayTitle: {
    color: "#e2e8f0",
    fontSize: 15,
    fontWeight: "700",
  },
  scheduleTodayTitleLight: {
    color: "#0f172a",
  },
  scheduleRoleTabs: {
    marginBottom: 0,
  },
  scheduleTodayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    backgroundColor: "rgba(148, 163, 184, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  scheduleTodayRowLight: {
    borderColor: "rgba(15, 23, 42, 0.12)",
    backgroundColor: "#ffffff",
  },
  scheduleTodayRowMain: {
    flex: 1,
    gap: 2,
    paddingRight: 8,
  },
  scheduleTodayShift: {
    color: "#dbeafe",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
  },
  scheduleTodayShiftLight: {
    color: "#1e40af",
  },
  scheduleEmployeePicker: {
    marginTop: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.24)",
    backgroundColor: "rgba(15, 23, 42, 0.38)",
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scheduleEmployeePickerLight: {
    borderColor: "rgba(15, 23, 42, 0.14)",
    backgroundColor: "#f8fafc",
  },
  scheduleEmployeePickerText: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  scheduleEmployeePickerTextLight: {
    color: "#0f172a",
  },
  scheduleEmployeePickerArrow: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 10,
  },
  scheduleEmployeeMenu: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.22)",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    padding: 10,
    gap: 8,
  },
  scheduleEmployeeMenuLight: {
    borderColor: "rgba(15, 23, 42, 0.14)",
    backgroundColor: "#ffffff",
  },
  scheduleEmployeeSearchInput: {
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.24)",
    backgroundColor: "rgba(148, 163, 184, 0.12)",
    color: "#e2e8f0",
    paddingHorizontal: 10,
  },
  scheduleEmployeeSearchInputLight: {
    borderColor: "rgba(15, 23, 42, 0.14)",
    backgroundColor: "#f8fafc",
    color: "#0f172a",
  },
  scheduleEmployeeList: {
    maxHeight: 190,
  },
  scheduleEmployeeItem: {
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
    backgroundColor: "rgba(148, 163, 184, 0.1)",
    paddingHorizontal: 10,
    justifyContent: "center",
    marginBottom: 6,
  },
  scheduleEmployeeItemLight: {
    borderColor: "rgba(15, 23, 42, 0.12)",
    backgroundColor: "#f8fafc",
  },
  scheduleEmployeeItemActive: {
    borderColor: "rgba(59, 130, 246, 0.45)",
    backgroundColor: "rgba(47, 91, 255, 0.3)",
  },
  scheduleEmployeeItemActiveLight: {
    borderColor: "rgba(37, 99, 235, 0.35)",
    backgroundColor: "#dbeafe",
  },
  scheduleEmployeeItemText: {
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: "600",
  },
  scheduleEmployeeItemTextLight: {
    color: "#0f172a",
  },
  scheduleEmployeeItemTextActive: {
    color: "#f8fafc",
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 10,
  },
  scheduleToggle: {
    backgroundColor: "rgba(148, 163, 184, 0.2)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    minWidth: 110,
  },
  scheduleToggleActive: { backgroundColor: "#2f5bff" },
  scheduleToggleLight: { backgroundColor: "#e2e8f0" },
  scheduleToggleText: { color: "#e2e8f0", fontWeight: "600", fontSize: 12 },
  scheduleToggleTextLight: { color: "#0f172a" },
  scheduleToggleTextActive: { color: "#f8fafc" },
  scheduleTimes: {
    gap: 8,
    flex: 1,
  },
  scheduleTimeCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.22)",
    backgroundColor: "rgba(15, 23, 42, 0.42)",
    padding: 8,
    gap: 6,
  },
  scheduleTimeCardLight: {
    borderColor: "rgba(15, 23, 42, 0.14)",
    backgroundColor: "#f8fafc",
  },
  scheduleTimeLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#94a3b8",
  },
  scheduleTimeValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#e2e8f0",
  },
  scheduleControlRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  scheduleStepButton: {
    minWidth: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
    backgroundColor: "rgba(148, 163, 184, 0.18)",
    paddingVertical: 5,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  scheduleStepButtonLight: {
    borderColor: "rgba(15, 23, 42, 0.18)",
    backgroundColor: "#e2e8f0",
  },
  scheduleStepButtonText: {
    color: "#e2e8f0",
    fontWeight: "700",
    fontSize: 11,
  },
  scheduleStepButtonTextLight: {
    color: "#0f172a",
  },
  scheduleMeridiemButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.45)",
    backgroundColor: "rgba(99, 102, 241, 0.22)",
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  scheduleMeridiemGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  scheduleMeridiemButtonActive: {
    borderColor: "rgba(59, 130, 246, 0.65)",
    backgroundColor: "rgba(59, 130, 246, 0.35)",
  },
  scheduleMeridiemButtonLight: {
    borderColor: "rgba(37, 99, 235, 0.34)",
    backgroundColor: "#dbeafe",
  },
  scheduleMeridiemButtonActiveLight: {
    borderColor: "rgba(30, 64, 175, 0.6)",
    backgroundColor: "#2563eb",
  },
  scheduleMeridiemText: {
    color: "#e2e8f0",
    fontWeight: "700",
    fontSize: 11,
  },
  scheduleMeridiemTextLight: {
    color: "#1e3a8a",
  },
  scheduleMeridiemTextActive: {
    color: "#f8fafc",
  },
  scheduleInput: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    color: "#e2e8f0",
    flex: 1,
    textAlign: "center",
  },
  scheduleInputDisabled: { opacity: 0.6 },
  scheduleDash: { color: "#94a3b8", fontSize: 14 },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  calendarControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  calendarButton: {
    backgroundColor: "rgba(148, 163, 184, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  calendarButtonLight: { backgroundColor: "#e2e8f0" },
  calendarButtonText: { color: "#e2e8f0", fontWeight: "700" },
  calendarButtonTextLight: { color: "#0f172a" },
  calendarLabel: { color: "#e2e8f0", fontWeight: "700" },
  calendarLabelLight: { color: "#0f172a" },
  calendarGrid: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 8,
  },
  calendarDayHead: {
    width: "13.5%",
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
  },
  calendarCell: {
    width: "13.5%",
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: "rgba(148, 163, 184, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarCellLight: {
    backgroundColor: "#f1f5f9",
    borderColor: "rgba(15, 23, 42, 0.12)",
  },
  calendarCellEmpty: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  calendarCellToday: {
    backgroundColor: "#2f5bff",
    borderColor: "transparent",
    shadowColor: "#2f5bff",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  calendarCellTodayLight: {
    backgroundColor: "#2563eb",
    borderColor: "transparent",
  },
  calendarCellText: { color: "#e2e8f0", fontWeight: "600" },
  calendarCellTextLight: { color: "#0f172a" },
  calendarCellTextEmpty: { color: "transparent" },
  calendarCellTextToday: { color: "#f8fafc" },
  calendarCellTextTodayLight: { color: "#f8fafc" },
  inlineButton: {
    backgroundColor: "#ef4444",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inlineButtonText: { color: "#fff7ed", fontSize: 11, fontWeight: "700" },
  inlineButtonLight: { backgroundColor: "#dc2626" },
  inlineButtonTextLight: { color: "#ffffff" },
  inlineButtonDisabled: { opacity: 0.6 },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginVertical: 12,
  },
  dividerLight: { backgroundColor: "rgba(15, 23, 42, 0.12)" },
  workingCard: {
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    borderRadius: 18,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
  },
  workingCardLight: { backgroundColor: "#f8fafc" },
  workingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  workingLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(59, 130, 246, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#e2e8f0", fontWeight: "700", fontSize: 12 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(34, 197, 94, 0.18)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#34d399",
  },
  statusPillText: { color: "#d1fae5", fontSize: 11, fontWeight: "700" },
  statusPillOut: { backgroundColor: "rgba(148, 163, 184, 0.18)" },
  statusDotOut: { backgroundColor: "#94a3b8" },
  statusPillTextOut: { color: "#e2e8f0" },
  footerNote: {
    textAlign: "center",
    color: "rgba(226, 232, 240, 0.6)",
    marginTop: 14,
    fontSize: 12,
  },
  footerNoteLight: { color: "#64748b" },
  inlineButtonIn: {
    backgroundColor: "#22c55e",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inlineButtonTextIn: { color: "#0f172a", fontSize: 11, fontWeight: "700" },
  inlineButtonInLight: { backgroundColor: "#16a34a" },
  inlineButtonTextInLight: { color: "#ffffff" },
});
