import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import {
  ADMIN_LOGIN_CONTEXT_STORAGE_KEY,
  ADMIN_SESSION_STORAGE_KEY,
  ADMIN_TENANT_STORAGE_KEY,
} from "./app-config";
import { resolveNotificationListenerErrorMessage } from "./alerts-runtime";
import type { AccessPermissions, Screen } from "./types";

const VALID_SCREENS: Screen[] = [
  "dashboard",
  "users",
  "offices",
  "groups",
  "capture",
  "reports",
  "liquorControl",
  "alerts",
  "schedules",
  "companyOrders",
];

const coerceBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value === 1;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") {
      return true;
    }
  }
  return false;
};

const normalizeScreen = (value: unknown): Screen => {
  if (typeof value !== "string") {
    return "dashboard";
  }
  return VALID_SCREENS.includes(value as Screen)
    ? (value as Screen)
    : "dashboard";
};

const sanitizePermissions = (value: unknown): AccessPermissions | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const raw = value as Record<string, unknown>;
  return {
    dashboard: coerceBoolean(raw.dashboard),
    users: coerceBoolean(raw.users),
    locations: coerceBoolean(raw.locations),
    manageMultiLocation: coerceBoolean(raw.manageMultiLocation),
    groups: coerceBoolean(raw.groups),
    statuses: coerceBoolean(raw.statuses),
    schedules: coerceBoolean(raw.schedules),
    companyOrders: coerceBoolean(raw.companyOrders),
    reports: coerceBoolean(raw.reports),
    tips: coerceBoolean(raw.tips),
    salesCapture: coerceBoolean(raw.salesCapture),
    notifications: coerceBoolean(raw.notifications),
    settings: coerceBoolean(raw.settings),
    timeEdits: coerceBoolean(raw.timeEdits),
  };
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

type CompanyOrderPushPayload = {
  key: string;
  supplierName: string;
  weekStartDate: string;
  officeId: string | null;
};

const parseCompanyOrderPushPayload = (
  response: Notifications.NotificationResponse | null | undefined,
): CompanyOrderPushPayload | null => {
  const identifier =
    typeof response?.notification?.request?.identifier === "string"
      ? response.notification.request.identifier.trim()
      : "";
  const data = asRecord(response?.notification?.request?.content?.data);
  const kind = typeof data?.kind === "string" ? data.kind.trim() : "";
  if (kind !== "COMPANY_ORDER_SUBMITTED") {
    return null;
  }

  const supplierName =
    typeof data?.supplierName === "string" ? data.supplierName.trim() : "";
  const weekStartDate =
    typeof data?.weekStartDate === "string" ? data.weekStartDate.trim() : "";
  const officeId =
    typeof data?.officeId === "string" && data.officeId.trim()
      ? data.officeId.trim()
      : null;
  if (!supplierName || !weekStartDate) {
    return null;
  }

  return {
    key: identifier || `${kind}:${supplierName}:${weekStartDate}:${officeId || "all"}`,
    supplierName,
    weekStartDate,
    officeId,
  };
};

type LiquorFormState = {
  itemId: string;
  officeId: string;
  [key: string]: unknown;
};

type UseAdminLiquorBootstrapEffectsArgs = {
  hasLiquorPremiumAccess: boolean;
  liquorWorkspace: string;
  setLiquorWorkspace: (next: "inventory") => void;
  liquorCatalog: Array<{ id: string }>;
  companyOrdersOfficeId: string;
  setLiquorMovementForm: Dispatch<SetStateAction<LiquorFormState>>;
  setLiquorQuickCountForm: Dispatch<SetStateAction<LiquorFormState>>;
  setLiquorScanItemId: Dispatch<SetStateAction<string>>;
};

export function useAdminLiquorBootstrapEffects({
  hasLiquorPremiumAccess,
  liquorWorkspace,
  setLiquorWorkspace,
  liquorCatalog,
  companyOrdersOfficeId,
  setLiquorMovementForm,
  setLiquorQuickCountForm,
  setLiquorScanItemId,
}: UseAdminLiquorBootstrapEffectsArgs) {
  useEffect(() => {
    if (
      !hasLiquorPremiumAccess &&
      (liquorWorkspace === "scans" || liquorWorkspace === "invoices")
    ) {
      setLiquorWorkspace("inventory");
    }
  }, [hasLiquorPremiumAccess, liquorWorkspace, setLiquorWorkspace]);

  useEffect(() => {
    if (!liquorCatalog.length) {
      return;
    }
    const fallbackItemId = liquorCatalog[0]?.id || "";
    if (!fallbackItemId) {
      return;
    }
    setLiquorMovementForm((previous) =>
      previous.itemId
        ? previous
        : {
            ...previous,
            itemId: fallbackItemId,
            officeId: previous.officeId || companyOrdersOfficeId,
          },
    );
    setLiquorQuickCountForm((previous) =>
      previous.itemId
        ? previous
        : {
            ...previous,
            itemId: fallbackItemId,
            officeId: previous.officeId || companyOrdersOfficeId,
          },
    );
    setLiquorScanItemId((previous) => previous || fallbackItemId);
  }, [
    companyOrdersOfficeId,
    liquorCatalog,
    setLiquorMovementForm,
    setLiquorQuickCountForm,
    setLiquorScanItemId,
  ]);
}

type UseAdminTenantEffectsArgs = {
  tenantInput: string;
  username: string;
  setTenantInput: Dispatch<SetStateAction<string>>;
  setUsername: Dispatch<SetStateAction<string>>;
};

export function useAdminTenantEffects({
  tenantInput,
  username,
  setTenantInput,
  setUsername,
}: UseAdminTenantEffectsArgs) {
  useEffect(() => {
    let active = true;
    const loadTenant = async () => {
      try {
        const rawContext = await AsyncStorage.getItem(
          ADMIN_LOGIN_CONTEXT_STORAGE_KEY,
        );
        if (active && rawContext) {
          try {
            const parsed = JSON.parse(rawContext) as {
              tenantInput?: string;
              username?: string;
            };
            const storedTenant = parsed.tenantInput?.trim();
            const storedUsername = parsed.username?.trim();
            if (storedTenant) {
              setTenantInput(storedTenant);
            }
            if (storedUsername) {
              setUsername(storedUsername);
            }
          } catch {
            // fall back to legacy tenant-only storage
          }
        }
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
  }, [setTenantInput, setUsername]);

  useEffect(() => {
    const normalized = tenantInput.trim();
    if (!normalized) {
      return;
    }
    void AsyncStorage.setItem(ADMIN_TENANT_STORAGE_KEY, normalized);
  }, [tenantInput]);

  useEffect(() => {
    const normalizedTenant = tenantInput.trim();
    const normalizedUsername = username.trim();
    if (!normalizedTenant && !normalizedUsername) {
      return;
    }
    void AsyncStorage.setItem(
      ADMIN_LOGIN_CONTEXT_STORAGE_KEY,
      JSON.stringify({
        tenantInput: normalizedTenant,
        username: normalizedUsername,
      }),
    );
  }, [tenantInput, username]);
}

type PersistedAdminSession = {
  loggedIn?: unknown;
  activeTenant?: unknown;
  activeTenantLabel?: unknown;
  activeAdminUsername?: unknown;
  tenantInput?: unknown;
  username?: unknown;
  sessionManagerEmployeeId?: unknown;
  sessionManagerOfficeId?: unknown;
  managerClockExempt?: unknown;
  multiLocationEnabled?: unknown;
  liquorInventoryEnabled?: unknown;
  liquorPremiumEnabled?: unknown;
  screen?: unknown;
  permissions?: unknown;
};

type UseAdminSessionPersistenceEffectArgs = {
  loggedIn: boolean;
  activeTenant: string;
  activeTenantLabel: string;
  activeAdminUsername: string;
  tenantInput: string;
  username: string;
  activeLocationId: string;
  sessionManagerEmployeeId: string | null;
  sessionManagerOfficeId: string | null;
  managerClockExempt: boolean;
  multiLocationEnabled: boolean;
  liquorInventoryEnabled: boolean;
  liquorPremiumEnabled: boolean;
  screen: Screen;
  permissions: AccessPermissions;
  setLoggedIn: Dispatch<SetStateAction<boolean>>;
  setActiveTenant: Dispatch<SetStateAction<string>>;
  setActiveTenantLabel: Dispatch<SetStateAction<string>>;
  setActiveAdminUsername: Dispatch<SetStateAction<string>>;
  setTenantInput: Dispatch<SetStateAction<string>>;
  setUsername: Dispatch<SetStateAction<string>>;
  setActiveLocationId: Dispatch<SetStateAction<string>>;
  setSessionManagerEmployeeId: Dispatch<SetStateAction<string | null>>;
  setSessionManagerOfficeId: Dispatch<SetStateAction<string | null>>;
  setManagerClockExempt: Dispatch<SetStateAction<boolean>>;
  setMultiLocationEnabled: Dispatch<SetStateAction<boolean>>;
  setLiquorInventoryEnabled: Dispatch<SetStateAction<boolean>>;
  setLiquorPremiumEnabled: Dispatch<SetStateAction<boolean>>;
  setScreen: Dispatch<SetStateAction<Screen>>;
  setPermissions: Dispatch<SetStateAction<AccessPermissions>>;
};

export function useAdminSessionPersistenceEffect({
  loggedIn,
  activeTenant,
  activeTenantLabel,
  activeAdminUsername,
  tenantInput,
  username,
  activeLocationId,
  sessionManagerEmployeeId,
  sessionManagerOfficeId,
  managerClockExempt,
  multiLocationEnabled,
  liquorInventoryEnabled,
  liquorPremiumEnabled,
  screen,
  permissions,
  setLoggedIn,
  setActiveTenant,
  setActiveTenantLabel,
  setActiveAdminUsername,
  setTenantInput,
  setUsername,
  setActiveLocationId,
  setSessionManagerEmployeeId,
  setSessionManagerOfficeId,
  setManagerClockExempt,
  setMultiLocationEnabled,
  setLiquorInventoryEnabled,
  setLiquorPremiumEnabled,
  setScreen,
  setPermissions,
}: UseAdminSessionPersistenceEffectArgs) {
  const hydratedRef = useRef(false);

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      try {
        const raw = await AsyncStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
        if (!active || !raw) {
          return;
        }
        const parsed = JSON.parse(raw) as PersistedAdminSession;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          return;
        }
        const wasLoggedIn = coerceBoolean(parsed.loggedIn);
        const restoredActiveTenant =
          typeof parsed.activeTenant === "string"
            ? parsed.activeTenant.trim()
            : "";
        const restoredAdminUsername =
          typeof parsed.activeAdminUsername === "string"
            ? parsed.activeAdminUsername.trim()
            : "";
        if (!wasLoggedIn || !restoredActiveTenant || !restoredAdminUsername) {
          return;
        }
        const restoredTenantInput =
          typeof parsed.tenantInput === "string"
            ? parsed.tenantInput.trim()
            : restoredActiveTenant;
        const restoredUsername =
          typeof parsed.username === "string"
            ? parsed.username.trim()
            : restoredAdminUsername;
        const restoredTenantLabel =
          typeof parsed.activeTenantLabel === "string"
            ? parsed.activeTenantLabel.trim()
            : restoredActiveTenant;
        const restoredManagerEmployeeId =
          typeof parsed.sessionManagerEmployeeId === "string" &&
          parsed.sessionManagerEmployeeId.trim()
            ? parsed.sessionManagerEmployeeId.trim()
            : null;
        const restoredManagerOfficeId =
          typeof parsed.sessionManagerOfficeId === "string" &&
          parsed.sessionManagerOfficeId.trim()
            ? parsed.sessionManagerOfficeId.trim()
            : null;
        const restoredPermissions = sanitizePermissions(parsed.permissions);

        setActiveTenant(restoredActiveTenant);
        setActiveTenantLabel(restoredTenantLabel);
        setActiveAdminUsername(restoredAdminUsername);
        setTenantInput(restoredTenantInput);
        setUsername(restoredUsername);
        setSessionManagerEmployeeId(restoredManagerEmployeeId);
        setSessionManagerOfficeId(restoredManagerOfficeId);
        setManagerClockExempt(coerceBoolean(parsed.managerClockExempt));
        setMultiLocationEnabled(coerceBoolean(parsed.multiLocationEnabled));
        setLiquorInventoryEnabled(coerceBoolean(parsed.liquorInventoryEnabled));
        setLiquorPremiumEnabled(coerceBoolean(parsed.liquorPremiumEnabled));
        setScreen(normalizeScreen(parsed.screen));
        if (restoredPermissions) {
          setPermissions(restoredPermissions);
        }
        setLoggedIn(true);
      } catch {
        // ignore malformed payloads and continue logged out
      } finally {
        hydratedRef.current = true;
      }
    };

    void restoreSession();
    return () => {
      active = false;
    };
  }, [
    setActiveAdminUsername,
    setActiveLocationId,
    setActiveTenant,
    setActiveTenantLabel,
    setLiquorInventoryEnabled,
    setLiquorPremiumEnabled,
    setLoggedIn,
    setManagerClockExempt,
    setMultiLocationEnabled,
    setPermissions,
    setScreen,
    setSessionManagerEmployeeId,
    setSessionManagerOfficeId,
    setTenantInput,
    setUsername,
  ]);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }
    const persistSession = async () => {
      if (!loggedIn) {
        await AsyncStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
        return;
      }
      const normalizedActiveTenant = activeTenant.trim();
      const normalizedAdminUsername = activeAdminUsername.trim();
      if (!normalizedActiveTenant || !normalizedAdminUsername) {
        await AsyncStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
        return;
      }
      const payload: PersistedAdminSession = {
        loggedIn: true,
        activeTenant: normalizedActiveTenant,
        activeTenantLabel: activeTenantLabel.trim(),
        activeAdminUsername: normalizedAdminUsername,
        tenantInput: tenantInput.trim() || normalizedActiveTenant,
        username: username.trim() || normalizedAdminUsername,
        sessionManagerEmployeeId: sessionManagerEmployeeId || null,
        sessionManagerOfficeId: sessionManagerOfficeId || null,
        managerClockExempt,
        multiLocationEnabled,
        liquorInventoryEnabled,
        liquorPremiumEnabled,
        screen,
        permissions,
      };
      await AsyncStorage.setItem(
        ADMIN_SESSION_STORAGE_KEY,
        JSON.stringify(payload),
      );
    };

    void persistSession();
  }, [
    activeAdminUsername,
    activeLocationId,
    activeTenant,
    activeTenantLabel,
    liquorInventoryEnabled,
    liquorPremiumEnabled,
    loggedIn,
    managerClockExempt,
    multiLocationEnabled,
    permissions,
    screen,
    sessionManagerEmployeeId,
    sessionManagerOfficeId,
    tenantInput,
    username,
  ]);
}

type UseAdminNotificationRefreshEffectArgs = {
  loggedIn: boolean;
  loadNotifications: () => Promise<void>;
  setDataSyncError: Dispatch<SetStateAction<string | null>>;
};

export function useAdminNotificationRefreshEffect({
  loggedIn,
  loadNotifications,
  setDataSyncError,
}: UseAdminNotificationRefreshEffectArgs) {
  useEffect(() => {
    if (!loggedIn) {
      return;
    }
    let subscription: ReturnType<
      typeof Notifications.addNotificationReceivedListener
    > | null = null;
    try {
      subscription = Notifications.addNotificationReceivedListener(() => {
        void loadNotifications();
      });
    } catch (error) {
      setDataSyncError(resolveNotificationListenerErrorMessage(error));
    }
    return () => {
      try {
        subscription?.remove();
      } catch {
        // noop
      }
    };
  }, [loadNotifications, loggedIn, setDataSyncError]);
}

type UseAdminCompanyOrderNotificationOpenEffectArgs = {
  loggedIn: boolean;
  hasCompanyOrdersAccess: boolean;
  setScreen: Dispatch<SetStateAction<Screen>>;
  setActiveLocationId: Dispatch<SetStateAction<string>>;
  setCompanyOrderMode: Dispatch<SetStateAction<"orders" | "inPerson">>;
  setCompanyOrderSupplier: Dispatch<SetStateAction<string>>;
  setCompanyOrderExportAllCompanies: Dispatch<SetStateAction<boolean>>;
  setLastSubmittedCompanyOrderWeekStart: Dispatch<SetStateAction<string>>;
  setCompanyOrderStatus: Dispatch<SetStateAction<string | null>>;
  setCompanyOrderExportingFormat: Dispatch<
    SetStateAction<"pdf" | "csv" | "excel" | null>
  >;
  fetchCompanyOrderExport: (
    format: "pdf" | "csv" | "excel",
    weekStartDate: string,
    supplierName?: string | null,
    officeIdOverride?: string | null,
  ) => Promise<boolean>;
  loadCompanyOrders: () => Promise<void>;
  setDataSyncError: Dispatch<SetStateAction<string | null>>;
};

export function useAdminCompanyOrderNotificationOpenEffect({
  loggedIn,
  hasCompanyOrdersAccess,
  setScreen,
  setActiveLocationId,
  setCompanyOrderMode,
  setCompanyOrderSupplier,
  setCompanyOrderExportAllCompanies,
  setLastSubmittedCompanyOrderWeekStart,
  setCompanyOrderStatus,
  setCompanyOrderExportingFormat,
  fetchCompanyOrderExport,
  loadCompanyOrders,
  setDataSyncError,
}: UseAdminCompanyOrderNotificationOpenEffectArgs) {
  const pendingPayloadRef = useRef<CompanyOrderPushPayload | null>(null);
  const lastHandledKeyRef = useRef("");

  const handlePayload = async (payload: CompanyOrderPushPayload) => {
    if (lastHandledKeyRef.current === payload.key) {
      return;
    }
    lastHandledKeyRef.current = payload.key;
    pendingPayloadRef.current = null;

    if (payload.officeId) {
      setActiveLocationId(payload.officeId);
    }
    setScreen("companyOrders");
    setCompanyOrderMode("orders");
    setCompanyOrderExportAllCompanies(false);
    setCompanyOrderSupplier(payload.supplierName);
    setLastSubmittedCompanyOrderWeekStart(payload.weekStartDate);
    setCompanyOrderStatus(`Opening ${payload.supplierName} PDF...`);
    setCompanyOrderExportingFormat("pdf");
    void loadCompanyOrders();

    try {
      const ok = await fetchCompanyOrderExport(
        "pdf",
        payload.weekStartDate,
        payload.supplierName,
        payload.officeId,
      );
      setCompanyOrderStatus(
        ok
          ? `PDF ready for ${payload.supplierName}.`
          : "Unable to open company order PDF.",
      );
    } catch (error) {
      setCompanyOrderStatus(
        error instanceof Error
          ? error.message
          : "Unable to open company order PDF.",
      );
    } finally {
      setCompanyOrderExportingFormat(null);
      try {
        if (
          typeof Notifications.clearLastNotificationResponseAsync === "function"
        ) {
          await Notifications.clearLastNotificationResponseAsync();
        }
      } catch {
        // noop
      }
    }
  };

  useEffect(() => {
    if (
      !loggedIn ||
      !hasCompanyOrdersAccess ||
      !pendingPayloadRef.current
    ) {
      return;
    }
    void handlePayload(pendingPayloadRef.current);
  }, [hasCompanyOrdersAccess, loggedIn]);

  useEffect(() => {
    let active = true;

    const queueResponse = async (
      response: Notifications.NotificationResponse | null | undefined,
    ) => {
      const payload = parseCompanyOrderPushPayload(response);
      if (!payload || !active) {
        return;
      }
      if (lastHandledKeyRef.current === payload.key) {
        return;
      }
      pendingPayloadRef.current = payload;
      if (loggedIn && hasCompanyOrdersAccess) {
        await handlePayload(payload);
      }
    };

    let subscription: ReturnType<
      typeof Notifications.addNotificationResponseReceivedListener
    > | null = null;
    try {
      subscription = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          void queueResponse(response);
        },
      );
      const loadLastResponse = async () => {
        if (
          typeof Notifications.getLastNotificationResponseAsync !== "function"
        ) {
          return;
        }
        const response = await Notifications.getLastNotificationResponseAsync();
        await queueResponse(response);
      };
      void loadLastResponse();
    } catch (error) {
      setDataSyncError(resolveNotificationListenerErrorMessage(error));
    }

    return () => {
      active = false;
      try {
        subscription?.remove();
      } catch {
        // noop
      }
    };
  }, [
    fetchCompanyOrderExport,
    hasCompanyOrdersAccess,
    loadCompanyOrders,
    loggedIn,
    setActiveLocationId,
    setCompanyOrderExportAllCompanies,
    setCompanyOrderExportingFormat,
    setCompanyOrderMode,
    setCompanyOrderStatus,
    setCompanyOrderSupplier,
    setDataSyncError,
    setLastSubmittedCompanyOrderWeekStart,
    setScreen,
  ]);
}
