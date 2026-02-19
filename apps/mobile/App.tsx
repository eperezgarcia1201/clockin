import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Device from "expo-device";
import Constants from "expo-constants";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import {
  Alert,
  Image,
  Keyboard,
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

const normalizeApiBase = (value: string) => value.trim().replace(/\/$/, "");
const DEFAULT_API_BASE = "https://api.websysclockin.com/api";

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

const normalizePinInput = (value: string) =>
  value.replace(/[^\d]/g, "").slice(0, 4);
const extractPendingTipsWorkDate = (message: string) => {
  const match = /pending tips required for work date (\d{4}-\d{2}-\d{2})/i.exec(
    message,
  );
  return match?.[1] || null;
};
const normalizeOrderQuantityInput = (value: string) => {
  const trimmed = value.replace(/,/g, ".").replace(/[^\d.]/g, "");
  if (!trimmed) {
    return "";
  }
  const parts = trimmed.split(".");
  const integerPart = parts[0] || "0";
  const decimalPart = parts.slice(1).join("").slice(0, 2);
  return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
};
const isOfficeScopeUnsupportedError = (message: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("officeid") && normalized.includes("should not exist")
  );
};
const ACTIVE_SHIFT_STATUSES = new Set(["IN", "BREAK", "LUNCH"]);
const ALL_ROLE_FILTER = "__all__";
const formatDisplayDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return value;
  return `${match[2]}/${match[3]}/${match[1]}`;
};
const formatScheduleTimeLabel = (value: string) => {
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours24 = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours24) || !Number.isFinite(minutes)) {
    return value;
  }
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  const hour12 = ((hours24 + 11) % 12) + 1;
  return `${String(hour12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${meridiem}`;
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

type Employee = {
  id: string;
  name: string;
  active: boolean;
  isManager?: boolean;
  isServer?: boolean;
  isKitchenManager?: boolean;
  officeId?: string | null;
};

type TenantContext = {
  input: string;
  name: string;
  slug: string;
  subdomain: string;
  authOrgId: string;
};

type TenantOffice = {
  id: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  geofenceRadiusMeters?: number | null;
};

type ActiveShift = {
  tenantAuthOrgId: string;
  tenantSlug?: string;
  employeeId: string;
  employeeName: string;
  isManager?: boolean;
  isServer: boolean;
  isKitchenManager?: boolean;
  startedAt: string;
  pin?: string;
};

type WorkingNowRow = {
  id: string;
  name: string;
  status: "IN" | "BREAK" | "LUNCH";
  office: string | null;
  group: string | null;
};

type TodayScheduleRow = {
  employeeId: string;
  employeeName: string;
  startTime: string;
  endTime: string;
  roleLabel: string;
  officeId: string | null;
  officeName: string | null;
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
  submittedDates?: string[];
  contributors?: string[];
  notes: string;
  officeName: string | null;
  createdBy: string | null;
  totalQuantity: number;
  itemCount: number;
  items: CompanyOrderItem[];
};

type EmployeeViewTab = "clock" | "companyOrders";

const normalizeEmployeeRows = (rows: unknown): Employee[] => {
  if (!Array.isArray(rows)) {
    return [];
  }

  const normalized: Employee[] = [];
  rows.forEach((row) => {
    if (!row || typeof row !== "object") {
      return;
    }
    const candidate = row as Record<string, unknown>;
    const rawId =
      typeof candidate.id === "string"
        ? candidate.id
        : typeof candidate.employeeId === "string"
          ? candidate.employeeId
          : "";
    const id = rawId.trim();
    const rawName =
      typeof candidate.name === "string"
        ? candidate.name
        : typeof candidate.displayName === "string"
          ? candidate.displayName
          : typeof candidate.fullName === "string"
            ? candidate.fullName
            : "";
    const name = rawName.trim();
    if (!id || !name) {
      return;
    }

    const active =
      typeof candidate.active === "boolean"
        ? candidate.active
        : candidate.disabled === true
          ? false
          : true;
    normalized.push({
      id,
      name,
      active,
      isManager: Boolean(candidate.isManager),
      isServer: Boolean(candidate.isServer),
      isKitchenManager: Boolean(candidate.isKitchenManager),
      officeId:
        typeof candidate.officeId === "string" ? candidate.officeId : null,
    });
  });

  return normalized;
};

const companyOrderItemKey = (nameEs: string, nameEn: string) =>
  `${nameEs.trim().toLowerCase()}|${nameEn.trim().toLowerCase()}`;

type Language = "en" | "es";

const actions = ["IN", "OUT", "BREAK", "LUNCH"] as const;
const TENANT_STORAGE_KEY = "clockin.mobile.tenant";
const OFFICE_STORAGE_PREFIX = "clockin.mobile.office";
const ACTIVE_SHIFT_STORAGE_KEY = "clockin.mobile.activeShift";
const LANGUAGE_STORAGE_KEY = "clockin.mobile.language";
const TIPS_SUBMITTED_STORAGE_KEY = "clockin.mobile.tipsSubmittedByDay";
const BRAND_LOGO = require("./assets/websys-logo.png");

const i18n = {
  en: {
    appSubtitle: "Workforce Time Tracking",
    loading: "Loading",
    checkingSavedTenant: "Checking saved tenant...",
    welcome: "Welcome",
    enterTenantBeforeClockIn: "Enter your tenant name before clocking in.",
    tenantName: "Tenant Name",
    continue: "Continue",
    checking: "Checking...",
    tenant: "Tenant",
    clockStation: "Clock Station",
    systemOnline: "System Online",
    tipsDueAtOut: "Tips Due at OUT",
    workingNow: "Working Now",
    noWorkingNow: "No active employees right now.",
    todaysTeam: "Today's Team",
    todayTeamDefaultLabel: "Who is scheduled today at this location.",
    refresh: "Refresh",
    refreshing: "Refreshing...",
    noTeamForRole: "No employees are scheduled for this role today.",
    noTeamToday: "No employees are scheduled today.",
    allRoles: "All",
    allLocations: "All locations",
    unassignedRole: "Unassigned",
    startsAt: "Starts",
    endsAt: "Ends",
    anyTime: "Any time",
    username: "Username",
    enterFullName: "Enter full name",
    noExactMatchYet: "No exact match yet.",
    verified: "Verified",
    pin: "PIN",
    action: "Action",
    tipSubmissionRequired: "Tip Submission Required",
    cashTips: "Cash Tips ($)",
    creditCardTips: "Credit Card Tips ($)",
    tapToSubmitTips: "Tap to Submit Tips",
    savingTips: "Saving Tips...",
    confirmPunch: "Confirm Punch ->",
    saving: "Saving...",
    thisDevice: "This Device",
    poweredBy: "Powered by Websys Workforce",
    tenantNotConfigured: "Tenant not configured.",
    enterUsernameFirst: "Enter a username first.",
    employeeNotFoundUseFullName: "Employee not found. Use the full name.",
    noActiveShiftUser:
      "No active shift user found. Enter username and punch IN first.",
    submitTipsBeforeOut:
      "Submit cash and credit card tips before clocking out.",
    tapSubmitTipsFirst:
      'Tap "Tap to Submit Tips" first, then confirm clock out.',
    punchRecorded: "Punch recorded.",
    activeShiftRestored: "Active shift restored on this device.",
    punchFailed: "Punch failed.",
    selectValidEmployee: "Select a valid employee first.",
    pinMustBe4Digits: "PIN must be 4 digits.",
    invalidPinResetHint:
      "Invalid PIN. Confirm your 4-digit PIN or ask admin to reset it.",
    tipsOnlyForServers: "Tips can only be submitted for server users.",
    tipsMustBeValid: "Tips must be valid non-negative numbers.",
    tipsSaved: "Tips saved for today.",
    unableToSaveTips: "Unable to save tips.",
    enterTenantNameOrSlug: "Enter your tenant name or slug.",
    unableToValidateTenant: "Unable to validate tenant right now.",
    tenantNotFound: "Tenant not found. Check with your manager.",
    loadingLocations: "Loading locations...",
    chooseLocation: "Choose Location",
    selectLocationBeforeClockIn: "Select the location where you are working.",
    location: "Location",
    changeLocation: "Change",
    hideLocations: "Hide",
    unableToLoadLocations: "Unable to load locations right now.",
    locationPermissionRequired:
      "Location permission is required to clock in at this location.",
    unableToReadLocation:
      "Unable to read your current location. Try again in an open area.",
    unableToLoadTodayTeam: "Unable to load today's team right now.",
    unableToLoadWorkingNow:
      "Unable to load working-now employees right now.",
    unableToLoadCompanyOrders: "Unable to load company orders right now.",
    kitchenManagerOnly:
      "Kitchen manager or manager access required for company orders.",
    companyOrders: "Company Orders",
    companyOrdersTabHint:
      "Create and review supplier orders for this location.",
    orderSupplier: "Supplier",
    orderItemSearch: "Search item",
    orderItemSearchPlaceholder: "Search by Spanish or English name",
    orderQuantity: "Quantity",
    allItems: "All Items",
    inCartOnly: "In Cart",
    showMoreItems: "Show More",
    addItem: "Add",
    orderNotes: "Order notes (optional)",
    orderNotesPlaceholder: "Notes for this order",
    noOrderItemsForSupplier: "No items match this supplier/search.",
    orderSummary: "Order Summary",
    noItemsInCart: "No items added yet.",
    itemsLabel: "items",
    totalUnits: "Total Qty",
    removeItem: "Remove",
    submitCompanyOrder: "Submit Company Order",
    submittingCompanyOrder: "Submitting Order...",
    companyOrderSaved: "Company orders saved.",
    recentCompanyOrders: "Recent company orders",
    noCompanyOrdersYet: "No company orders yet.",
    downloadPdf: "Download PDF",
    downloadCsv: "Download CSV",
    downloadExcel: "Download Excel",
    preparingDownload: "Preparing...",
    managerMessageFallbackSubject: "Alert from Manager",
    managerMessageFrom: "From",
    autoPin: "Auto",
    language: "Language",
    actions: {
      IN: "IN",
      OUT: "OUT",
      BREAK: "BREAK",
      LUNCH: "LUNCH",
    },
  },
  es: {
    appSubtitle: "Control de tiempo laboral",
    loading: "Cargando",
    checkingSavedTenant: "Verificando tenant guardado...",
    welcome: "Bienvenido",
    enterTenantBeforeClockIn:
      "Ingresa el nombre de tu tenant antes de marcar entrada.",
    tenantName: "Nombre del tenant",
    continue: "Continuar",
    checking: "Verificando...",
    tenant: "Tenant",
    clockStation: "Estacion de reloj",
    systemOnline: "Sistema en linea",
    tipsDueAtOut: "Propinas al SALIR",
    workingNow: "Trabajando ahora",
    noWorkingNow: "No hay empleados activos en este momento.",
    todaysTeam: "Equipo de hoy",
    todayTeamDefaultLabel: "Quien esta programado hoy en esta ubicacion.",
    refresh: "Actualizar",
    refreshing: "Actualizando...",
    noTeamForRole: "No hay empleados programados para este rol hoy.",
    noTeamToday: "No hay empleados programados hoy.",
    allRoles: "Todos",
    allLocations: "Todas las ubicaciones",
    unassignedRole: "Sin asignar",
    startsAt: "Inicia",
    endsAt: "Termina",
    anyTime: "Cualquier hora",
    username: "Usuario",
    enterFullName: "Ingresa nombre completo",
    noExactMatchYet: "Aun no hay coincidencia exacta.",
    verified: "Verificado",
    pin: "PIN",
    action: "Accion",
    tipSubmissionRequired: "Se requiere enviar propinas",
    cashTips: "Propinas en efectivo ($)",
    creditCardTips: "Propinas de tarjeta ($)",
    tapToSubmitTips: "Toca para enviar propinas",
    savingTips: "Guardando propinas...",
    confirmPunch: "Confirmar marcacion ->",
    saving: "Guardando...",
    thisDevice: "Este dispositivo",
    poweredBy: "Desarrollado por Websys Workforce",
    tenantNotConfigured: "Tenant no configurado.",
    enterUsernameFirst: "Primero ingresa un usuario.",
    employeeNotFoundUseFullName:
      "Empleado no encontrado. Usa el nombre completo.",
    noActiveShiftUser:
      "No hay turno activo. Ingresa usuario y marca ENTRADA primero.",
    submitTipsBeforeOut:
      "Debes enviar propinas en efectivo y tarjeta antes de salir.",
    tapSubmitTipsFirst:
      'Toca "Toca para enviar propinas" y luego confirma salida.',
    punchRecorded: "Marcacion registrada.",
    activeShiftRestored: "Turno activo restaurado en este dispositivo.",
    punchFailed: "Fallo la marcacion.",
    selectValidEmployee: "Selecciona un empleado valido primero.",
    pinMustBe4Digits: "El PIN debe tener 4 digitos.",
    invalidPinResetHint:
      "PIN invalido. Confirma tu PIN de 4 digitos o pide al admin reiniciarlo.",
    tipsOnlyForServers: "Solo usuarios meseros pueden enviar propinas.",
    tipsMustBeValid: "Las propinas deben ser numeros validos no negativos.",
    tipsSaved: "Propinas guardadas para hoy.",
    unableToSaveTips: "No se pudieron guardar las propinas.",
    enterTenantNameOrSlug: "Ingresa el nombre o slug del tenant.",
    unableToValidateTenant: "No se puede validar el tenant ahora.",
    tenantNotFound: "Tenant no encontrado. Verifica con tu gerente.",
    loadingLocations: "Cargando ubicaciones...",
    chooseLocation: "Selecciona ubicacion",
    selectLocationBeforeClockIn: "Selecciona la ubicacion donde trabajas.",
    location: "Ubicacion",
    changeLocation: "Cambiar",
    hideLocations: "Ocultar",
    unableToLoadLocations: "No se pueden cargar ubicaciones ahora.",
    locationPermissionRequired:
      "Se requiere permiso de ubicacion para marcar entrada en esta ubicacion.",
    unableToReadLocation:
      "No se puede leer tu ubicacion actual. Intenta de nuevo en un area abierta.",
    unableToLoadTodayTeam:
      "No se puede cargar el equipo de hoy en este momento.",
    unableToLoadWorkingNow:
      "No se puede cargar quienes estan trabajando ahora.",
    unableToLoadCompanyOrders:
      "No se pueden cargar las ordenes de la empresa en este momento.",
    kitchenManagerOnly:
      "Se requiere acceso de gerente de cocina o gerente para ordenes de empresa.",
    companyOrders: "Ordenes de Empresa",
    companyOrdersTabHint:
      "Crea y revisa pedidos a proveedores para esta ubicacion.",
    orderSupplier: "Proveedor",
    orderItemSearch: "Buscar articulo",
    orderItemSearchPlaceholder: "Buscar por nombre en espanol o ingles",
    orderQuantity: "Cantidad",
    allItems: "Todos",
    inCartOnly: "En carrito",
    showMoreItems: "Ver mas",
    addItem: "Agregar",
    orderNotes: "Notas del pedido (opcional)",
    orderNotesPlaceholder: "Notas para este pedido",
    noOrderItemsForSupplier: "No hay articulos para este proveedor/busqueda.",
    orderSummary: "Resumen del pedido",
    noItemsInCart: "Aun no hay articulos agregados.",
    itemsLabel: "articulos",
    totalUnits: "Cantidad total",
    removeItem: "Quitar",
    submitCompanyOrder: "Enviar Orden de Empresa",
    submittingCompanyOrder: "Enviando orden...",
    companyOrderSaved: "Ordenes de empresa guardadas.",
    recentCompanyOrders: "Ordenes recientes de empresa",
    noCompanyOrdersYet: "Aun no hay ordenes de empresa.",
    downloadPdf: "Descargar PDF",
    downloadCsv: "Descargar CSV",
    downloadExcel: "Descargar Excel",
    preparingDownload: "Preparando...",
    managerMessageFallbackSubject: "Alerta del gerente",
    managerMessageFrom: "De",
    autoPin: "Auto",
    language: "Idioma",
    actions: {
      IN: "ENTRADA",
      OUT: "SALIDA",
      BREAK: "DESCANSO",
      LUNCH: "ALMUERZO",
    },
  },
} as const;

export default function App() {
  const scrollRef = useRef<ScrollView | null>(null);
  const [language, setLanguage] = useState<Language>("en");
  const [tenant, setTenant] = useState<TenantContext | null>(null);
  const [tenantInput, setTenantInput] = useState("");
  const [tenantStatus, setTenantStatus] = useState<string | null>(null);
  const [resolvingTenant, setResolvingTenant] = useState(false);
  const [tenantHydrated, setTenantHydrated] = useState(false);
  const [tenantOffices, setTenantOffices] = useState<TenantOffice[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string | null>(null);
  const [tenantCompanyOrdersEnabled, setTenantCompanyOrdersEnabled] =
    useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [directoryEmployees, setDirectoryEmployees] = useState<Employee[]>([]);
  const [employeeName, setEmployeeName] = useState("");
  const [pin, setPin] = useState("");
  const [cashTips, setCashTips] = useState("0");
  const [creditCardTips, setCreditCardTips] = useState("0");
  const [punchType, setPunchType] = useState<(typeof actions)[number]>("IN");
  const [status, setStatus] = useState<string | null>(null);
  const [tipsStatus, setTipsStatus] = useState<string | null>(null);
  const [tipsAlert, setTipsAlert] = useState(false);
  const [serverTipsRequired, setServerTipsRequired] = useState(false);
  const [pendingTipWorkDate, setPendingTipWorkDate] = useState<string | null>(
    null,
  );
  const [tipsSubmittedByDay, setTipsSubmittedByDay] = useState<
    Record<string, boolean>
  >({});
  const [tipsReminderEmployeeId, setTipsReminderEmployeeId] = useState<
    string | null
  >(null);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingTips, setSavingTips] = useState(false);
  const [resolvedApiBase, setResolvedApiBase] = useState<string | null>(null);
  const [lastPunch, setLastPunch] = useState<{
    name: string;
    type: string;
    occurredAt: Date;
  } | null>(null);
  const [todaySchedule, setTodaySchedule] =
    useState<TodayScheduleResponse | null>(null);
  const [todayScheduleStatus, setTodayScheduleStatus] = useState<string | null>(
    null,
  );
  const [todayScheduleLoading, setTodayScheduleLoading] = useState(false);
  const [todayRoleFilter, setTodayRoleFilter] = useState(ALL_ROLE_FILTER);
  const [workingNowRows, setWorkingNowRows] = useState<WorkingNowRow[]>([]);
  const [workingNowStatus, setWorkingNowStatus] = useState<string | null>(null);
  const [workingNowLoading, setWorkingNowLoading] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState<EmployeeViewTab>("clock");
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
  const [keyboardInset, setKeyboardInset] = useState(0);

  const officeScopedDirectoryEmployees = useMemo(() => {
    if (!selectedOfficeId) {
      return directoryEmployees;
    }
    const scoped = directoryEmployees.filter((employee) => {
      if (typeof employee.officeId === "string") {
        return employee.officeId === selectedOfficeId;
      }
      return true;
    });
    return scoped.length > 0 ? scoped : directoryEmployees;
  }, [directoryEmployees, selectedOfficeId]);

  const rosterEmployees = useMemo(
    () => (employees.length > 0 ? employees : officeScopedDirectoryEmployees),
    [employees, officeScopedDirectoryEmployees],
  );

  const activeEmployees = useMemo(
    () => rosterEmployees.filter((emp) => emp.active),
    [rosterEmployees],
  );

  const matchedEmployee = useMemo(() => {
    const normalized = employeeName.trim().toLowerCase();
    if (!normalized) return null;
    const exact = activeEmployees.find(
      (emp) => emp.name.toLowerCase() === normalized,
    );
    if (exact) return exact;
    const partialMatches = activeEmployees.filter((emp) =>
      emp.name.toLowerCase().includes(normalized),
    );
    if (partialMatches.length === 1) return partialMatches[0];
    return null;
  }, [employeeName, activeEmployees]);

  const sessionEmployee = useMemo(() => {
    if (!tenant || !activeShift) {
      return null;
    }
    if (activeShift.tenantAuthOrgId !== tenant.authOrgId) {
      return null;
    }
    const current = rosterEmployees.find(
      (emp) => emp.id === activeShift.employeeId,
    );
    if (current) {
      return current;
    }
    return {
      id: activeShift.employeeId,
      name: activeShift.employeeName,
      active: true,
      isManager: Boolean(activeShift.isManager),
      isServer: activeShift.isServer,
      isKitchenManager: Boolean(activeShift.isKitchenManager),
    } as Employee;
  }, [tenant, activeShift, rosterEmployees]);

  const selectedEmployee = sessionEmployee ?? matchedEmployee;
  const companyOrdersActor = useMemo(() => {
    if (!sessionEmployee) {
      return null;
    }
    return sessionEmployee.isKitchenManager || sessionEmployee.isManager
      ? sessionEmployee
      : null;
  }, [sessionEmployee]);
  const hasCompanyOrdersAccess = Boolean(
    tenantCompanyOrdersEnabled && activeShift && companyOrdersActor,
  );

  const getTipSubmissionKey = (employeeId: string, workDate?: string) => {
    const normalizedDate = workDate || new Date().toISOString().slice(0, 10);
    return `${employeeId}:${normalizedDate}`;
  };
  const pendingTipDate = pendingTipWorkDate;

  const requiresTipsForOut = Boolean(
    selectedEmployee?.isServer || serverTipsRequired,
  );
  const hasSubmittedTips =
    selectedEmployee !== null &&
    Boolean(tipsSubmittedByDay[getTipSubmissionKey(selectedEmployee.id)]);
  const showTipInputs =
    (punchType === "OUT" && requiresTipsForOut && !hasSubmittedTips) ||
    Boolean(selectedEmployee?.isServer && pendingTipDate);
  const showTipReminderTag =
    selectedEmployee?.isServer &&
    ((!hasSubmittedTips &&
      (tipsReminderEmployeeId === selectedEmployee.id || serverTipsRequired)) ||
      Boolean(pendingTipDate));
  const needsManualPinForSession =
    Boolean(sessionEmployee) && !activeShift?.pin;
  const t = i18n[language];
  const selectedOffice = useMemo(
    () =>
      tenantOffices.find((office) => office.id === selectedOfficeId) ?? null,
    [tenantOffices, selectedOfficeId],
  );
  const companyOrderHeaders = useMemo<
    Record<string, string> | undefined
  >(() => {
    if (!companyOrdersActor) {
      return undefined;
    }
    return {
      "x-dev-user-id": `employee:${companyOrdersActor.id}`,
      "x-dev-name": companyOrdersActor.name,
      "x-dev-email": `${companyOrdersActor.id}@clockin.local`,
    };
  }, [companyOrdersActor]);
  const selectedCompanyOrderSupplier = useMemo(
    () =>
      companyOrderCatalog.find(
        (supplier) => supplier.supplierName === companyOrderSupplier,
      ) ?? null,
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
  const requiresLocationSelection = tenantOffices.length > 1;
  const canUseClockScreen =
    !requiresLocationSelection || Boolean(selectedOfficeId);
  const formatScheduleShiftLabel = useCallback(
    (startTime: string, endTime: string) => {
      if (startTime && endTime) {
        return `${formatScheduleTimeLabel(startTime)} - ${formatScheduleTimeLabel(endTime)}`;
      }
      if (startTime) {
        return `${t.startsAt} ${formatScheduleTimeLabel(startTime)}`;
      }
      if (endTime) {
        return `${t.endsAt} ${formatScheduleTimeLabel(endTime)}`;
      }
      return t.anyTime;
    },
    [t.anyTime, t.endsAt, t.startsAt],
  );
  const todayRoleTabs = useMemo<Array<{ key: string; label: string }>>(() => {
    const labels = new Set<string>();
    (todaySchedule?.rows || []).forEach((row) => {
      const label = row.roleLabel.trim() || t.unassignedRole;
      labels.add(label);
    });
    const sorted = Array.from(labels).sort((a, b) => a.localeCompare(b));
    return [
      { key: ALL_ROLE_FILTER, label: t.allRoles },
      ...sorted.map((label) => ({ key: label, label })),
    ];
  }, [t.allRoles, t.unassignedRole, todaySchedule]);
  const activeTodayRoleFilter = todayRoleTabs.some(
    (tab) => tab.key === todayRoleFilter,
  )
    ? todayRoleFilter
    : ALL_ROLE_FILTER;
  const filteredTodayScheduleRows = useMemo(() => {
    const rows = todaySchedule?.rows || [];
    if (activeTodayRoleFilter === ALL_ROLE_FILTER) {
      return rows;
    }
    return rows.filter((row) => row.roleLabel === activeTodayRoleFilter);
  }, [activeTodayRoleFilter, todaySchedule]);
  const todayScheduleLabel = useMemo(() => {
    if (!todaySchedule) {
      return t.todayTeamDefaultLabel;
    }
    const weekdayLabel = todaySchedule.weekdayLabel || "Today";
    const dateLabel = todaySchedule.date
      ? formatDisplayDate(todaySchedule.date)
      : "Today";
    const timezoneLabel = todaySchedule.timezone
      ? ` (${todaySchedule.timezone})`
      : "";
    return `${weekdayLabel}, ${dateLabel}${timezoneLabel}`;
  }, [t.todayTeamDefaultLabel, todaySchedule]);

  const persistActiveShift = useCallback(async (shift: ActiveShift) => {
    const keys = [
      ACTIVE_SHIFT_STORAGE_KEY,
      `${ACTIVE_SHIFT_STORAGE_KEY}.${shift.tenantAuthOrgId}`,
    ];
    await Promise.all(
      keys.map((key) => AsyncStorage.setItem(key, JSON.stringify(shift))),
    );
  }, []);

  const clearActiveShiftSession = useCallback(
    (clearName: boolean = true) => {
      setTipsReminderEmployeeId(null);
      setTipsStatus(null);
      setServerTipsRequired(false);
      setActiveShift(null);
      const keys = [ACTIVE_SHIFT_STORAGE_KEY];
      if (tenant?.authOrgId) {
        keys.push(`${ACTIVE_SHIFT_STORAGE_KEY}.${tenant.authOrgId}`);
      }
      void AsyncStorage.multiRemove(Array.from(new Set(keys)));
      setTipsAlert(false);
      setPunchType("IN");
      setPin("");
      if (clearName) {
        setEmployeeName("");
      }
    },
    [tenant?.authOrgId],
  );

  const fetchJson = useCallback(
    async (path: string, options?: RequestInit) => {
      if (!tenant) {
        throw new Error("Tenant not configured.");
      }

      const orderedBases = resolvedApiBase
        ? [resolvedApiBase]
        : (Array.from(new Set(apiBaseCandidates.filter(Boolean))) as string[]);
      let lastError: Error | null = null;

      for (const apiBase of orderedBases) {
        try {
          const response = await fetch(`${apiBase}${path}`, {
            ...options,
            headers: {
              "Content-Type": "application/json",
              "x-dev-user-id": "dev-user",
              "x-dev-tenant-id": tenant.authOrgId,
              "x-dev-email": "dev@clockin.local",
              "x-dev-name": "Employee App",
              ...(options?.headers || {}),
            },
          });

          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            const responseError = new Error(
              data?.message || data?.error || "Request failed",
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

          if (!resolvedApiBase) {
            setResolvedApiBase(apiBase);
          }
          return response.json();
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
          } else if (error instanceof TypeError) {
            lastError = error;
            continue;
          }
        }
      }

      const tried = orderedBases.join(", ");
      const message = lastError?.message || "Unable to reach ClockIn API.";
      throw new Error(tried ? `${message} Tried: ${tried}` : message);
    },
    [resolvedApiBase, tenant],
  );

  const fetchCompanyOrderExport = useCallback(
    async (
      format: "pdf" | "csv" | "excel",
      weekStartDate: string,
      extraHeaders?: Record<string, string>,
    ) => {
      if (!tenant) {
        return false;
      }
      const orderedBases = resolvedApiBase
        ? [resolvedApiBase]
        : (Array.from(new Set(apiBaseCandidates.filter(Boolean))) as string[]);
      const query = new URLSearchParams();
      query.set("format", format);
      query.set("weekStart", weekStartDate);
      if (selectedOfficeId) {
        query.set("officeId", selectedOfficeId);
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
          const response = await fetch(`${apiBase}${path}`, {
            headers: {
              Accept: acceptHeader,
              "x-dev-user-id": "dev-user",
              "x-dev-tenant-id": tenant.authOrgId,
              "x-dev-email": "dev@clockin.local",
              "x-dev-name": "Employee App",
              ...(extraHeaders || {}),
            },
          });
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
              throw new Error("Unable to access local storage for download.");
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
              Alert.alert("Download ready", filename);
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
    [resolvedApiBase, selectedOfficeId, tenant],
  );

  const loadEmployees = useCallback(async () => {
    if (!tenant) {
      setEmployees([]);
      setDirectoryEmployees([]);
      return;
    }
    if (loadingLocations) {
      return;
    }
    if (!canUseClockScreen) {
      setEmployees([]);
      return;
    }

    try {
      let usedOfficeScopeFallback = false;
      if (selectedOfficeId) {
        try {
          const scopedData = (await fetchJson(
            `/employees?officeId=${encodeURIComponent(selectedOfficeId)}`,
          )) as { employees?: unknown };
          const scopedEmployees = normalizeEmployeeRows(scopedData.employees);
          if (scopedEmployees.length > 0) {
            setEmployees(scopedEmployees);
            return;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (!isOfficeScopeUnsupportedError(message)) {
            throw error;
          }
          usedOfficeScopeFallback = true;
        }
      }

      const unscopedData = (await fetchJson("/employees")) as {
        employees?: unknown;
      };
      const unscopedEmployees = normalizeEmployeeRows(unscopedData.employees);
      if (selectedOfficeId) {
        const scopedFromUnfiltered = unscopedEmployees.filter((employee) => {
          if (typeof employee.officeId === "string") {
            return employee.officeId === selectedOfficeId;
          }
          return true;
        });
        setEmployees(
          scopedFromUnfiltered.length > 0
            ? scopedFromUnfiltered
            : unscopedEmployees,
        );
      } else {
        setEmployees(unscopedEmployees);
      }

      if (usedOfficeScopeFallback) {
        setStatus((previous) =>
          previous && isOfficeScopeUnsupportedError(previous) ? null : previous,
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        setStatus(error.message);
      }
    }
  }, [
    canUseClockScreen,
    fetchJson,
    loadingLocations,
    selectedOfficeId,
    tenant,
  ]);

  const loadTodaySchedule = useCallback(async () => {
    if (!tenant || loadingLocations || !canUseClockScreen) {
      setTodaySchedule(null);
      setTodayScheduleStatus(null);
      return;
    }

    setTodayScheduleLoading(true);
    setTodayScheduleStatus(null);
    try {
      let payload: Partial<TodayScheduleResponse> | null = null;
      let usedOfficeScopeFallback = false;

      if (selectedOfficeId) {
        try {
          payload = (await fetchJson(
            `/employee-schedules/today?officeId=${encodeURIComponent(selectedOfficeId)}`,
          )) as Partial<TodayScheduleResponse>;
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (!isOfficeScopeUnsupportedError(message)) {
            throw error;
          }
          usedOfficeScopeFallback = true;
        }
      }

      if (!payload) {
        payload = (await fetchJson(
          "/employee-schedules/today",
        )) as Partial<TodayScheduleResponse>;
      }

      const parsedRows: TodayScheduleRow[] = [];
      if (Array.isArray(payload.rows)) {
        payload.rows.forEach((row) => {
          if (!row || typeof row !== "object") {
            return;
          }
          const candidate = row as Partial<TodayScheduleRow>;
          if (
            typeof candidate.employeeId !== "string" ||
            typeof candidate.employeeName !== "string"
          ) {
            return;
          }
          const roleLabel =
            typeof candidate.roleLabel === "string" &&
            candidate.roleLabel.trim()
              ? candidate.roleLabel
              : t.unassignedRole;
          parsedRows.push({
            employeeId: candidate.employeeId,
            employeeName: candidate.employeeName,
            startTime:
              typeof candidate.startTime === "string"
                ? candidate.startTime
                : "",
            endTime:
              typeof candidate.endTime === "string" ? candidate.endTime : "",
            roleLabel,
            officeId:
              typeof candidate.officeId === "string"
                ? candidate.officeId
                : null,
            officeName:
              typeof candidate.officeName === "string"
                ? candidate.officeName
                : null,
          });
        });
      }

      const rows =
        selectedOfficeId && usedOfficeScopeFallback
          ? parsedRows.filter((row) =>
              row.officeId ? row.officeId === selectedOfficeId : true,
            )
          : parsedRows;

      setTodaySchedule({
        date: typeof payload.date === "string" ? payload.date : "",
        weekday: typeof payload.weekday === "number" ? payload.weekday : 0,
        weekdayLabel:
          typeof payload.weekdayLabel === "string" ? payload.weekdayLabel : "",
        timezone:
          typeof payload.timezone === "string" ? payload.timezone : "UTC",
        rows,
      });
    } catch (error) {
      setTodaySchedule(null);
      setTodayScheduleStatus(
        error instanceof Error ? error.message : t.unableToLoadTodayTeam,
      );
    } finally {
      setTodayScheduleLoading(false);
    }
  }, [
    canUseClockScreen,
    fetchJson,
    loadingLocations,
    selectedOfficeId,
    t.unableToLoadTodayTeam,
    t.unassignedRole,
    tenant,
  ]);

  const loadWorkingNow = useCallback(async () => {
    if (!tenant || loadingLocations || !canUseClockScreen) {
      setWorkingNowRows([]);
      setWorkingNowStatus(null);
      return;
    }

    setWorkingNowLoading(true);
    setWorkingNowStatus(null);
    try {
      const query = new URLSearchParams();
      if (selectedOfficeId) {
        query.set("officeId", selectedOfficeId);
      }
      const suffix = query.toString();
      const data = (await fetchJson(
        `/employee-punches/recent${suffix ? `?${suffix}` : ""}`,
      )) as {
        rows?: Array<{
          id?: string;
          name?: string;
          status?: string | null;
          office?: string | null;
          group?: string | null;
        }>;
      };
      const rows = Array.isArray(data.rows) ? data.rows : [];
      const normalized = rows
        .map((row) => {
          const id = typeof row.id === "string" ? row.id.trim() : "";
          const name = typeof row.name === "string" ? row.name.trim() : "";
          const status = (
            typeof row.status === "string" ? row.status : "OUT"
          ).toUpperCase() as "IN" | "OUT" | "BREAK" | "LUNCH";
          if (!id || !name || !ACTIVE_SHIFT_STATUSES.has(status)) {
            return null;
          }
          const workingStatus = status as WorkingNowRow["status"];
          return {
            id,
            name,
            status: workingStatus,
            office:
              typeof row.office === "string" && row.office.trim()
                ? row.office
                : null,
            group:
              typeof row.group === "string" && row.group.trim() ? row.group : null,
          } satisfies WorkingNowRow;
        })
        .filter((row): row is WorkingNowRow => Boolean(row));
      setWorkingNowRows(normalized);
    } catch (error) {
      setWorkingNowRows([]);
      setWorkingNowStatus(
        error instanceof Error ? error.message : t.unableToLoadWorkingNow,
      );
    } finally {
      setWorkingNowLoading(false);
    }
  }, [
    canUseClockScreen,
    fetchJson,
    loadingLocations,
    selectedOfficeId,
    t.unableToLoadWorkingNow,
    tenant,
  ]);

  const loadCompanyOrderCatalog = useCallback(async () => {
    if (!tenant || !canUseClockScreen || !hasCompanyOrdersAccess) {
      setCompanyOrderCatalog([]);
      setCompanyOrderSupplier("");
      return;
    }

    try {
      const data = (await fetchJson("/company-orders/catalog", {
        headers: companyOrderHeaders,
      })) as {
        suppliers?: Array<{ supplierName?: string; items?: unknown[] }>;
      };
      const suppliers = (data.suppliers || [])
        .map((entry) => {
          const supplierName =
            typeof entry?.supplierName === "string"
              ? entry.supplierName.trim()
              : "";
          if (!supplierName) {
            return null;
          }
          const items = Array.isArray(entry.items)
            ? entry.items
                .map((item) => {
                  const candidate = item as Record<string, unknown>;
                  const nameEs =
                    typeof candidate.nameEs === "string"
                      ? candidate.nameEs.trim()
                      : "";
                  const nameEn =
                    typeof candidate.nameEn === "string"
                      ? candidate.nameEn.trim()
                      : "";
                  if (!nameEs && !nameEn) {
                    return null;
                  }
                  return {
                    nameEs: nameEs || nameEn,
                    nameEn: nameEn || nameEs,
                  } satisfies CompanyOrderCatalogItem;
                })
                .filter((item): item is CompanyOrderCatalogItem =>
                  Boolean(item),
                )
            : [];
          return {
            supplierName,
            items,
          } satisfies CompanyOrderCatalogSupplier;
        })
        .filter((supplier): supplier is CompanyOrderCatalogSupplier =>
          Boolean(supplier),
        );

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
        error instanceof Error ? error.message : t.unableToLoadCompanyOrders,
      );
    }
  }, [
    canUseClockScreen,
    companyOrderHeaders,
    fetchJson,
    hasCompanyOrdersAccess,
    t.unableToLoadCompanyOrders,
    tenant,
  ]);

  const loadCompanyOrders = useCallback(async () => {
    if (!tenant || !canUseClockScreen || !hasCompanyOrdersAccess) {
      setCompanyOrderRows([]);
      return;
    }

    setCompanyOrderLoading(true);
    try {
      const query = new URLSearchParams();
      query.set("limit", "20");
      if (selectedOfficeId) {
        query.set("officeId", selectedOfficeId);
      }

      const data = (await fetchJson(`/company-orders?${query.toString()}`, {
        headers: companyOrderHeaders,
      })) as { orders?: CompanyOrderRow[] };
      const orders = Array.isArray(data.orders) ? data.orders : [];
      setCompanyOrderRows(orders);
      if (typeof orders[0]?.weekStartDate === "string") {
        setLastSubmittedCompanyOrderWeekStart(orders[0].weekStartDate);
      }
      setCompanyOrderStatus(null);
    } catch (error) {
      setCompanyOrderRows([]);
      setCompanyOrderStatus(
        error instanceof Error ? error.message : t.unableToLoadCompanyOrders,
      );
    } finally {
      setCompanyOrderLoading(false);
    }
  }, [
    canUseClockScreen,
    companyOrderHeaders,
    fetchJson,
    hasCompanyOrdersAccess,
    selectedOfficeId,
    t.unableToLoadCompanyOrders,
    tenant,
  ]);

  useEffect(() => {
    let active = true;

    const loadTenantLocations = async () => {
      if (!tenant) {
        if (active) {
          setTenantOffices([]);
          setSelectedOfficeId(null);
          setTenantCompanyOrdersEnabled(false);
          setDirectoryEmployees([]);
          setLocationPickerOpen(false);
          setLocationStatus(null);
          setLoadingLocations(false);
        }
        return;
      }

      setLoadingLocations(true);
      setLocationStatus(null);
      try {
        const orderedBases = Array.from(
          new Set([resolvedApiBase, ...apiBaseCandidates].filter(Boolean)),
        ) as string[];
        let resolvedBase: string | null = null;
        let payload: {
          offices?: Array<{
            id?: string;
            name?: string;
            latitude?: number | null;
            longitude?: number | null;
            geofenceRadiusMeters?: number | null;
          }>;
          companyOrdersEnabled?: boolean;
          employees?: unknown[];
          message?: string;
          error?: string;
        } | null = null;
        let lastError: Error | null = null;

        for (const apiBase of orderedBases) {
          try {
            const endpoint = new URL(
              `${apiBase}/tenant-directory/employee-context`,
            );
            endpoint.searchParams.set(
              "tenant",
              tenant.slug || tenant.input || tenant.name,
            );
            const response = await fetch(endpoint.toString(), {
              headers: { Accept: "application/json" },
            });
            const data = (await response.json().catch(() => ({}))) as {
              offices?: Array<{
                id?: string;
                name?: string;
                latitude?: number | null;
                longitude?: number | null;
                geofenceRadiusMeters?: number | null;
              }>;
              companyOrdersEnabled?: boolean;
              employees?: unknown[];
              message?: string;
              error?: string;
            };

            if (!response.ok) {
              lastError = new Error(
                data.message || data.error || t.unableToLoadLocations,
              );
              continue;
            }

            payload = data;
            resolvedBase = apiBase;
            break;
          } catch (error) {
            if (error instanceof Error) {
              lastError = error;
            } else {
              lastError = new Error(t.unableToLoadLocations);
            }
          }
        }

        if (!payload) {
          throw lastError || new Error(t.unableToLoadLocations);
        }

        const offices = (payload.offices || [])
          .filter(
            (office): office is TenantOffice =>
              Boolean(office) &&
              typeof office.id === "string" &&
              typeof office.name === "string",
          )
          .map((office) => ({
            id: office.id,
            name: office.name,
            latitude:
              typeof office.latitude === "number" &&
              Number.isFinite(office.latitude)
                ? office.latitude
                : null,
            longitude:
              typeof office.longitude === "number" &&
              Number.isFinite(office.longitude)
                ? office.longitude
                : null,
            geofenceRadiusMeters:
              typeof office.geofenceRadiusMeters === "number" &&
              Number.isFinite(office.geofenceRadiusMeters)
                ? office.geofenceRadiusMeters
                : null,
          }));
        const contextEmployees = normalizeEmployeeRows(payload.employees);
        const officeIds = new Set(offices.map((office) => office.id));
        const officeStorageKey = `${OFFICE_STORAGE_PREFIX}.${tenant.authOrgId}`;
        const savedOfficeId = (
          await AsyncStorage.getItem(officeStorageKey)
        )?.trim();
        let nextOfficeId: string | null = null;

        if (offices.length > 0) {
          nextOfficeId =
            savedOfficeId && officeIds.has(savedOfficeId)
              ? savedOfficeId
              : offices[0].id;
        }

        if (nextOfficeId) {
          await AsyncStorage.setItem(officeStorageKey, nextOfficeId);
        } else {
          await AsyncStorage.removeItem(officeStorageKey);
        }

        if (!active) {
          return;
        }

        if (resolvedBase && resolvedApiBase !== resolvedBase) {
          setResolvedApiBase(resolvedBase);
        }
        setTenantOffices(offices);
        setTenantCompanyOrdersEnabled(
          typeof payload.companyOrdersEnabled === "boolean"
            ? payload.companyOrdersEnabled
            : true,
        );
        setDirectoryEmployees(contextEmployees);
        setSelectedOfficeId(nextOfficeId);
        setLocationPickerOpen(false);
      } catch (error) {
        if (!active) {
          return;
        }
        setTenantOffices((prev) => prev);
        setTenantCompanyOrdersEnabled(false);
        setLocationPickerOpen(false);
        setLocationStatus(
          error instanceof Error ? error.message : t.unableToLoadLocations,
        );
      } finally {
        if (active) {
          setLoadingLocations(false);
        }
      }
    };

    void loadTenantLocations();

    return () => {
      active = false;
    };
  }, [resolvedApiBase, tenant, t.unableToLoadLocations]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      const nextInset = event.endCoordinates?.height ?? 0;
      setKeyboardInset(nextInset > 0 ? nextInset : 0);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadTenant = async () => {
      try {
        const raw = await AsyncStorage.getItem(TENANT_STORAGE_KEY);
        if (!raw) {
          return;
        }

        const parsed = JSON.parse(raw) as TenantContext;
        if (
          parsed &&
          typeof parsed.authOrgId === "string" &&
          typeof parsed.slug === "string" &&
          typeof parsed.name === "string"
        ) {
          if (active) {
            setTenant(parsed);
            setTenantInput(parsed.input || parsed.slug || "");
          }
        }
      } catch {
        await AsyncStorage.removeItem(TENANT_STORAGE_KEY);
      } finally {
        if (active) {
          setTenantHydrated(true);
        }
      }
    };

    void loadTenant();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadTipSubmissionCache = async () => {
      try {
        const raw = await AsyncStorage.getItem(TIPS_SUBMITTED_STORAGE_KEY);
        if (!raw) {
          return;
        }
        const parsed = JSON.parse(raw) as Record<string, boolean>;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          await AsyncStorage.removeItem(TIPS_SUBMITTED_STORAGE_KEY);
          return;
        }

        const normalized: Record<string, boolean> = {};
        Object.entries(parsed).forEach(([key, value]) => {
          if (value === true) {
            normalized[key] = true;
          }
        });

        if (active) {
          setTipsSubmittedByDay(normalized);
        }
      } catch {
        await AsyncStorage.removeItem(TIPS_SUBMITTED_STORAGE_KEY);
      }
    };

    void loadTipSubmissionCache();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadLanguage = async () => {
      try {
        const raw = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (raw === "en" || raw === "es") {
          if (active) {
            setLanguage(raw);
          }
        }
      } catch {
        // ignore and keep default language
      }
    };

    void loadLanguage();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!tenantHydrated) {
      return;
    }
    void loadEmployees();
    void loadTodaySchedule();
    void loadWorkingNow();
  }, [loadEmployees, loadTodaySchedule, loadWorkingNow, tenantHydrated]);

  useEffect(() => {
    if (!tenantHydrated) {
      return;
    }
    if (!hasCompanyOrdersAccess) {
      setActiveViewTab("clock");
      setCompanyOrderCatalog([]);
      setCompanyOrderSupplier("");
      setCompanyOrderSearch("");
      setCompanyOrderNotes("");
      setCompanyOrderDrafts({});
      setCompanyOrderRows([]);
      setCompanyOrderStatus(null);
      return;
    }
    void loadCompanyOrderCatalog();
    void loadCompanyOrders();
  }, [
    hasCompanyOrdersAccess,
    loadCompanyOrderCatalog,
    loadCompanyOrders,
    tenantHydrated,
  ]);

  useEffect(() => {
    let active = true;

    const loadActiveShift = async () => {
      if (!tenant) {
        if (active) {
          setActiveShift(null);
        }
        return;
      }

      const tenantShiftKey = `${ACTIVE_SHIFT_STORAGE_KEY}.${tenant.authOrgId}`;
      const parseStoredShift = (raw: string): ActiveShift | null => {
        const parsed = JSON.parse(raw) as Partial<ActiveShift>;
        const employeeId =
          typeof parsed.employeeId === "string" ? parsed.employeeId.trim() : "";
        const employeeName =
          typeof parsed.employeeName === "string"
            ? parsed.employeeName.trim()
            : "";
        if (!employeeId || !employeeName) {
          return null;
        }
        const parsedAuthOrgId =
          typeof parsed.tenantAuthOrgId === "string"
            ? parsed.tenantAuthOrgId.trim()
            : "";
        const parsedSlug =
          typeof parsed.tenantSlug === "string" ? parsed.tenantSlug.trim() : "";
        const matchesTenant = parsedAuthOrgId
          ? parsedAuthOrgId === tenant.authOrgId
          : parsedSlug
            ? parsedSlug === tenant.slug
            : true;
        if (!matchesTenant) {
          return null;
        }
        return {
          tenantAuthOrgId: parsedAuthOrgId || tenant.authOrgId,
          tenantSlug: parsedSlug || tenant.slug,
          employeeId,
          employeeName,
          isManager: Boolean(parsed.isManager),
          isServer: Boolean(parsed.isServer),
          isKitchenManager: Boolean(parsed.isKitchenManager),
          startedAt:
            typeof parsed.startedAt === "string" && parsed.startedAt.trim()
              ? parsed.startedAt
              : new Date().toISOString(),
          pin:
            typeof parsed.pin === "string" && parsed.pin.trim()
              ? parsed.pin
              : undefined,
        };
      };

      try {
        const rawTenantShift = await AsyncStorage.getItem(tenantShiftKey);
        const rawLegacyShift = rawTenantShift
          ? null
          : await AsyncStorage.getItem(ACTIVE_SHIFT_STORAGE_KEY);
        const raw = rawTenantShift || rawLegacyShift;
        if (!raw) {
          if (active) {
            setActiveShift(null);
          }
          return;
        }

        const hydratedShift = parseStoredShift(raw);
        if (hydratedShift) {
          if (active) {
            setActiveShift(hydratedShift);
            setEmployeeName(hydratedShift.employeeName);
            if (hydratedShift.isServer) {
              setTipsReminderEmployeeId(hydratedShift.employeeId);
            }
          }
          if (!rawTenantShift) {
            await persistActiveShift(hydratedShift);
          }
        } else {
          if (rawTenantShift) {
            await AsyncStorage.removeItem(tenantShiftKey);
          }
          if (active) {
            setActiveShift(null);
          }
        }
      } catch {
        await AsyncStorage.removeItem(ACTIVE_SHIFT_STORAGE_KEY);
        await AsyncStorage.removeItem(tenantShiftKey);
        if (active) {
          setActiveShift(null);
        }
      }
    };

    void loadActiveShift();

    return () => {
      active = false;
    };
  }, [persistActiveShift, tenant]);

  useEffect(() => {
    if (!activeShift) {
      return;
    }
    const currentName = employeeName.trim().toLowerCase();
    const shiftName = activeShift.employeeName.trim().toLowerCase();
    if (!currentName || currentName !== shiftName) {
      setEmployeeName(activeShift.employeeName);
    }
  }, [activeShift, employeeName]);

  useEffect(() => {
    if (activeShift) {
      setPunchType((current) => (current === "IN" ? "OUT" : current));
      return;
    }
    setPunchType("IN");
  }, [activeShift]);

  const configureTenant = async () => {
    const value = tenantInput.trim();
    if (!value) {
      setTenantStatus(t.enterTenantNameOrSlug);
      return;
    }

    setResolvingTenant(true);
    setTenantStatus(null);
    try {
      const orderedBases = Array.from(
        new Set([resolvedApiBase, ...apiBaseCandidates].filter(Boolean)),
      ) as string[];
      let data: {
        id?: string;
        name?: string;
        slug?: string;
        subdomain?: string;
        authOrgId?: string;
        error?: string;
        message?: string;
      } | null = null;
      let resolvedBase: string | null = null;
      let lastError: Error | null = null;

      for (const apiBase of orderedBases) {
        try {
          const endpoint = new URL(`${apiBase}/tenant-directory/resolve`);
          endpoint.searchParams.set("tenant", value);
          const response = await fetch(endpoint.toString(), {
            headers: { Accept: "application/json" },
          });
          const payload = (await response.json().catch(() => ({}))) as {
            id?: string;
            name?: string;
            slug?: string;
            subdomain?: string;
            authOrgId?: string;
            error?: string;
            message?: string;
          };

          if (!response.ok || !payload.authOrgId || !payload.slug) {
            lastError = new Error(
              payload.message || payload.error || t.tenantNotFound,
            );
            continue;
          }

          data = payload;
          resolvedBase = apiBase;
          break;
        } catch (error) {
          if (error instanceof Error) {
            lastError = error;
          } else {
            lastError = new Error(t.unableToValidateTenant);
          }
        }
      }

      if (!data || !data.authOrgId || !data.slug) {
        throw lastError || new Error(t.unableToValidateTenant);
      }

      if (resolvedBase && resolvedApiBase !== resolvedBase) {
        setResolvedApiBase(resolvedBase);
      }

      const resolvedTenant: TenantContext = {
        input: value,
        name: data.name || value,
        slug: data.slug,
        subdomain: data.subdomain || data.slug,
        authOrgId: data.authOrgId,
      };

      setTenantOffices([]);
      setSelectedOfficeId(null);
      setTenantCompanyOrdersEnabled(false);
      setLocationPickerOpen(false);
      setLocationStatus(null);
      setTenant(resolvedTenant);
      await AsyncStorage.setItem(
        TENANT_STORAGE_KEY,
        JSON.stringify(resolvedTenant),
      );
      setTenantStatus(null);
      setStatus(null);
      setTipsStatus(null);
    } catch (error) {
      setTenantStatus(
        error instanceof Error ? error.message : t.unableToValidateTenant,
      );
    } finally {
      setResolvingTenant(false);
    }
  };

  const toggleLanguage = () => {
    const next = language === "en" ? "es" : "en";
    setLanguage(next);
    void AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, next);
  };

  const handleSelectLocation = async (officeId: string) => {
    if (!tenant) {
      return;
    }

    const officeStorageKey = `${OFFICE_STORAGE_PREFIX}.${tenant.authOrgId}`;
    setSelectedOfficeId(officeId);
    setLocationPickerOpen(false);
    setLocationStatus(null);
    setStatus(null);
    setTipsStatus(null);
    if (!activeShift) {
      setEmployeeName("");
    }
    try {
      await AsyncStorage.setItem(officeStorageKey, officeId);
    } catch {
      // keep in-memory selection if persistence fails
    }
  };

  const setCompanyOrderDraftQuantity = (
    supplierName: string,
    key: string,
    rawValue: string,
  ) => {
    const normalized = normalizeOrderQuantityInput(rawValue);
    setCompanyOrderDrafts((prev) => {
      const supplierDraft = prev[supplierName] || {};
      if (!normalized) {
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
      if (supplierDraft[key] === normalized) {
        return prev;
      }
      return {
        ...prev,
        [supplierName]: {
          ...supplierDraft,
          [key]: normalized,
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
    if (!hasCompanyOrdersAccess || !companyOrdersActor) {
      setCompanyOrderStatus(t.kitchenManagerOnly);
      return;
    }
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
      setCompanyOrderStatus(t.noOrderItemsForSupplier);
      return;
    }

    if (requiresLocationSelection && !selectedOfficeId) {
      setCompanyOrderStatus(t.selectLocationBeforeClockIn);
      return;
    }

    setCompanyOrderSaving(true);
    setCompanyOrderStatus(null);
    try {
      let weekStartDate = lastSubmittedCompanyOrderWeekStart;
      for (const payload of supplierPayloads) {
        const createdOrder = (await fetchJson("/company-orders", {
          method: "POST",
          headers: companyOrderHeaders,
          body: JSON.stringify({
            supplierName: payload.supplierName,
            officeId: selectedOfficeId || undefined,
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
        `${t.companyOrderSaved} (${supplierPayloads.length} suppliers)`,
      );
      setCompanyOrderDrafts({});
      setCompanyOrderNotes("");
      setCompanyOrderSearch("");
      await loadCompanyOrders();
    } catch (error) {
      setCompanyOrderStatus(
        error instanceof Error ? error.message : t.unableToLoadCompanyOrders,
      );
    } finally {
      setCompanyOrderSaving(false);
    }
  };

  const handleCompanyOrderExport = async (
    format: "pdf" | "csv" | "excel",
  ) => {
    if (!hasCompanyOrdersAccess || !companyOrdersActor) {
      setCompanyOrderStatus(t.kitchenManagerOnly);
      return;
    }
    setCompanyOrderExportingFormat(format);
    try {
      const weekStartDate =
        lastSubmittedCompanyOrderWeekStart || getCurrentWeekStartDateKey();
      const ok = await fetchCompanyOrderExport(
        format,
        weekStartDate,
        companyOrderHeaders,
      );
      if (ok) {
        setCompanyOrderStatus(
          `${t.companyOrderSaved} ${format.toUpperCase()} ready for week ${weekStartDate}.`,
        );
      } else {
        setCompanyOrderStatus(t.unableToLoadCompanyOrders);
      }
    } catch (error) {
      setCompanyOrderStatus(
        error instanceof Error ? error.message : t.unableToLoadCompanyOrders,
      );
    } finally {
      setCompanyOrderExportingFormat(null);
    }
  };

  const getClockInCoordinates = useCallback(async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== Location.PermissionStatus.GRANTED) {
      throw new Error(t.locationPermissionRequired);
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = position.coords;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error(t.unableToReadLocation);
    }

    return { latitude, longitude };
  }, [t.locationPermissionRequired, t.unableToReadLocation]);

  const handlePunch = async () => {
    if (!tenant) {
      setStatus(t.tenantNotConfigured);
      return;
    }

    const targetEmployee = selectedEmployee;

    if (!targetEmployee) {
      if (punchType !== "IN") {
        setStatus(t.noActiveShiftUser);
      } else if (!employeeName.trim()) {
        setStatus(t.enterUsernameFirst);
      } else {
        setStatus(t.employeeNotFoundUseFullName);
      }
      return;
    }

    if (punchType === "OUT" && requiresTipsForOut && !hasSubmittedTips) {
      setStatus(t.submitTipsBeforeOut);
      setTipsStatus(t.tapSubmitTipsFirst);
      setTipsAlert(true);
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 50);
      return;
    }
    if (punchType === "IN" && targetEmployee.isServer && pendingTipDate) {
      setStatus(`Submit tips for ${pendingTipDate} before clocking in.`);
      setTipsStatus(`Pending tips for ${pendingTipDate}.`);
      setTipsAlert(true);
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 50);
      return;
    }

    const typedPin = normalizePinInput(pin);
    if (typedPin.length > 0 && typedPin.length !== 4) {
      setStatus(t.pinMustBe4Digits);
      return;
    }
    const requestPin =
      punchType === "IN"
        ? typedPin || undefined
        : typedPin || activeShift?.pin || undefined;

    setLoading(true);
    setStatus(null);
    try {
      const needsGeofenceCheck =
        punchType === "IN" &&
        Boolean(selectedOffice) &&
        typeof selectedOffice?.latitude === "number" &&
        typeof selectedOffice?.longitude === "number";
      const coordinates = needsGeofenceCheck
        ? await getClockInCoordinates()
        : null;

      const basePunchPayload: Record<string, unknown> = {
        type: punchType,
        pin: requestPin,
      };
      const geoPunchPayload: Record<string, unknown> = coordinates
        ? {
            ...basePunchPayload,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
          }
        : basePunchPayload;
      let punchResponse: {
        managerMessage?: {
          subject?: string;
          message?: string;
          fromName?: string | null;
        } | null;
      } | null = null;

      try {
        punchResponse = (await fetchJson(
          `/employee-punches/${targetEmployee.id}`,
          {
            method: "POST",
            body: JSON.stringify(geoPunchPayload),
          },
        )) as {
          managerMessage?: {
            subject?: string;
            message?: string;
            fromName?: string | null;
          } | null;
        };
      } catch (submitError) {
        const message =
          submitError instanceof Error ? submitError.message.toLowerCase() : "";
        const optionalKeysUsed =
          Object.keys(geoPunchPayload).length >
          Object.keys(basePunchPayload).length;
        if (optionalKeysUsed && message.includes("should not exist")) {
          punchResponse = (await fetchJson(
            `/employee-punches/${targetEmployee.id}`,
            {
              method: "POST",
              body: JSON.stringify(basePunchPayload),
            },
          )) as {
            managerMessage?: {
              subject?: string;
              message?: string;
              fromName?: string | null;
            } | null;
          };
        } else {
          throw submitError;
        }
      }
      setStatus(t.punchRecorded);
      setServerTipsRequired(false);
      setLastPunch({
        name: targetEmployee.name,
        type: punchType,
        occurredAt: new Date(),
      });
      if (punchType === "IN") {
        const shift: ActiveShift = {
          tenantAuthOrgId: tenant.authOrgId,
          tenantSlug: tenant.slug,
          employeeId: targetEmployee.id,
          employeeName: targetEmployee.name,
          isManager: Boolean(targetEmployee.isManager),
          isServer: Boolean(targetEmployee.isServer),
          isKitchenManager: Boolean(targetEmployee.isKitchenManager),
          startedAt: new Date().toISOString(),
          pin: typedPin || undefined,
        };
        setActiveShift(shift);
        await persistActiveShift(shift);
        setEmployeeName(targetEmployee.name);
        setTipsAlert(false);
        setPendingTipWorkDate(null);
      }
      if (punchType !== "IN" && activeShift && !activeShift.pin && typedPin) {
        const shifted: ActiveShift = { ...activeShift, pin: typedPin };
        setActiveShift(shifted);
        await persistActiveShift(shifted);
      }
      if (punchType === "IN" && targetEmployee.isServer) {
        setTipsReminderEmployeeId(targetEmployee.id);
      }
      if (punchType === "IN" && punchResponse?.managerMessage) {
        const messageSubject =
          typeof punchResponse.managerMessage.subject === "string" &&
          punchResponse.managerMessage.subject.trim()
            ? punchResponse.managerMessage.subject
            : t.managerMessageFallbackSubject;
        const messageBody =
          typeof punchResponse.managerMessage.message === "string"
            ? punchResponse.managerMessage.message.trim()
            : "";
        const fromName =
          typeof punchResponse.managerMessage.fromName === "string" &&
          punchResponse.managerMessage.fromName.trim()
            ? punchResponse.managerMessage.fromName
            : "";
        const fromLine = fromName
          ? `\n\n${t.managerMessageFrom}: ${fromName}`
          : "";
        const alertBody = `${messageBody}${fromLine}`.trim();
        Alert.alert(
          messageSubject,
          alertBody || t.managerMessageFallbackSubject,
        );
      }
      setPin("");
      await loadWorkingNow();
      if (punchType === "OUT") {
        if (requiresTipsForOut) {
          setCashTips("0");
          setCreditCardTips("0");
        }
        clearActiveShiftSession(true);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t.punchFailed;
      if (
        punchType !== "IN" &&
        message.toLowerCase().includes("employee not found")
      ) {
        clearActiveShiftSession(true);
        setStatus(t.noActiveShiftUser);
      } else if (
        message.toLowerCase().includes("server users must submit") ||
        message.toLowerCase().includes("submit cash and credit card tips")
      ) {
        setServerTipsRequired(true);
        setStatus(t.submitTipsBeforeOut);
        setTipsStatus(t.tapSubmitTipsFirst);
        setTipsAlert(true);
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 50);
      } else if (
        punchType === "IN" &&
        extractPendingTipsWorkDate(message)
      ) {
        const pendingDate = extractPendingTipsWorkDate(message) as string;
        setPendingTipWorkDate(pendingDate);
        setServerTipsRequired(true);
        setStatus(`Submit tips for ${pendingDate} before clocking in.`);
        setTipsStatus(`Pending tips for ${pendingDate}.`);
        setTipsAlert(true);
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 50);
      } else if (
        punchType === "IN" &&
        message.toLowerCase().includes("already has an active shift")
      ) {
        const recoveredShift: ActiveShift = {
          tenantAuthOrgId: tenant.authOrgId,
          tenantSlug: tenant.slug,
          employeeId: targetEmployee.id,
          employeeName: targetEmployee.name,
          isManager: Boolean(targetEmployee.isManager),
          isServer: Boolean(targetEmployee.isServer),
          isKitchenManager: Boolean(targetEmployee.isKitchenManager),
          startedAt: new Date().toISOString(),
          pin: typedPin || undefined,
        };
        setActiveShift(recoveredShift);
        await persistActiveShift(recoveredShift);
        setEmployeeName(targetEmployee.name);
        setPin("");
        setStatus(t.activeShiftRestored);
        void loadWorkingNow();
      } else {
        if (message.toLowerCase().includes("invalid pin")) {
          setStatus(t.invalidPinResetHint);
        } else {
          setStatus(message);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTips = async () => {
    const targetEmployee = selectedEmployee;

    if (!targetEmployee) {
      setTipsStatus(t.selectValidEmployee);
      return;
    }
    if (!targetEmployee.isServer) {
      setTipsStatus(t.tipsOnlyForServers);
      return;
    }
    const targetWorkDate = pendingTipDate || new Date().toISOString().slice(0, 10);
    const targetTipKey = getTipSubmissionKey(targetEmployee.id, targetWorkDate);
    if (tipsSubmittedByDay[targetTipKey]) {
      setTipsStatus(t.tipsSaved);
      setTipsAlert(false);
      if (pendingTipDate) {
        setPendingTipWorkDate(null);
      }
      return;
    }

    const cash = Number.parseFloat(cashTips || "0");
    const credit = Number.parseFloat(creditCardTips || "0");
    if (
      !Number.isFinite(cash) ||
      cash < 0 ||
      !Number.isFinite(credit) ||
      credit < 0
    ) {
      setTipsStatus(t.tipsMustBeValid);
      return;
    }

    setSavingTips(true);
    setTipsStatus(null);
    try {
      await fetchJson(`/employee-tips/${targetEmployee.id}`, {
        method: "POST",
        body: JSON.stringify({
          cashTips: cash,
          creditCardTips: credit,
          workDate: targetWorkDate,
        }),
      });
      setServerTipsRequired(false);
      setTipsSubmittedByDay((prev) => {
        if (prev[targetTipKey]) {
          return prev;
        }
        const next = { ...prev, [targetTipKey]: true };
        void AsyncStorage.setItem(
          TIPS_SUBMITTED_STORAGE_KEY,
          JSON.stringify(next),
        );
        return next;
      });
      if (pendingTipDate) {
        setPendingTipWorkDate(null);
      }
      setTipsStatus(t.tipsSaved);
      setTipsAlert(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t.unableToSaveTips;
      if (message.toLowerCase().includes("already submitted")) {
        setTipsSubmittedByDay((prev) => {
          if (prev[targetTipKey]) {
            return prev;
          }
          const next = { ...prev, [targetTipKey]: true };
          void AsyncStorage.setItem(
            TIPS_SUBMITTED_STORAGE_KEY,
            JSON.stringify(next),
          );
          return next;
        });
        setServerTipsRequired(false);
        if (pendingTipDate) {
          setPendingTipWorkDate(null);
        }
        setTipsStatus(t.tipsSaved);
        setTipsAlert(false);
      } else {
        setTipsStatus(message);
      }
    } finally {
      setSavingTips(false);
    }
  };

  return (
    <LinearGradient
      colors={["#0b101a", "#111c2b", "#151f30"]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.keyboardWrap}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[
              styles.container,
              keyboardInset > 0
                ? {
                    paddingBottom: Math.max(48, keyboardInset + 24),
                  }
                : null,
            ]}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
          >
            <View style={styles.brandRow}>
              <Image
                source={BRAND_LOGO}
                style={styles.brandLogo}
                resizeMode="contain"
              />
              <View>
                <Text style={styles.title}>ClockIn</Text>
                <Text style={styles.subtitle}>{t.appSubtitle}</Text>
              </View>
            </View>

            {!tenantHydrated ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t.loading}</Text>
                <Text style={styles.subtitleDark}>{t.checkingSavedTenant}</Text>
              </View>
            ) : !tenant ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t.welcome}</Text>
                <Text style={styles.subtitleDark}>
                  {t.enterTenantBeforeClockIn}
                </Text>

                <Text style={styles.label}>{t.tenantName}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. clockin-demo"
                  value={tenantInput}
                  onChangeText={setTenantInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {tenantStatus && (
                  <Text style={styles.statusText}>{tenantStatus}</Text>
                )}

                <TouchableOpacity
                  style={[styles.button, styles.primary]}
                  onPress={configureTenant}
                  disabled={resolvingTenant}
                >
                  <Text style={styles.primaryText}>
                    {resolvingTenant ? t.checking : t.continue}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : loadingLocations ? (
              <>
                <View style={styles.tenantBar}>
                  <View style={styles.tenantBarInfo}>
                    <Text style={styles.tenantBarText}>
                      {t.tenant}: {tenant.name}
                    </Text>
                  </View>
                  <View style={styles.tenantBarActions}>
                    <TouchableOpacity
                      style={styles.tenantSwitch}
                      onPress={toggleLanguage}
                    >
                      <Text style={styles.tenantSwitchText}>
                        {t.language}: {language.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>{t.loadingLocations}</Text>
                </View>
              </>
            ) : requiresLocationSelection && !selectedOfficeId ? (
              <>
                <View style={styles.tenantBar}>
                  <View style={styles.tenantBarInfo}>
                    <Text style={styles.tenantBarText}>
                      {t.tenant}: {tenant.name}
                    </Text>
                  </View>
                  <View style={styles.tenantBarActions}>
                    <TouchableOpacity
                      style={styles.tenantSwitch}
                      onPress={toggleLanguage}
                    >
                      <Text style={styles.tenantSwitchText}>
                        {t.language}: {language.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>{t.chooseLocation}</Text>
                  <Text style={styles.subtitleDark}>
                    {t.selectLocationBeforeClockIn}
                  </Text>

                  <Text style={styles.label}>{t.location}</Text>
                  <View style={styles.locationList}>
                    {tenantOffices.map((office) => (
                      <TouchableOpacity
                        key={office.id}
                        style={styles.locationOption}
                        onPress={() => {
                          void handleSelectLocation(office.id);
                        }}
                      >
                        <Text style={styles.locationOptionText}>
                          {office.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {locationStatus && (
                    <Text style={styles.statusText}>{locationStatus}</Text>
                  )}
                </View>
              </>
            ) : (
              <>
                <View style={styles.tenantBar}>
                  <View style={styles.tenantBarInfo}>
                    <Text style={styles.tenantBarText}>
                      {t.tenant}: {tenant.name}
                    </Text>
                    {!!selectedOffice && (
                      <Text style={styles.tenantMetaText}>
                        {t.location}: {selectedOffice.name}
                      </Text>
                    )}
                  </View>
                  <View style={styles.tenantBarActions}>
                    {tenantOffices.length > 1 && (
                      <TouchableOpacity
                        style={styles.tenantSwitch}
                        onPress={() => setLocationPickerOpen((open) => !open)}
                      >
                        <Text style={styles.tenantSwitchText}>
                          {locationPickerOpen
                            ? t.hideLocations
                            : t.changeLocation}
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.tenantSwitch}
                      onPress={toggleLanguage}
                    >
                      <Text style={styles.tenantSwitchText}>
                        {t.language}: {language.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {tenantOffices.length > 1 && locationPickerOpen && (
                  <View style={styles.locationPickerPanel}>
                    {tenantOffices.map((office) => {
                      const isActive = office.id === selectedOfficeId;
                      return (
                        <TouchableOpacity
                          key={office.id}
                          style={
                            isActive
                              ? styles.locationOptionActive
                              : styles.locationOption
                          }
                          onPress={() => {
                            void handleSelectLocation(office.id);
                          }}
                        >
                          <Text
                            style={
                              isActive
                                ? styles.locationOptionTextActive
                                : styles.locationOptionText
                            }
                          >
                            {office.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    {locationStatus && (
                      <Text style={[styles.statusText, styles.locationStatus]}>
                        {locationStatus}
                      </Text>
                    )}
                  </View>
                )}
                {locationStatus && !locationPickerOpen && (
                  <Text style={[styles.statusText, styles.locationStatus]}>
                    {locationStatus}
                  </Text>
                )}
                {hasCompanyOrdersAccess && (
                  <View style={styles.viewTabRow}>
                    <TouchableOpacity
                      style={
                        activeViewTab === "clock"
                          ? styles.viewTabButtonActive
                          : styles.viewTabButton
                      }
                      onPress={() => setActiveViewTab("clock")}
                    >
                      <Text
                        style={
                          activeViewTab === "clock"
                            ? styles.viewTabTextActive
                            : styles.viewTabText
                        }
                      >
                        {t.clockStation}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={
                        activeViewTab === "companyOrders"
                          ? styles.viewTabButtonActive
                          : styles.viewTabButton
                      }
                      onPress={() => setActiveViewTab("companyOrders")}
                    >
                      <Text
                        style={
                          activeViewTab === "companyOrders"
                            ? styles.viewTabTextActive
                            : styles.viewTabText
                        }
                      >
                        {t.companyOrders}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {activeViewTab === "clock" ? (
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>{t.clockStation}</Text>
                      <View style={styles.headerPills}>
                        {showTipReminderTag && (
                          <View style={styles.tipReminderPill}>
                            <Text style={styles.tipReminderText}>
                              {t.tipsDueAtOut}
                            </Text>
                          </View>
                        )}
                        <View style={styles.systemRow}>
                          <View style={styles.systemDot} />
                          <Text style={styles.systemText}>
                            {t.systemOnline}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <Text style={styles.label}>{t.username}</Text>
                    {sessionEmployee ? (
                      <View style={styles.lockedNameRow}>
                        <View style={styles.lockedNameDot} />
                        <Text style={styles.lockedNameText}>
                          {sessionEmployee.name}
                        </Text>
                      </View>
                    ) : (
                      <TextInput
                        style={styles.input}
                        placeholder={t.enterFullName}
                        value={employeeName}
                        onChangeText={setEmployeeName}
                        autoCorrect={false}
                        autoCapitalize="words"
                      />
                    )}
                    {!sessionEmployee && employeeName.trim().length > 0 && (
                      <View style={styles.verifyRow}>
                        <View
                          style={[
                            styles.verifyDot,
                            selectedEmployee
                              ? styles.verifyDotOn
                              : styles.verifyDotOff,
                          ]}
                        />
                        <Text style={styles.verifyText}>
                          {selectedEmployee
                            ? `${selectedEmployee.name} (${t.verified})`
                            : t.noExactMatchYet}
                        </Text>
                      </View>
                    )}

                    <Text style={styles.label}>{t.pin}</Text>
                    <View style={styles.pinRow}>
                    <TextInput
                      style={[styles.input, styles.pinInput]}
                      placeholder={
                          punchType === "IN" ||
                          needsManualPinForSession ||
                          pin.length > 0
                            ? "••••"
                            : t.autoPin
                      }
                      secureTextEntry
                      keyboardType="number-pad"
                      value={pin}
                      onChangeText={(value) =>
                          setPin(normalizePinInput(value))
                      }
                      maxLength={4}
                      editable
                    />
                      <View style={styles.pinIcon}>
                        <Text style={styles.pinIconText}>123</Text>
                      </View>
                    </View>

                    <Text style={styles.label}>{t.action}</Text>
                    <View style={styles.actionRow}>
                      {actions.map((action) => (
                        <TouchableOpacity
                          key={action}
                          style={
                            punchType === action
                              ? styles.actionButtonActive
                              : styles.actionButton
                          }
                          onPress={() => setPunchType(action)}
                        >
                          <Text
                            style={
                              punchType === action
                                ? styles.actionTextActive
                                : styles.actionText
                            }
                          >
                            {t.actions[action]}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {showTipInputs && (
                      <>
                        <Text
                          style={[
                            styles.tipSectionTitle,
                            tipsAlert
                              ? styles.tipSectionTitleAlert
                              : styles.tipSectionTitleOk,
                          ]}
                        >
                          {t.tipSubmissionRequired}
                        </Text>
                        {pendingTipDate ? (
                          <Text style={styles.statusText}>
                            Pending tips required for {pendingTipDate}.
                          </Text>
                        ) : null}
                        <Text style={styles.label}>{t.cashTips}</Text>
                        <TextInput
                          style={styles.input}
                          value={cashTips}
                          onChangeText={setCashTips}
                          keyboardType="decimal-pad"
                          inputMode="decimal"
                          placeholder="0.00"
                        />
                        <Text style={styles.label}>{t.creditCardTips}</Text>
                        <TextInput
                          style={styles.input}
                          value={creditCardTips}
                          onChangeText={setCreditCardTips}
                          keyboardType="decimal-pad"
                          inputMode="decimal"
                          placeholder="0.00"
                        />
                        {tipsStatus && (
                          <Text
                            style={[
                              styles.statusText,
                              tipsAlert
                                ? styles.tipStatusAlert
                                : styles.tipStatusOk,
                            ]}
                          >
                            {tipsStatus}
                          </Text>
                        )}
                        <TouchableOpacity
                          style={[
                            styles.button,
                            styles.tipsSubmitButton,
                            tipsAlert
                              ? styles.tipsSubmitButtonAlert
                              : styles.tipsSubmitButtonOk,
                          ]}
                          onPress={handleSubmitTips}
                          disabled={savingTips}
                        >
                          <Text
                            style={[
                              styles.tipsSubmitButtonText,
                              tipsAlert && styles.tipsSubmitButtonTextAlert,
                            ]}
                          >
                            {savingTips ? t.savingTips : t.tapToSubmitTips}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {status && <Text style={styles.statusText}>{status}</Text>}

                    <TouchableOpacity
                      style={[styles.button, styles.primary]}
                      onPress={handlePunch}
                      disabled={loading}
                    >
                      <Text style={styles.primaryText}>
                        {loading ? t.saving : t.confirmPunch}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.teamCard}>
                    <Text style={styles.teamTitle}>{t.companyOrders}</Text>
                    <Text style={styles.teamMeta}>
                      {t.companyOrdersTabHint}
                    </Text>

                    <View style={styles.companyOrderExportRow}>
                      <TouchableOpacity
                        style={styles.tenantSwitch}
                        disabled={companyOrderExportingFormat !== null}
                        onPress={() => {
                          void handleCompanyOrderExport("pdf");
                        }}
                      >
                        <Text style={styles.tenantSwitchText}>
                          {companyOrderExportingFormat === "pdf"
                            ? t.preparingDownload
                            : t.downloadPdf}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.tenantSwitch}
                        disabled={companyOrderExportingFormat !== null}
                        onPress={() => {
                          void handleCompanyOrderExport("csv");
                        }}
                      >
                        <Text style={styles.tenantSwitchText}>
                          {companyOrderExportingFormat === "csv"
                            ? t.preparingDownload
                            : t.downloadCsv}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.tenantSwitch}
                        disabled={companyOrderExportingFormat !== null}
                        onPress={() => {
                          void handleCompanyOrderExport("excel");
                        }}
                      >
                        <Text style={styles.tenantSwitchText}>
                          {companyOrderExportingFormat === "excel"
                            ? t.preparingDownload
                            : t.downloadExcel}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>{t.orderSupplier}</Text>
                    <View style={styles.teamRoleTabs}>
                      {companyOrderCatalog.map((supplier) => {
                        const isActive =
                          supplier.supplierName === companyOrderSupplier;
                        const supplierSelectedCount = Object.values(
                          companyOrderDrafts[supplier.supplierName] || {},
                        ).filter((value) => Number(value) > 0).length;
                        return (
                          <TouchableOpacity
                            key={`company-supplier-${supplier.supplierName}`}
                            style={
                              isActive
                                ? styles.teamRoleTabActive
                                : styles.teamRoleTab
                            }
                            onPress={() =>
                              setCompanyOrderSupplier(supplier.supplierName)
                            }
                          >
                            <Text
                              style={
                                isActive
                                  ? styles.teamRoleTabTextActive
                                  : styles.teamRoleTabText
                              }
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

                    <TextInput
                      style={[styles.input, styles.companyOrderSearchInput]}
                      placeholder={t.orderItemSearchPlaceholder}
                      placeholderTextColor="rgba(31, 26, 22, 0.35)"
                      value={companyOrderSearch}
                      onChangeText={setCompanyOrderSearch}
                      onFocus={() => {
                        setTimeout(() => {
                          scrollRef.current?.scrollToEnd({ animated: true });
                        }, 90);
                      }}
                      autoCorrect={false}
                    />
                    <View style={styles.teamRoleTabs}>
                      <TouchableOpacity
                        style={
                          !companyOrderShowOnlyAdded
                            ? styles.teamRoleTabActive
                            : styles.teamRoleTab
                        }
                        onPress={() => setCompanyOrderShowOnlyAdded(false)}
                      >
                        <Text
                          style={
                            !companyOrderShowOnlyAdded
                              ? styles.teamRoleTabTextActive
                              : styles.teamRoleTabText
                          }
                        >
                          {t.allItems}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={
                          companyOrderShowOnlyAdded
                            ? styles.teamRoleTabActive
                            : styles.teamRoleTab
                        }
                        onPress={() => setCompanyOrderShowOnlyAdded(true)}
                      >
                        <Text
                          style={
                            companyOrderShowOnlyAdded
                              ? styles.teamRoleTabTextActive
                              : styles.teamRoleTabText
                          }
                        >
                          {t.inCartOnly}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {selectedCompanyOrderSupplier ? (
                      <View style={styles.companyOrderItemsWrap}>
                        {visibleCompanyOrderItems.length === 0 ? (
                          <Text style={styles.teamEmptyText}>
                            {t.noOrderItemsForSupplier}
                          </Text>
                        ) : (
                          visibleCompanyOrderItems.map((item) => {
                            const key = companyOrderItemKey(
                              item.nameEs,
                              item.nameEn,
                            );
                            return (
                              <View
                                key={`company-item-${key}`}
                                style={styles.companyOrderItemRow}
                              >
                                <View style={styles.companyOrderItemMain}>
                                  <Text style={styles.teamEmployeeName}>
                                    {item.nameEs}
                                  </Text>
                                  <Text style={styles.teamEmployeeMeta}>
                                    {item.nameEn}
                                  </Text>
                                </View>
                                {Number(selectedCompanySupplierDraft[key] || "0") >
                                0 ? (
                                  <Text style={styles.teamEmployeeMeta}>
                                    {t.orderQuantity}:{" "}
                                    {selectedCompanySupplierDraft[key]}
                                  </Text>
                                ) : null}
                                <TouchableOpacity
                                  style={styles.companyOrderAddButton}
                                  onPress={() => handleCompanyOrderAddItem(item)}
                                >
                                  <Text style={styles.companyOrderAddButtonText}>
                                    {t.addItem}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            );
                          })
                        )}
                        {hasMoreCompanyOrderItems ? (
                          <TouchableOpacity
                            style={styles.tenantSwitch}
                            onPress={() =>
                              setCompanyOrderVisibleCount(
                                (current) => current + 16,
                              )
                            }
                          >
                            <Text style={styles.tenantSwitchText}>
                              {t.showMoreItems}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ) : (
                      <Text style={styles.teamEmptyText}>
                        {t.orderSupplier}
                      </Text>
                    )}

                    <View style={styles.companyOrderCartSection}>
                      <View style={styles.teamHeaderRow}>
                        <Text style={styles.teamTitle}>{t.orderSummary}</Text>
                        <Text style={styles.teamMeta}>
                          {selectedCompanyOrderCount} {t.itemsLabel} •{" "}
                          {t.totalUnits}: {selectedCompanyOrderTotalUnits}
                        </Text>
                      </View>
                      {companyOrderCartItems.length === 0 ? (
                        <Text style={styles.teamEmptyText}>{t.noItemsInCart}</Text>
                      ) : (
                        companyOrderCartItems.map((item) => (
                          <View
                            key={`company-cart-${item.supplierName}-${item.key}`}
                            style={styles.companyOrderCartRow}
                          >
                            <View style={styles.companyOrderItemMain}>
                              <Text style={styles.teamEmployeeName}>
                                {item.nameEs}
                              </Text>
                              <Text style={styles.teamEmployeeMeta}>
                                {item.nameEn} • {item.supplierName}
                              </Text>
                            </View>
                            <View style={styles.companyOrderCartActions}>
                              <TouchableOpacity
                                style={styles.companyOrderStepButton}
                                onPress={() =>
                                  handleCompanyOrderStepItem(
                                    item.supplierName,
                                    item.key,
                                    -1,
                                  )
                                }
                              >
                                <Text style={styles.companyOrderStepButtonText}>
                                  -
                                </Text>
                              </TouchableOpacity>
                              <View style={styles.companyOrderQtyBadge}>
                                <Text style={styles.companyOrderQtyBadgeText}>
                                  {Number(item.quantity.toFixed(2))}
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={styles.companyOrderStepButton}
                                onPress={() =>
                                  handleCompanyOrderStepItem(
                                    item.supplierName,
                                    item.key,
                                    1,
                                  )
                                }
                              >
                                <Text style={styles.companyOrderStepButtonText}>
                                  +
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.companyOrderRemoveButton}
                                onPress={() =>
                                  handleCompanyOrderRemoveItem(
                                    item.supplierName,
                                    item.key,
                                  )
                                }
                              >
                                <Text style={styles.companyOrderAddButtonText}>
                                  {t.removeItem}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))
                      )}
                    </View>

                    <Text style={styles.label}>{t.orderNotes}</Text>
                    <TextInput
                      style={[styles.input, styles.companyOrderNotesInput]}
                      value={companyOrderNotes}
                      onChangeText={setCompanyOrderNotes}
                      placeholder={t.orderNotesPlaceholder}
                      placeholderTextColor="rgba(31, 26, 22, 0.35)"
                      onFocus={() => {
                        setTimeout(() => {
                          scrollRef.current?.scrollToEnd({ animated: true });
                        }, 90);
                      }}
                      multiline
                    />

                    {companyOrderStatus && (
                      <Text style={[styles.statusText, styles.teamStatusText]}>
                        {companyOrderStatus}
                      </Text>
                    )}

                    <TouchableOpacity
                      style={[styles.button, styles.primary]}
                      onPress={submitCompanyOrder}
                      disabled={companyOrderSaving}
                    >
                      <Text style={styles.primaryText}>
                        {companyOrderSaving
                          ? t.submittingCompanyOrder
                          : `${t.submitCompanyOrder} (${selectedCompanyOrderSupplierCount} suppliers / ${selectedCompanyOrderCount} items)`}
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.companyOrderRecentSection}>
                      <View style={styles.teamHeaderRow}>
                        <Text style={styles.teamTitle}>
                          {t.recentCompanyOrders}
                        </Text>
                        <TouchableOpacity
                          style={[
                            styles.tenantSwitch,
                            companyOrderLoading && styles.teamRefreshDisabled,
                          ]}
                          onPress={() => {
                            void loadCompanyOrders();
                          }}
                          disabled={companyOrderLoading}
                        >
                          <Text style={styles.tenantSwitchText}>
                            {companyOrderLoading ? t.refreshing : t.refresh}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      {companyOrderRows.length === 0 ? (
                        <Text style={styles.teamEmptyText}>
                          {t.noCompanyOrdersYet}
                        </Text>
                      ) : (
                        companyOrderRows.map((order) => (
                          <View
                            key={`company-order-${order.id}`}
                            style={styles.teamRow}
                          >
                            <View style={styles.teamRowMain}>
                              <Text style={styles.teamEmployeeName}>
                                {order.supplierName}
                              </Text>
                              {order.orderLabel ? (
                                <Text style={styles.teamEmployeeMeta}>
                                  {order.orderLabel}
                                </Text>
                              ) : null}
                              <Text style={styles.teamEmployeeMeta}>
                                {formatDisplayDate(
                                  order.orderDate.slice(0, 10),
                                )}{" "}
                                • {order.itemCount} items •{" "}
                                {order.totalQuantity}
                              </Text>
                              {Array.isArray(order.contributors) &&
                              order.contributors.length > 0 ? (
                                <Text style={styles.teamEmployeeMeta}>
                                  Contributors:{" "}
                                  {order.contributors.join(", ")}
                                </Text>
                              ) : null}
                              {order.notes ? (
                                <Text style={styles.teamEmployeeMeta}>
                                  {order.notes}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        ))
                      )}
                    </View>
                  </View>
                )}

                {activeViewTab === "clock" && (
                  <View style={styles.teamCard}>
                    <View style={styles.teamHeaderRow}>
                      <View style={styles.teamHeaderMain}>
                        <Text style={styles.teamTitle}>{t.workingNow}</Text>
                        <Text style={styles.teamMeta}>
                          {selectedOffice?.name || t.allLocations}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.tenantSwitch,
                          workingNowLoading && styles.teamRefreshDisabled,
                        ]}
                        onPress={() => {
                          void loadWorkingNow();
                        }}
                        disabled={workingNowLoading}
                      >
                        <Text style={styles.tenantSwitchText}>
                          {workingNowLoading ? t.refreshing : t.refresh}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {workingNowStatus ? (
                      <Text style={[styles.statusText, styles.teamStatusText]}>
                        {workingNowStatus}
                      </Text>
                    ) : workingNowRows.length === 0 ? (
                      <Text style={styles.teamEmptyText}>{t.noWorkingNow}</Text>
                    ) : (
                      workingNowRows.map((row) => (
                        <View key={`working-now-${row.id}`} style={styles.teamRow}>
                          <View style={styles.teamRowMain}>
                            <Text style={styles.teamEmployeeName}>{row.name}</Text>
                            <Text style={styles.teamEmployeeMeta}>
                              {row.group || t.unassignedRole} •{" "}
                              {row.office || t.allLocations}
                            </Text>
                          </View>
                          <Text style={styles.teamShiftText}>
                            {t.actions[row.status]}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {activeViewTab === "clock" && (
                  <View style={styles.teamCard}>
                    <View style={styles.teamHeaderRow}>
                      <View style={styles.teamHeaderMain}>
                        <Text style={styles.teamTitle}>{t.todaysTeam}</Text>
                        <Text style={styles.teamMeta}>
                          {todayScheduleLabel}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.tenantSwitch,
                          todayScheduleLoading && styles.teamRefreshDisabled,
                        ]}
                        onPress={() => {
                          void loadTodaySchedule();
                        }}
                        disabled={todayScheduleLoading}
                      >
                        <Text style={styles.tenantSwitchText}>
                          {todayScheduleLoading ? t.refreshing : t.refresh}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {todayScheduleStatus ? (
                      <Text style={[styles.statusText, styles.teamStatusText]}>
                        {todayScheduleStatus}
                      </Text>
                    ) : (
                      <>
                        <View style={styles.teamRoleTabs}>
                          {todayRoleTabs.map((tab) => {
                            const isActive = activeTodayRoleFilter === tab.key;
                            return (
                              <TouchableOpacity
                                key={`today-role-${tab.key}`}
                                style={
                                  isActive
                                    ? styles.teamRoleTabActive
                                    : styles.teamRoleTab
                                }
                                onPress={() => setTodayRoleFilter(tab.key)}
                              >
                                <Text
                                  style={
                                    isActive
                                      ? styles.teamRoleTabTextActive
                                      : styles.teamRoleTabText
                                  }
                                >
                                  {tab.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {filteredTodayScheduleRows.length === 0 ? (
                          <Text style={styles.teamEmptyText}>
                            {todaySchedule?.rows?.length
                              ? t.noTeamForRole
                              : t.noTeamToday}
                          </Text>
                        ) : (
                          filteredTodayScheduleRows.map((row) => (
                            <View
                              key={`today-row-${row.employeeId}`}
                              style={styles.teamRow}
                            >
                              <View style={styles.teamRowMain}>
                                <Text style={styles.teamEmployeeName}>
                                  {row.employeeName}
                                </Text>
                                <Text style={styles.teamEmployeeMeta}>
                                  {row.roleLabel || t.unassignedRole} •{" "}
                                  {row.officeName || t.allLocations}
                                </Text>
                              </View>
                              <Text style={styles.teamShiftText}>
                                {formatScheduleShiftLabel(
                                  row.startTime,
                                  row.endTime,
                                )}
                              </Text>
                            </View>
                          ))
                        )}
                      </>
                    )}
                  </View>
                )}

                {activeViewTab === "clock" && lastPunch && (
                  <View style={styles.deviceCard}>
                    <Text style={styles.deviceTitle}>{t.thisDevice}</Text>
                    <View style={styles.deviceRow}>
                      <View>
                        <Text style={styles.deviceName}>{lastPunch.name}</Text>
                        <Text style={styles.deviceDate}>
                          {lastPunch.occurredAt.toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.deviceStatus}>
                        <View style={styles.devicePill}>
                          <View
                            style={[
                              styles.deviceDot,
                              lastPunch.type === "IN"
                                ? styles.deviceDotOn
                                : styles.deviceDotOff,
                            ]}
                          />
                          <Text style={styles.devicePillText}>
                            {lastPunch.type}
                          </Text>
                        </View>
                        <Text style={styles.deviceTime}>
                          {lastPunch.occurredAt.toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
                <Text style={styles.footer}>{t.poweredBy}</Text>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
        <StatusBar style="light" />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  keyboardWrap: {
    flex: 1,
  },
  container: {
    padding: 22,
    paddingBottom: 48,
    gap: 20,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  brandLogo: {
    width: 176,
    height: 64,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#f9f4ea",
  },
  subtitle: {
    color: "rgba(232, 238, 249, 0.6)",
    marginTop: 4,
    fontSize: 13,
  },
  subtitleDark: {
    color: "#5c5b56",
    marginTop: 6,
    fontSize: 13,
  },
  tenantBar: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tenantBarInfo: {
    flex: 1,
    paddingRight: 8,
  },
  tenantBarText: {
    color: "#f9f4ea",
    fontWeight: "600",
  },
  tenantMetaText: {
    color: "rgba(249, 244, 234, 0.76)",
    marginTop: 3,
    fontSize: 12,
  },
  tenantBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tenantSwitch: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tenantSwitchText: {
    color: "#f9f4ea",
    fontSize: 12,
    fontWeight: "700",
  },
  viewTabRow: {
    flexDirection: "row",
    gap: 8,
  },
  viewTabButton: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  viewTabButtonActive: {
    borderWidth: 1,
    borderColor: "#3f7cff",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#2f5be6",
  },
  viewTabText: {
    color: "rgba(249, 244, 234, 0.9)",
    fontSize: 12,
    fontWeight: "700",
  },
  viewTabTextActive: {
    color: "#f9f4ea",
    fontSize: 12,
    fontWeight: "700",
  },
  locationPickerPanel: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    gap: 8,
  },
  locationList: {
    gap: 8,
    marginTop: 2,
  },
  locationOption: {
    borderWidth: 1,
    borderColor: "rgba(128, 110, 88, 0.3)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
  },
  locationOptionActive: {
    borderWidth: 1,
    borderColor: "#ff8a3d",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffecd9",
  },
  locationOptionText: {
    color: "#1f1a16",
    fontWeight: "600",
  },
  locationOptionTextActive: {
    color: "#9a4a16",
    fontWeight: "700",
  },
  locationStatus: {
    color: "rgba(249, 244, 234, 0.82)",
    marginTop: 0,
  },
  card: {
    backgroundColor: "#f4ece2",
    borderRadius: 26,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  headerPills: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f1a16",
  },
  tipReminderPill: {
    backgroundColor: "rgba(255, 138, 61, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 138, 61, 0.5)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tipReminderText: {
    fontSize: 11,
    color: "#8a4a1f",
    fontWeight: "700",
  },
  systemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  systemDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#43b36d",
  },
  systemText: {
    fontSize: 11,
    color: "#3b3b3b",
  },
  label: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "#5c5b56",
    marginTop: 10,
    marginBottom: 6,
  },
  tipSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 2,
  },
  tipSectionTitleOk: {
    color: "#1f7a3f",
  },
  tipSectionTitleAlert: {
    color: "#b42318",
  },
  input: {
    backgroundColor: "#fffaf6",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: "rgba(128, 110, 88, 0.2)",
  },
  companyOrderSearchInput: {
    marginTop: 8,
  },
  companyOrderNotesInput: {
    minHeight: 84,
    textAlignVertical: "top",
    paddingVertical: 12,
  },
  companyNameAutocompleteList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    backgroundColor: "rgba(19, 33, 52, 0.95)",
    borderRadius: 12,
    overflow: "hidden",
  },
  companyNameAutocompleteItem: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  companyNameAutocompleteText: {
    color: "#f9f4ea",
    fontSize: 13,
    fontWeight: "600",
  },
  pinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pinInput: {
    flex: 1,
  },
  pinIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#f0e6d8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(128, 110, 88, 0.2)",
  },
  pinIconText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5c5b56",
  },
  verifyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  verifyDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  verifyDotOn: {
    backgroundColor: "#43b36d",
  },
  verifyDotOff: {
    backgroundColor: "#c2c2c2",
  },
  verifyText: {
    fontSize: 12,
    color: "#5c5b56",
  },
  lockedNameRow: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  lockedNameDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#43b36d",
  },
  lockedNameText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2b2a27",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 6,
  },
  actionButton: {
    borderWidth: 1,
    borderColor: "rgba(128, 110, 88, 0.3)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
  },
  actionButtonActive: {
    borderWidth: 1,
    borderColor: "#ff8a3d",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: "#ff8a3d",
  },
  actionText: {
    color: "#1a1a1a",
    fontSize: 12,
  },
  actionTextActive: {
    color: "#1a1a1a",
    fontWeight: "700",
    fontSize: 12,
  },
  statusText: {
    marginTop: 10,
    color: "#5c5b56",
  },
  tipStatusOk: {
    color: "#1f7a3f",
    fontWeight: "600",
  },
  tipStatusAlert: {
    color: "#b42318",
    fontWeight: "600",
  },
  button: {
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  primary: {
    backgroundColor: "#ff8a3d",
  },
  secondary: {
    backgroundColor: "#f0e6d8",
    marginTop: 10,
  },
  tipsSubmitButton: {
    marginTop: 10,
  },
  tipsSubmitButtonOk: {
    backgroundColor: "#d9f5e4",
    borderWidth: 1,
    borderColor: "#7ccf9a",
  },
  tipsSubmitButtonAlert: {
    backgroundColor: "#fde2e0",
    borderWidth: 1,
    borderColor: "#f5a7a2",
  },
  primaryText: {
    fontWeight: "700",
    color: "#1a1a1a",
    fontSize: 15,
  },
  secondaryText: {
    fontWeight: "700",
    color: "#4b5563",
    fontSize: 14,
  },
  tipsSubmitButtonText: {
    fontWeight: "700",
    color: "#155d32",
    fontSize: 14,
  },
  tipsSubmitButtonTextAlert: {
    color: "#912018",
  },
  teamCard: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    gap: 10,
  },
  teamHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  teamHeaderMain: {
    flex: 1,
    gap: 4,
  },
  teamTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f9f4ea",
  },
  teamMeta: {
    color: "rgba(249, 244, 234, 0.74)",
    fontSize: 12,
  },
  teamRefreshDisabled: {
    opacity: 0.6,
  },
  teamStatusText: {
    marginTop: 0,
    color: "rgba(249, 244, 234, 0.85)",
  },
  teamRoleTabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  horizontalChipScroll: {
    marginTop: 4,
    maxHeight: 52,
  },
  horizontalChipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 10,
  },
  teamRoleTab: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  teamRoleTabActive: {
    borderWidth: 1,
    borderColor: "#3f7cff",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: "#2f5be6",
  },
  teamRoleTabText: {
    color: "rgba(249, 244, 234, 0.9)",
    fontSize: 12,
    fontWeight: "600",
  },
  teamRoleTabTextActive: {
    color: "#f9f4ea",
    fontSize: 12,
    fontWeight: "700",
  },
  teamEmptyText: {
    color: "rgba(249, 244, 234, 0.72)",
    fontSize: 12,
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  teamRowMain: {
    flex: 1,
    gap: 2,
  },
  teamEmployeeName: {
    color: "#f9f4ea",
    fontWeight: "600",
    fontSize: 14,
  },
  teamEmployeeMeta: {
    color: "rgba(249, 244, 234, 0.7)",
    fontSize: 12,
  },
  teamShiftText: {
    color: "#ffceaa",
    fontSize: 12,
    fontWeight: "700",
  },
  companyOrderItemsWrap: {
    gap: 8,
    marginTop: 8,
  },
  companyOrderItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  companyOrderItemMain: {
    flex: 1,
    gap: 2,
  },
  companyOrderCartSection: {
    marginTop: 10,
    gap: 8,
  },
  companyOrderCartRow: {
    flexDirection: "column",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  companyOrderCartActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  companyOrderStepButton: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
    minWidth: 34,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  companyOrderStepButtonText: {
    color: "#f9f4ea",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 18,
  },
  companyOrderQtyBadge: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.24)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    minWidth: 56,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  companyOrderQtyBadgeText: {
    color: "#f9f4ea",
    fontSize: 13,
    fontWeight: "700",
  },
  companyOrderRemoveButton: {
    marginLeft: "auto",
    borderWidth: 1,
    borderColor: "rgba(255, 137, 108, 0.4)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255, 137, 108, 0.12)",
  },
  companyOrderQtyInput: {
    width: 82,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(128, 110, 88, 0.25)",
    height: 38,
    paddingHorizontal: 10,
    textAlign: "center",
    color: "#1f1a16",
    fontWeight: "700",
  },
  companyOrderAddButton: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  companyOrderAddButtonText: {
    color: "#f9f4ea",
    fontSize: 12,
    fontWeight: "700",
  },
  companyOrderRecentSection: {
    marginTop: 12,
    gap: 8,
  },
  companyOrderExportRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  deviceCard: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  deviceTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f9f4ea",
    marginBottom: 10,
  },
  deviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deviceName: {
    color: "#f9f4ea",
    fontWeight: "600",
    fontSize: 15,
  },
  deviceDate: {
    color: "rgba(249, 244, 234, 0.7)",
    fontSize: 12,
    marginTop: 4,
  },
  deviceStatus: {
    alignItems: "flex-end",
  },
  devicePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  devicePillText: {
    color: "#f9f4ea",
    fontWeight: "700",
    fontSize: 11,
  },
  deviceDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  deviceDotOn: {
    backgroundColor: "#43b36d",
  },
  deviceDotOff: {
    backgroundColor: "#f97316",
  },
  deviceTime: {
    color: "rgba(249, 244, 234, 0.7)",
    fontSize: 12,
    marginTop: 6,
  },
  footer: {
    textAlign: "center",
    color: "rgba(249, 244, 234, 0.45)",
    fontSize: 12,
    marginTop: 16,
  },
});
