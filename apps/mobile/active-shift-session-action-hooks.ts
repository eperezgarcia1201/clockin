import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, type Dispatch, type SetStateAction } from "react";
import { ACTIVE_SHIFT_STORAGE_KEY } from "./app-config";
import type { ActiveShift } from "./types";

export const useActiveShiftSessionActions = (params: {
  tenantAuthOrgId: string | null;
  setTipsReminderEmployeeId: Dispatch<SetStateAction<string | null>>;
  setTipsStatus: Dispatch<SetStateAction<string | null>>;
  setServerTipsRequired: Dispatch<SetStateAction<boolean>>;
  setActiveShift: Dispatch<SetStateAction<ActiveShift | null>>;
  setTipsAlert: Dispatch<SetStateAction<boolean>>;
  setPunchType: Dispatch<SetStateAction<"IN" | "OUT" | "BREAK" | "LUNCH">>;
  setPin: Dispatch<SetStateAction<string>>;
  setEmployeeName: Dispatch<SetStateAction<string>>;
}) => {
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
      params.setTipsReminderEmployeeId(null);
      params.setTipsStatus(null);
      params.setServerTipsRequired(false);
      params.setActiveShift(null);
      const keys = [ACTIVE_SHIFT_STORAGE_KEY];
      if (params.tenantAuthOrgId) {
        keys.push(`${ACTIVE_SHIFT_STORAGE_KEY}.${params.tenantAuthOrgId}`);
      }
      void AsyncStorage.multiRemove(Array.from(new Set(keys)));
      params.setTipsAlert(false);
      params.setPunchType("IN");
      params.setPin("");
      if (clearName) {
        params.setEmployeeName("");
      }
    },
    [
      params.tenantAuthOrgId,
      params.setActiveShift,
      params.setEmployeeName,
      params.setPin,
      params.setPunchType,
      params.setServerTipsRequired,
      params.setTipsAlert,
      params.setTipsReminderEmployeeId,
      params.setTipsStatus,
    ],
  );

  return {
    persistActiveShift,
    clearActiveShiftSession,
  };
};
