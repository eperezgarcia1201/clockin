import { useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiBaseCandidates } from "./api-runtime";
import { loadAccessProfileData } from "./access-profile-runtime";
import {
  authenticateAdminTenantDirectory,
  resolveActiveTenantLabel,
  resolveLoginManagerEmployeeId,
  resolveLoginManagerOfficeId,
  resolveTenantForNextLogin,
} from "./admin-auth-runtime";
import {
  defaultAccessPermissions,
  permissionsFromFeaturePermissions,
} from "./app-state-helpers";
import { ADMIN_TENANT_STORAGE_KEY } from "./app-config";
import type { AccessPermissions, Screen } from "./types";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export const useAdminAuthActions = (params: {
  tenantInput: string;
  username: string;
  password: string;
  resolvedApiBase: string | null;
  fetchJson: FetchJson;
  setLoginLoading: (value: boolean) => void;
  setLoginStatus: (value: string | null) => void;
  setResolvedApiBase: (value: string | null) => void;
  setPermissions: (value: AccessPermissions | ((prev: AccessPermissions) => AccessPermissions)) => void;
  setLiquorInventoryEnabled: (value: boolean) => void;
  setLiquorPremiumEnabled: (value: boolean) => void;
  setMultiLocationEnabled: (value: boolean) => void;
  setActiveLocationId: (value: string) => void;
  setActiveTenant: (value: string) => void;
  setSessionManagerEmployeeId: (value: string | null) => void;
  setSessionManagerOfficeId: (value: string | null) => void;
  setManagerClockExempt: (value: boolean) => void;
  setManagerPin: (value: string) => void;
  setManagerPunchStatus: (value: string | null) => void;
  setManagerPendingTipWorkDate: (value: string | null) => void;
  setManagerCashTips: (value: string) => void;
  setManagerCreditCardTips: (value: string) => void;
  setTenantInput: (value: string) => void;
  setActiveTenantLabel: (value: string) => void;
  setActiveAdminUsername: (value: string) => void;
  setLoggedIn: (value: boolean) => void;
  setScreen: (value: Screen) => void;
  setDataSyncError: (value: string | null) => void;
}) => {
  const handleLogin = useCallback(async () => {
    if (!params.tenantInput.trim() || !params.username || !params.password) {
      params.setLoginStatus("Enter tenant, username, and password.");
      return;
    }
    params.setLoginLoading(true);
    params.setLoginStatus(null);
    try {
      const orderedBases = params.resolvedApiBase
        ? [params.resolvedApiBase]
        : (Array.from(new Set(apiBaseCandidates.filter(Boolean))) as string[]);
      const authResult = await authenticateAdminTenantDirectory({
        orderedBases,
        tenantInput: params.tenantInput,
        username: params.username,
        password: params.password,
        resolvedApiBase: params.resolvedApiBase,
        onUnresolvedBaseAttempt: (apiBase) => {
          params.setResolvedApiBase(apiBase);
        },
      });
      if (authResult.ok === false) {
        throw authResult.error;
      }
      const { verified, matchedBase } = authResult;

      if (params.resolvedApiBase !== matchedBase) {
        params.setResolvedApiBase(matchedBase);
      }
      params.setPermissions(
        permissionsFromFeaturePermissions(verified.featurePermissions) ||
          defaultAccessPermissions(),
      );
      params.setLiquorInventoryEnabled(false);
      params.setLiquorPremiumEnabled(false);
      params.setMultiLocationEnabled(false);
      const managerOfficeId = resolveLoginManagerOfficeId(
        verified.allowedOfficeId,
      );
      params.setActiveLocationId(managerOfficeId || "");
      params.setActiveTenant(verified.authOrgId.trim());
      params.setSessionManagerEmployeeId(
        resolveLoginManagerEmployeeId(verified.managerEmployeeId),
      );
      params.setSessionManagerOfficeId(managerOfficeId);
      params.setManagerClockExempt(false);
      params.setManagerPin("");
      params.setManagerPunchStatus(null);
      params.setManagerPendingTipWorkDate(null);
      params.setManagerCashTips("0");
      params.setManagerCreditCardTips("0");
      const tenantForNextLogin = resolveTenantForNextLogin(
        verified.slug,
        params.tenantInput,
      );
      if (tenantForNextLogin) {
        params.setTenantInput(tenantForNextLogin);
        void AsyncStorage.setItem(ADMIN_TENANT_STORAGE_KEY, tenantForNextLogin);
      }
      params.setActiveTenantLabel(
        resolveActiveTenantLabel({
          name: verified.name,
          slug: verified.slug,
          tenantInput: params.tenantInput,
        }),
      );
      params.setActiveAdminUsername(params.username.trim());
      params.setLoggedIn(true);
      params.setLoginStatus(null);
      params.setScreen("dashboard");
    } catch (error) {
      params.setLoginStatus(
        error instanceof Error ? error.message : "Invalid credentials.",
      );
    } finally {
      params.setLoginLoading(false);
    }
  }, [
    params.password,
    params.resolvedApiBase,
    params.tenantInput,
    params.username,
  ]);

  const loadAccessProfile = useCallback(async () => {
    const result = await loadAccessProfileData({ fetchJson: params.fetchJson });
    if (result.ok === false) {
      params.setLiquorInventoryEnabled(false);
      params.setLiquorPremiumEnabled(false);
      params.setDataSyncError(result.error);
      return;
    }
    const data = result.profile;
    params.setMultiLocationEnabled(Boolean(data.multiLocationEnabled));
    params.setPermissions((prev) => ({ ...prev, ...(data.permissions || {}) }));
    params.setLiquorInventoryEnabled(Boolean(data.liquorInventoryEnabled));
    params.setLiquorPremiumEnabled(Boolean(data.premiumFeaturesEnabled));
    params.setSessionManagerEmployeeId(
      result.managerSession.sessionManagerEmployeeId,
    );
    params.setSessionManagerOfficeId(result.managerSession.sessionManagerOfficeId);
    params.setManagerClockExempt(result.managerSession.managerClockExempt);
    if (result.managerSession.sessionManagerOfficeId) {
      params.setActiveLocationId(result.managerSession.sessionManagerOfficeId);
    } else if (result.clearActiveLocationScope) {
      params.setActiveLocationId("");
    }
    params.setDataSyncError(null);
  }, [params.fetchJson]);

  return { handleLogin, loadAccessProfile };
};
