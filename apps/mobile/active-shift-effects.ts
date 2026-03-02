import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, type Dispatch, type SetStateAction } from "react";
import { ACTIVE_SHIFT_STORAGE_KEY } from "./app-config";
import { parseStoredActiveShift } from "./active-shift-storage";
import type { ActiveShift, TenantContext } from "./types";

export const useActiveShiftEffects = (params: {
  tenant: TenantContext | null;
  activeShift: ActiveShift | null;
  employeeName: string;
  persistActiveShift: (shift: ActiveShift) => Promise<void>;
  setActiveShift: Dispatch<SetStateAction<ActiveShift | null>>;
  setEmployeeName: Dispatch<SetStateAction<string>>;
  setTipsReminderEmployeeId: Dispatch<SetStateAction<string | null>>;
  setPunchType: Dispatch<SetStateAction<"IN" | "OUT" | "BREAK" | "LUNCH">>;
}) => {
  useEffect(() => {
    let active = true;

    const loadActiveShift = async () => {
      if (!params.tenant) {
        if (active) {
          params.setActiveShift(null);
        }
        return;
      }

      const tenantShiftKey = `${ACTIVE_SHIFT_STORAGE_KEY}.${params.tenant.authOrgId}`;

      try {
        const rawTenantShift = await AsyncStorage.getItem(tenantShiftKey);
        const rawLegacyShift = rawTenantShift
          ? null
          : await AsyncStorage.getItem(ACTIVE_SHIFT_STORAGE_KEY);
        const raw = rawTenantShift || rawLegacyShift;
        if (!raw) {
          if (active) {
            params.setActiveShift(null);
          }
          return;
        }

        const hydratedShift = parseStoredActiveShift(raw, params.tenant);
        if (hydratedShift) {
          if (active) {
            params.setActiveShift(hydratedShift);
            params.setEmployeeName(hydratedShift.employeeName);
            if (hydratedShift.isServer) {
              params.setTipsReminderEmployeeId(hydratedShift.employeeId);
            }
          }
          if (!rawTenantShift) {
            await params.persistActiveShift(hydratedShift);
          }
        } else {
          if (rawTenantShift) {
            await AsyncStorage.removeItem(tenantShiftKey);
          }
          if (active) {
            params.setActiveShift(null);
          }
        }
      } catch {
        await AsyncStorage.removeItem(ACTIVE_SHIFT_STORAGE_KEY);
        await AsyncStorage.removeItem(tenantShiftKey);
        if (active) {
          params.setActiveShift(null);
        }
      }
    };

    void loadActiveShift();

    return () => {
      active = false;
    };
  }, [
    params.persistActiveShift,
    params.tenant,
    params.setActiveShift,
    params.setEmployeeName,
    params.setTipsReminderEmployeeId,
  ]);

  useEffect(() => {
    if (!params.activeShift) {
      return;
    }
    const currentName = params.employeeName.trim().toLowerCase();
    const shiftName = params.activeShift.employeeName.trim().toLowerCase();
    if (!currentName || currentName !== shiftName) {
      params.setEmployeeName(params.activeShift.employeeName);
    }
  }, [params.activeShift, params.employeeName, params.setEmployeeName]);

  useEffect(() => {
    if (!params.activeShift) {
      params.setPunchType("IN");
    }
  }, [params.activeShift, params.setPunchType]);
};
