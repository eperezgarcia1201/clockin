import { useEffect, type Dispatch, type SetStateAction } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import {
  ADMIN_LOGIN_CONTEXT_STORAGE_KEY,
  ADMIN_TENANT_STORAGE_KEY,
} from "./app-config";
import { resolveNotificationListenerErrorMessage } from "./alerts-runtime";

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
  activeLocationId: string;
  setTenantInput: Dispatch<SetStateAction<string>>;
  setUsername: Dispatch<SetStateAction<string>>;
  setActiveLocationId: Dispatch<SetStateAction<string>>;
};

export function useAdminTenantEffects({
  tenantInput,
  username,
  activeLocationId,
  setTenantInput,
  setUsername,
  setActiveLocationId,
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
              activeLocationId?: string;
            };
            const storedTenant = parsed.tenantInput?.trim();
            const storedUsername = parsed.username?.trim();
            const storedLocation = parsed.activeLocationId?.trim();
            if (storedTenant) {
              setTenantInput(storedTenant);
            }
            if (storedUsername) {
              setUsername(storedUsername);
            }
            if (storedLocation) {
              setActiveLocationId(storedLocation);
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
  }, [setActiveLocationId, setTenantInput, setUsername]);

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
    const normalizedLocation = activeLocationId.trim();
    if (!normalizedTenant && !normalizedUsername && !normalizedLocation) {
      return;
    }
    void AsyncStorage.setItem(
      ADMIN_LOGIN_CONTEXT_STORAGE_KEY,
      JSON.stringify({
        tenantInput: normalizedTenant,
        username: normalizedUsername,
        activeLocationId: normalizedLocation,
      }),
    );
  }, [activeLocationId, tenantInput, username]);
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
