import { useAdminCompanyOrderState } from "./admin-app-state-company-orders";
import { useAdminCoreState } from "./admin-app-state-core";
import { useAdminLiquorState } from "./admin-app-state-liquor";
import { useAdminManagementState } from "./admin-app-state-management";
import { useAdminReportCaptureState } from "./admin-app-state-reports";

export function useAdminAppState() {
  const core = useAdminCoreState();
  const management = useAdminManagementState();
  const companyOrders = useAdminCompanyOrderState();
  const liquor = useAdminLiquorState();
  const reports = useAdminReportCaptureState();

  return {
    ...core,
    ...management,
    ...companyOrders,
    ...liquor,
    ...reports,
  };
}
