import { useMemo } from "react";
import { buildLiquorSheetRows } from "./liquor-control-view-helpers";
import {
  buildEmployeePunchStatusMap,
  deriveManagerPunchAction,
  selectManagerProfile,
  selectManagerPunchRow,
} from "./manager-session-helpers";
import type {
  AccessPermissions,
  Employee,
  LiquorCatalogItem,
  LiquorCountRow,
  Office,
} from "./types";

type PunchStatusRow = {
  id: string;
  name: string;
  status: string;
};

export const useAdminShellDerivedState = (params: {
  permissions: AccessPermissions;
  multiLocationEnabled: boolean;
  activeLocationId: string;
  offices: Office[];
  sessionManagerEmployeeId: string | null;
  sessionManagerOfficeId: string | null;
  employees: Employee[];
  activeNow: PunchStatusRow[];
  recentPunchRows: PunchStatusRow[];
  liquorInventoryEnabled: boolean;
  liquorPremiumEnabled: boolean;
  liquorCatalog: LiquorCatalogItem[];
  liquorCounts: LiquorCountRow[];
}) => {
  const managerScopedLocationId = params.sessionManagerOfficeId?.trim() || "";
  const canManageMultiLocation =
    !managerScopedLocationId &&
    params.multiLocationEnabled &&
    params.permissions.manageMultiLocation;
  const scopedLocationId =
    managerScopedLocationId ||
    (canManageMultiLocation ? params.activeLocationId.trim() : "");
  const defaultOfficeId = useMemo(
    () => params.offices[0]?.id?.trim() || "",
    [params.offices],
  );
  const companyOrdersOfficeId = useMemo(() => {
    if (scopedLocationId) {
      return scopedLocationId;
    }
    if (!canManageMultiLocation) {
      return defaultOfficeId;
    }
    return "";
  }, [canManageMultiLocation, defaultOfficeId, scopedLocationId]);
  const hasLiquorManagerAccess = Boolean(
    params.sessionManagerEmployeeId &&
      params.permissions.reports &&
      params.liquorInventoryEnabled,
  );
  const hasLiquorPremiumAccess =
    hasLiquorManagerAccess && params.liquorPremiumEnabled;
  const liquorSheetRows = useMemo(
    () => buildLiquorSheetRows(params.liquorCatalog, params.liquorCounts),
    [params.liquorCatalog, params.liquorCounts],
  );
  const employeePunchStatus = useMemo(
    () => buildEmployeePunchStatusMap(params.activeNow),
    [params.activeNow],
  );
  const managerProfile = useMemo(
    () =>
      selectManagerProfile(params.employees, params.sessionManagerEmployeeId),
    [params.employees, params.sessionManagerEmployeeId],
  );
  const managerPunchRow = useMemo(
    () =>
      selectManagerPunchRow(
        params.recentPunchRows,
        params.sessionManagerEmployeeId,
      ),
    [params.recentPunchRows, params.sessionManagerEmployeeId],
  );
  const managerCurrentPunchStatus = managerPunchRow?.status || "OUT";
  const {
    managerCanClockOut,
    managerNextPunchType,
    managerActionLabel,
  } = useMemo(
    () => deriveManagerPunchAction(managerCurrentPunchStatus),
    [managerCurrentPunchStatus],
  );

  return {
    canManageMultiLocation,
    scopedLocationId,
    companyOrdersOfficeId,
    hasLiquorManagerAccess,
    hasLiquorPremiumAccess,
    liquorSheetRows,
    employeePunchStatus,
    managerProfile,
    managerCurrentPunchStatus,
    managerCanClockOut,
    managerNextPunchType,
    managerActionLabel,
  };
};
