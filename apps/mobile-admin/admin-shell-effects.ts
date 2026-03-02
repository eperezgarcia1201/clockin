import { useEffect, type Dispatch, type SetStateAction } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { ADMIN_TENANT_STORAGE_KEY } from "./app-config";
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
  setTenantInput: Dispatch<SetStateAction<string>>;
};

export function useAdminTenantEffects({
  tenantInput,
  setTenantInput,
}: UseAdminTenantEffectsArgs) {
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
  }, [setTenantInput]);

  useEffect(() => {
    const normalized = tenantInput.trim();
    if (!normalized) {
      return;
    }
    void AsyncStorage.setItem(ADMIN_TENANT_STORAGE_KEY, normalized);
  }, [tenantInput]);
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
