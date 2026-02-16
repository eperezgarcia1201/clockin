import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Device from "expo-device";
import Constants from "expo-constants";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const normalizeApiBase = (value: string) => value.trim().replace(/\/$/, "");

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
    parseHostCandidate(runtimeConfig.manifest2?.extra?.expoClient?.hostUri ?? null),
    parseHostCandidate(Constants.linkingUri ?? null),
  ];

  return Array.from(new Set(hosts.filter((host): host is string => Boolean(host))));
};

const apiBaseCandidates = (() => {
  const values: string[] = [];
  const runningOnSimulator = !Device.isDevice;
  const metroHosts = pickMetroHosts();
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (fromEnv) {
    const fromEnvHost = parseHostCandidate(fromEnv);
    if (runningOnSimulator || !fromEnvHost || !isLoopbackHost(fromEnvHost)) {
      values.push(fromEnv);
    }
  }

  metroHosts.forEach((host) => {
    if (!runningOnSimulator && isLoopbackHost(host)) {
      return;
    }
    values.push(`http://${host}:4000/api`);
  });

  if (runningOnSimulator) {
    values.push("http://localhost:4000/api");
    values.push("http://127.0.0.1:4000/api");
  }

  return Array.from(new Set(values.map(normalizeApiBase).filter(Boolean)));
})();

type Employee = {
  id: string;
  name: string;
  active: boolean;
  isServer?: boolean;
};

type TenantContext = {
  input: string;
  name: string;
  slug: string;
  subdomain: string;
  authOrgId: string;
};

type ActiveShift = {
  tenantAuthOrgId: string;
  employeeId: string;
  employeeName: string;
  isServer: boolean;
  startedAt: string;
  pin?: string;
};

type Language = "en" | "es";

const actions = ["IN", "OUT", "BREAK", "LUNCH"] as const;
const TENANT_STORAGE_KEY = "clockin.mobile.tenant";
const ACTIVE_SHIFT_STORAGE_KEY = "clockin.mobile.activeShift";
const LANGUAGE_STORAGE_KEY = "clockin.mobile.language";

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
    noActiveShiftUser: "No active shift user found. Enter username and punch IN first.",
    submitTipsBeforeOut: "Submit cash and credit card tips before clocking out.",
    tapSubmitTipsFirst: "Tap \"Tap to Submit Tips\" first, then confirm clock out.",
    punchRecorded: "Punch recorded.",
    punchFailed: "Punch failed.",
    selectValidEmployee: "Select a valid employee first.",
    tipsOnlyForServers: "Tips can only be submitted for server users.",
    tipsMustBeValid: "Tips must be valid non-negative numbers.",
    tipsSaved: "Tips saved for today.",
    unableToSaveTips: "Unable to save tips.",
    enterTenantNameOrSlug: "Enter your tenant name or slug.",
    unableToValidateTenant: "Unable to validate tenant right now.",
    tenantNotFound: "Tenant not found. Check with your manager.",
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
    enterTenantBeforeClockIn: "Ingresa el nombre de tu tenant antes de marcar entrada.",
    tenantName: "Nombre del tenant",
    continue: "Continuar",
    checking: "Verificando...",
    tenant: "Tenant",
    clockStation: "Estacion de reloj",
    systemOnline: "Sistema en linea",
    tipsDueAtOut: "Propinas al SALIR",
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
    employeeNotFoundUseFullName: "Empleado no encontrado. Usa el nombre completo.",
    noActiveShiftUser: "No hay turno activo. Ingresa usuario y marca ENTRADA primero.",
    submitTipsBeforeOut: "Debes enviar propinas en efectivo y tarjeta antes de salir.",
    tapSubmitTipsFirst: "Toca \"Toca para enviar propinas\" y luego confirma salida.",
    punchRecorded: "Marcacion registrada.",
    punchFailed: "Fallo la marcacion.",
    selectValidEmployee: "Selecciona un empleado valido primero.",
    tipsOnlyForServers: "Solo usuarios meseros pueden enviar propinas.",
    tipsMustBeValid: "Las propinas deben ser numeros validos no negativos.",
    tipsSaved: "Propinas guardadas para hoy.",
    unableToSaveTips: "No se pudieron guardar las propinas.",
    enterTenantNameOrSlug: "Ingresa el nombre o slug del tenant.",
    unableToValidateTenant: "No se puede validar el tenant ahora.",
    tenantNotFound: "Tenant no encontrado. Verifica con tu gerente.",
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

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeName, setEmployeeName] = useState("");
  const [pin, setPin] = useState("");
  const [cashTips, setCashTips] = useState("0");
  const [creditCardTips, setCreditCardTips] = useState("0");
  const [punchType, setPunchType] = useState<(typeof actions)[number]>("IN");
  const [status, setStatus] = useState<string | null>(null);
  const [tipsStatus, setTipsStatus] = useState<string | null>(null);
  const [tipsAlert, setTipsAlert] = useState(false);
  const [serverTipsRequired, setServerTipsRequired] = useState(false);
  const [tipsSubmittedKey, setTipsSubmittedKey] = useState<string | null>(null);
  const [tipsReminderEmployeeId, setTipsReminderEmployeeId] = useState<string | null>(null);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingTips, setSavingTips] = useState(false);
  const [resolvedApiBase, setResolvedApiBase] = useState<string | null>(null);
  const [lastPunch, setLastPunch] = useState<{
    name: string;
    type: string;
    occurredAt: Date;
  } | null>(null);

  const activeEmployees = useMemo(
    () => employees.filter((emp) => emp.active),
    [employees],
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
    const current = employees.find((emp) => emp.id === activeShift.employeeId);
    if (current) {
      return current;
    }
    return {
      id: activeShift.employeeId,
      name: activeShift.employeeName,
      active: true,
      isServer: activeShift.isServer,
    } as Employee;
  }, [tenant, activeShift, employees]);

  const selectedEmployee =
    punchType !== "IN" && sessionEmployee ? sessionEmployee : matchedEmployee;

  const getTodayKey = (employeeId: string) => {
    const today = new Date().toISOString().slice(0, 10);
    return `${employeeId}:${today}`;
  };

  const requiresTipsForOut = Boolean(selectedEmployee?.isServer || serverTipsRequired);
  const hasSubmittedTips =
    selectedEmployee !== null && tipsSubmittedKey === getTodayKey(selectedEmployee.id);
  const showTipInputs = punchType === "OUT" && requiresTipsForOut;
  const showTipReminderTag =
    selectedEmployee?.isServer &&
    (tipsReminderEmployeeId === selectedEmployee.id || serverTipsRequired);
  const needsManualPinForSession = Boolean(sessionEmployee) && !activeShift?.pin;
  const t = i18n[language];

  const fetchJson = useCallback(
    async (path: string, options?: RequestInit) => {
      if (!tenant) {
        throw new Error("Tenant not configured.");
      }

      const orderedBases = Array.from(
        new Set([resolvedApiBase, ...apiBaseCandidates].filter(Boolean)),
      ) as string[];
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
            lastError = new Error(
              data?.message || data?.error || "Request failed",
            );
            continue;
          }

          if (resolvedApiBase !== apiBase) {
            setResolvedApiBase(apiBase);
          }
          return response.json();
        } catch (error) {
          if (error instanceof Error) {
            lastError = error;
            if (/network request failed|fetch failed|load failed/i.test(error.message)) {
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

  const loadEmployees = useCallback(async () => {
    if (!tenant) {
      setEmployees([]);
      return;
    }

    try {
      const data = (await fetchJson("/employees")) as { employees: Employee[] };
      setEmployees(data.employees || []);
    } catch (error) {
      setEmployees([]);
      if (error instanceof Error) {
        setStatus(error.message);
      }
    }
  }, [fetchJson, tenant]);

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
  }, [loadEmployees, tenantHydrated]);

  useEffect(() => {
    let active = true;

    const loadActiveShift = async () => {
      if (!tenant) {
        if (active) {
          setActiveShift(null);
        }
        return;
      }

      try {
        const raw = await AsyncStorage.getItem(ACTIVE_SHIFT_STORAGE_KEY);
        if (!raw) {
          if (active) {
            setActiveShift(null);
          }
          return;
        }

        const parsed = JSON.parse(raw) as ActiveShift;
        if (
          parsed &&
          parsed.tenantAuthOrgId === tenant.authOrgId &&
          typeof parsed.employeeId === "string" &&
          typeof parsed.employeeName === "string"
        ) {
          if (active) {
            setActiveShift(parsed);
            setEmployeeName(parsed.employeeName);
            if (parsed.isServer) {
              setTipsReminderEmployeeId(parsed.employeeId);
            }
          }
        } else if (active) {
          setActiveShift(null);
        }
      } catch {
        await AsyncStorage.removeItem(ACTIVE_SHIFT_STORAGE_KEY);
        if (active) {
          setActiveShift(null);
        }
      }
    };

    void loadActiveShift();

    return () => {
      active = false;
    };
  }, [tenant]);

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
      let data:
        | {
            id?: string;
            name?: string;
            slug?: string;
            subdomain?: string;
            authOrgId?: string;
            error?: string;
            message?: string;
          }
        | null = null;
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
        error instanceof Error
          ? error.message
          : t.unableToValidateTenant,
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

  const handlePunch = async () => {
    if (!tenant) {
      setStatus(t.tenantNotConfigured);
      return;
    }

    const targetEmployee =
      punchType !== "IN" && sessionEmployee ? sessionEmployee : matchedEmployee;

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

    const requestPin =
      punchType === "IN" ? pin || undefined : activeShift?.pin || pin || undefined;

    setLoading(true);
    setStatus(null);
    try {
      await fetchJson(`/employee-punches/${targetEmployee.id}`, {
        method: "POST",
        body: JSON.stringify({
          type: punchType,
          pin: requestPin,
        }),
      });
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
          employeeId: targetEmployee.id,
          employeeName: targetEmployee.name,
          isServer: Boolean(targetEmployee.isServer),
          startedAt: new Date().toISOString(),
          pin: pin || undefined,
        };
        setActiveShift(shift);
        await AsyncStorage.setItem(ACTIVE_SHIFT_STORAGE_KEY, JSON.stringify(shift));
        setEmployeeName(targetEmployee.name);
        setTipsAlert(false);
      }
      if (punchType !== "IN" && activeShift && !activeShift.pin && pin) {
        const shifted: ActiveShift = { ...activeShift, pin };
        setActiveShift(shifted);
        await AsyncStorage.setItem(ACTIVE_SHIFT_STORAGE_KEY, JSON.stringify(shifted));
      }
      if (punchType === "IN" && targetEmployee.isServer) {
        setTipsReminderEmployeeId(targetEmployee.id);
      }
      setPin("");
      if (punchType === "OUT" && requiresTipsForOut) {
        setCashTips("0");
        setCreditCardTips("0");
        setTipsSubmittedKey(null);
        setTipsReminderEmployeeId(null);
        setTipsStatus(null);
        setServerTipsRequired(false);
        setActiveShift(null);
        await AsyncStorage.removeItem(ACTIVE_SHIFT_STORAGE_KEY);
        setTipsAlert(false);
        setPunchType("IN");
        setEmployeeName("");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t.punchFailed;
      if (
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
      } else {
        setStatus(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTips = async () => {
    const targetEmployee =
      punchType !== "IN" && sessionEmployee ? sessionEmployee : matchedEmployee;

    if (!targetEmployee) {
      setTipsStatus(t.selectValidEmployee);
      return;
    }
    if (!targetEmployee.isServer) {
      setTipsStatus(t.tipsOnlyForServers);
      return;
    }

    const cash = Number.parseFloat(cashTips || "0");
    const credit = Number.parseFloat(creditCardTips || "0");
    if (!Number.isFinite(cash) || cash < 0 || !Number.isFinite(credit) || credit < 0) {
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
        }),
      });
      setServerTipsRequired(false);
      setTipsSubmittedKey(getTodayKey(targetEmployee.id));
      setTipsStatus(t.tipsSaved);
      setTipsAlert(false);
    } catch (error) {
      setTipsStatus(error instanceof Error ? error.message : t.unableToSaveTips);
    } finally {
      setSavingTips(false);
    }
  };

  return (
    <LinearGradient colors={["#0b101a", "#111c2b", "#151f30"]} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.container}>
          <View style={styles.brandRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>WS</Text>
            </View>
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
              <Text style={styles.subtitleDark}>{t.enterTenantBeforeClockIn}</Text>

              <Text style={styles.label}>{t.tenantName}</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. clockin-demo"
                value={tenantInput}
                onChangeText={setTenantInput}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {tenantStatus && <Text style={styles.statusText}>{tenantStatus}</Text>}

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
          ) : (
            <>
              <View style={styles.tenantBar}>
                <Text style={styles.tenantBarText}>{t.tenant}: {tenant.name}</Text>
                <View style={styles.tenantBarActions}>
                  <TouchableOpacity style={styles.tenantSwitch} onPress={toggleLanguage}>
                    <Text style={styles.tenantSwitchText}>
                      {t.language}: {language.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{t.clockStation}</Text>
                  <View style={styles.headerPills}>
                    {showTipReminderTag && (
                      <View style={styles.tipReminderPill}>
                        <Text style={styles.tipReminderText}>{t.tipsDueAtOut}</Text>
                      </View>
                    )}
                    <View style={styles.systemRow}>
                      <View style={styles.systemDot} />
                      <Text style={styles.systemText}>{t.systemOnline}</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.label}>{t.username}</Text>
                {sessionEmployee ? (
                  <View style={styles.lockedNameRow}>
                    <View style={styles.lockedNameDot} />
                    <Text style={styles.lockedNameText}>{sessionEmployee.name}</Text>
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
                        selectedEmployee ? styles.verifyDotOn : styles.verifyDotOff,
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
                      punchType === "IN" || needsManualPinForSession
                        ? "••••"
                        : t.autoPin
                    }
                    secureTextEntry={punchType === "IN" || needsManualPinForSession}
                    keyboardType="number-pad"
                    value={pin}
                    onChangeText={setPin}
                    maxLength={4}
                    editable={punchType === "IN" || needsManualPinForSession}
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
                        tipsAlert ? styles.tipSectionTitleAlert : styles.tipSectionTitleOk,
                      ]}
                    >
                      {t.tipSubmissionRequired}
                    </Text>
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
                          tipsAlert ? styles.tipStatusAlert : styles.tipStatusOk,
                        ]}
                      >
                        {tipsStatus}
                      </Text>
                    )}
                    <TouchableOpacity
                      style={[
                        styles.button,
                        styles.tipsSubmitButton,
                        tipsAlert ? styles.tipsSubmitButtonAlert : styles.tipsSubmitButtonOk,
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

              {lastPunch && (
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
                        <Text style={styles.devicePillText}>{lastPunch.type}</Text>
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
  badge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#ff8a3d",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  badgeText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
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
  tenantBarText: {
    color: "#f9f4ea",
    fontWeight: "600",
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
