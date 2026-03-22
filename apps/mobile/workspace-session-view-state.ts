import { useMemo } from "react";
import { getTipSubmissionKey } from "./app-helpers";
import type {
  ActiveShift,
  Employee,
  TenantContext,
  TenantOffice,
} from "./types";

export const useWorkspaceSessionViewState = (params: {
  employees: Employee[];
  directoryEmployees: Employee[];
  selectedOfficeId: string | null;
  employeeName: string;
  tenant: TenantContext | null;
  activeShift: ActiveShift | null;
  tenantCompanyOrdersEnabled: boolean;
  tenantOffices: TenantOffice[];
  tenantLiquorInventoryEnabled: boolean;
  tenantLiquorPremiumEnabled: boolean;
  pendingTipWorkDate: string | null;
  serverTipsRequired: boolean;
  punchType: "IN" | "OUT" | "BREAK" | "LUNCH";
  tipsSubmittedByDay: Record<string, boolean>;
  tipsReminderEmployeeId: string | null;
}) => {
  const officeScopedDirectoryEmployees = useMemo(() => {
    if (!params.selectedOfficeId) {
      return params.directoryEmployees;
    }
    const scoped = params.directoryEmployees.filter((employee) => {
      if (typeof employee.officeId === "string") {
        return employee.officeId === params.selectedOfficeId;
      }
      return true;
    });
    return scoped.length > 0 ? scoped : params.directoryEmployees;
  }, [params.directoryEmployees, params.selectedOfficeId]);

  const rosterEmployees = useMemo(
    () =>
      params.employees.length > 0
        ? params.employees
        : officeScopedDirectoryEmployees,
    [officeScopedDirectoryEmployees, params.employees],
  );

  const activeEmployees = useMemo(
    () => rosterEmployees.filter((emp) => emp.active),
    [rosterEmployees],
  );

  const matchedEmployee = useMemo(() => {
    const normalized = params.employeeName.trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    const exact = activeEmployees.find(
      (emp) => emp.name.toLowerCase() === normalized,
    );
    if (exact) {
      return exact;
    }
    const partialMatches = activeEmployees.filter((emp) =>
      emp.name.toLowerCase().includes(normalized),
    );
    if (partialMatches.length === 1) {
      return partialMatches[0];
    }
    return null;
  }, [activeEmployees, params.employeeName]);

  const sessionEmployee = useMemo(() => {
    const activeShift = params.activeShift;
    if (!params.tenant || !activeShift) {
      return null;
    }
    if (activeShift.tenantAuthOrgId !== params.tenant.authOrgId) {
      return null;
    }
    const current = rosterEmployees.find(
      (emp) => emp.id === activeShift.employeeId,
    );
    if (current) {
      return current;
    }
    return {
      id: activeShift.employeeId,
      name: activeShift.employeeName,
      active: true,
      isManager: Boolean(activeShift.isManager),
      isServer: activeShift.isServer,
      isKitchenManager: Boolean(activeShift.isKitchenManager),
    } as Employee;
  }, [params.activeShift, params.tenant, rosterEmployees]);

  const selectedEmployee = sessionEmployee ?? matchedEmployee;

  const companyOrdersActor = useMemo(() => {
    if (!sessionEmployee) {
      return null;
    }
    return sessionEmployee.isKitchenManager || sessionEmployee.isManager
      ? sessionEmployee
      : null;
  }, [sessionEmployee]);

  const hasCompanyOrdersAccess = Boolean(
    params.tenantCompanyOrdersEnabled && params.activeShift && companyOrdersActor,
  );

  const liquorManagerActor = useMemo(() => {
    if (!sessionEmployee?.isManager) {
      return null;
    }
    return sessionEmployee;
  }, [sessionEmployee]);

  const pendingTipDate = params.pendingTipWorkDate;
  const requiresTipsForOut = Boolean(
    selectedEmployee?.isServer || params.serverTipsRequired,
  );
  const hasSubmittedTips =
    selectedEmployee !== null &&
    Boolean(
      params.tipsSubmittedByDay[getTipSubmissionKey(selectedEmployee.id)],
    );
  const showTipInputs =
    (params.punchType === "OUT" && requiresTipsForOut && !hasSubmittedTips) ||
    Boolean(selectedEmployee?.isServer && pendingTipDate);
  const showTipReminderTag =
    selectedEmployee?.isServer &&
    ((!hasSubmittedTips &&
      (params.tipsReminderEmployeeId === selectedEmployee.id ||
        params.serverTipsRequired)) ||
      Boolean(pendingTipDate));
  const needsManualPinForSession =
    Boolean(sessionEmployee) && !params.activeShift?.pin;

  const selectedOffice = useMemo(
    () =>
      params.tenantOffices.find((office) => office.id === params.selectedOfficeId) ??
      null,
    [params.selectedOfficeId, params.tenantOffices],
  );

  const companyOrderHeaders = useMemo<Record<string, string> | undefined>(() => {
    if (!companyOrdersActor) {
      return undefined;
    }
    return {
      "x-dev-user-id": `employee:${companyOrdersActor.id}`,
      "x-dev-name": companyOrdersActor.name,
      "x-dev-email": `${companyOrdersActor.id}@clockin.local`,
    };
  }, [companyOrdersActor]);

  const liquorHeaders = useMemo<Record<string, string> | undefined>(() => {
    if (!liquorManagerActor) {
      return undefined;
    }
    return {
      "x-dev-user-id": `employee:${liquorManagerActor.id}`,
      "x-dev-name": liquorManagerActor.name,
      "x-dev-email": `${liquorManagerActor.id}@clockin.local`,
    };
  }, [liquorManagerActor]);

  const requiresLocationSelection = params.tenantOffices.length > 1;
  const canUseClockScreen =
    !requiresLocationSelection || Boolean(params.selectedOfficeId);
  const hasLiquorAccess = Boolean(
    params.tenantLiquorInventoryEnabled &&
      canUseClockScreen &&
      params.activeShift &&
      liquorManagerActor,
  );
  const hasLiquorPremiumAccess = Boolean(
    hasLiquorAccess && params.tenantLiquorPremiumEnabled,
  );
  const hasTeamDashboardAccess = Boolean(companyOrdersActor);

  return {
    sessionEmployee,
    selectedEmployee,
    companyOrdersActor,
    hasCompanyOrdersAccess,
    liquorManagerActor,
    pendingTipDate,
    requiresTipsForOut,
    hasSubmittedTips,
    showTipInputs,
    showTipReminderTag,
    needsManualPinForSession,
    selectedOffice,
    companyOrderHeaders,
    liquorHeaders,
    requiresLocationSelection,
    canUseClockScreen,
    hasLiquorAccess,
    hasLiquorPremiumAccess,
    hasTeamDashboardAccess,
  };
};
