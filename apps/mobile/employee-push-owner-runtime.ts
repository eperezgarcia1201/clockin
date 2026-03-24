import AsyncStorage from "@react-native-async-storage/async-storage";
import { EMPLOYEE_PUSH_OWNER_PREFIX } from "./app-config";

export const getEmployeePushOwnerStorageKey = (tenantAuthOrgId: string) =>
  `${EMPLOYEE_PUSH_OWNER_PREFIX}.${tenantAuthOrgId}`;

export const loadEmployeePushOwnerId = async (tenantAuthOrgId: string) => {
  const raw = await AsyncStorage.getItem(
    getEmployeePushOwnerStorageKey(tenantAuthOrgId),
  );
  const employeeId = raw?.trim() || "";
  return employeeId || null;
};

export const saveEmployeePushOwnerId = async (
  tenantAuthOrgId: string,
  employeeId: string,
) => {
  const normalizedEmployeeId = employeeId.trim();
  if (!tenantAuthOrgId.trim() || !normalizedEmployeeId) {
    return;
  }
  await AsyncStorage.setItem(
    getEmployeePushOwnerStorageKey(tenantAuthOrgId),
    normalizedEmployeeId,
  );
};
