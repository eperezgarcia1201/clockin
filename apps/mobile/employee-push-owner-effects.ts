import { useEffect } from "react";
import { loadEmployeePushOwnerId } from "./employee-push-owner-runtime";

export const useEmployeePushOwnerEffects = (params: {
  tenantAuthOrgId: string | null;
  setEmployeePushOwnerId: (employeeId: string | null) => void;
}) => {
  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      if (!params.tenantAuthOrgId) {
        if (active) {
          params.setEmployeePushOwnerId(null);
        }
        return;
      }
      try {
        const employeeId = await loadEmployeePushOwnerId(params.tenantAuthOrgId);
        if (active) {
          params.setEmployeePushOwnerId(employeeId);
        }
      } catch {
        if (active) {
          params.setEmployeePushOwnerId(null);
        }
      }
    };

    void hydrate();

    return () => {
      active = false;
    };
  }, [params.tenantAuthOrgId, params.setEmployeePushOwnerId]);
};
