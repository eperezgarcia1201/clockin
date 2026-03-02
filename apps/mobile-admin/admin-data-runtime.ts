import {
  normalizeNotifications,
  reconcileEmployeeLoadState,
  resolveActiveLocationAfterOfficesLoad,
} from "./admin-loader-helpers";
import type {
  Employee,
  Group,
  NotificationRow,
  Office,
  Summary,
} from "./types";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export const normalizeSummary = (
  payload: Partial<Summary> | null | undefined,
): Summary => ({
  total: typeof payload?.total === "number" ? payload.total : 0,
  admins: typeof payload?.admins === "number" ? payload.admins : 0,
  timeAdmins:
    typeof payload?.timeAdmins === "number" ? payload.timeAdmins : 0,
  reports: typeof payload?.reports === "number" ? payload.reports : 0,
});

export const loadSummaryData = async (params: {
  fetchJson: FetchJson;
}): Promise<
  | { ok: true; summary: Summary }
  | { ok: false; error: string }
> => {
  try {
    const data = (await params.fetchJson("/employees/summary")) as Partial<Summary>;
    return { ok: true, summary: normalizeSummary(data) };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unable to load summary data.",
    };
  }
};

export const loadEmployeesData = async (params: {
  fetchJson: FetchJson;
  appendOfficeScope: (path: string) => string;
  scheduleEmployeeId: string;
  reportEmployeeId: string;
  editingUserId: string | null;
}): Promise<
  | {
      ok: true;
      employees: Employee[];
      reconciliation: ReturnType<typeof reconcileEmployeeLoadState>;
    }
  | {
      ok: false;
      error: string;
    }
> => {
  try {
    const data = (await params.fetchJson(
      params.appendOfficeScope("/employees"),
    )) as {
      employees: Employee[];
    };
    const employees = data.employees || [];
    return {
      ok: true,
      employees,
      reconciliation: reconcileEmployeeLoadState({
        employees,
        scheduleEmployeeId: params.scheduleEmployeeId,
        reportEmployeeId: params.reportEmployeeId,
        editingUserId: params.editingUserId,
      }),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to load users.",
    };
  }
};

export const loadOfficesData = async (params: {
  fetchJson: FetchJson;
  canManageMultiLocation: boolean;
  activeLocationId: string;
}): Promise<
  | {
      ok: true;
      offices: Office[];
      nextActiveLocationId: string | null;
    }
  | { ok: false }
> => {
  try {
    const data = (await params.fetchJson("/offices")) as { offices: Office[] };
    const offices = data.offices || [];
    return {
      ok: true,
      offices,
      nextActiveLocationId: resolveActiveLocationAfterOfficesLoad({
        offices,
        canManageMultiLocation: params.canManageMultiLocation,
        activeLocationId: params.activeLocationId,
      }),
    };
  } catch {
    return { ok: false };
  }
};

export const loadGroupsData = async (params: {
  fetchJson: FetchJson;
  appendOfficeScope: (path: string) => string;
}): Promise<{ ok: true; groups: Group[] } | { ok: false }> => {
  try {
    const data = (await params.fetchJson(params.appendOfficeScope("/groups"))) as {
      groups: Group[];
    };
    return { ok: true, groups: data.groups || [] };
  } catch {
    return { ok: false };
  }
};

export const loadNotificationsData = async (params: {
  fetchJson: FetchJson;
}): Promise<
  | { ok: true; notifications: NotificationRow[] }
  | { ok: false; error: string }
> => {
  try {
    const data = (await params.fetchJson("/notifications?limit=50")) as {
      notifications: NotificationRow[];
    };
    return {
      ok: true,
      notifications: normalizeNotifications(data),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to load alerts.",
    };
  }
};
