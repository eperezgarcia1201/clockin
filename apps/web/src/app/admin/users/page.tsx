"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type EmployeeRow = {
  id: string;
  name: string;
  active: boolean;
  email?: string;
  officeId?: string | null;
  groupId?: string | null;
  isManager?: boolean;
  managerPermissions?: string[];
  isAdmin?: boolean;
  isTimeAdmin?: boolean;
  isReports?: boolean;
  isServer?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  hoursRecordCount?: number;
  tipRecordCount?: number;
  scheduleRecordCount?: number;
  notificationRecordCount?: number;
};

type Office = { id: string; name: string };
type Group = { id: string; name: string };
type ViewMode = "active" | "deleted";
type PendingAction =
  | { kind: "toggle"; employee: EmployeeRow }
  | { kind: "soft-delete"; employee: EmployeeRow; step: "warning" | "confirm" }
  | { kind: "restore"; employee: EmployeeRow }
  | {
      kind: "permanent-delete";
      employee: EmployeeRow;
      step: "warning" | "confirm";
    }
  | null;

export default function UsersSummary() {
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [officeMap, setOfficeMap] = useState<Record<string, string>>({});
  const [groupMap, setGroupMap] = useState<Record<string, string>>({});
  const [showAdminsOnly, setShowAdminsOnly] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [status, setStatus] = useState<string | null>(null);
  const [disablingEmployeeId, setDisablingEmployeeId] = useState<string | null>(
    null,
  );
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(
    null,
  );
  const [restoringEmployeeId, setRestoringEmployeeId] = useState<string | null>(
    null,
  );
  const [purgingEmployeeId, setPurgingEmployeeId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const loadEmployees = useCallback(async (mode: ViewMode) => {
    try {
      const response = await fetch(
        mode === "deleted" ? "/api/employees?scope=deleted" : "/api/employees",
        { cache: "no-store" },
      );
      if (!response.ok) {
        setEmployees([]);
        return;
      }
      const data = (await response.json()) as { employees: EmployeeRow[] };
      const rows = data.employees || [];
      setEmployees(
        mode === "deleted"
          ? rows.filter((employee) => Boolean(employee.deletedAt))
          : rows,
      );
    } catch {
      setEmployees([]);
    }
  }, []);

  useEffect(() => {
    void loadEmployees(viewMode);
  }, [loadEmployees, viewMode]);

  useEffect(() => {
    const loadLookups = async () => {
      const [officesRes, groupsRes] = await Promise.all([
        fetch("/api/offices"),
        fetch("/api/groups"),
      ]);
      if (officesRes.ok) {
        const data = (await officesRes.json()) as { offices: Office[] };
        const map: Record<string, string> = {};
        data.offices?.forEach((office) => {
          map[office.id] = office.name;
        });
        setOfficeMap(map);
      }
      if (groupsRes.ok) {
        const data = (await groupsRes.json()) as { groups: Group[] };
        const map: Record<string, string> = {};
        data.groups?.forEach((group) => {
          map[group.id] = group.name;
        });
        setGroupMap(map);
      }
    };

    loadLookups();
  }, []);

  useEffect(() => {
    const role = searchParams.get("role") || "";
    setRoleFilter(role);
    setShowAdminsOnly(role === "admin");
  }, [searchParams]);

  const filteredEmployees = useMemo(() => {
    if (viewMode === "deleted") {
      return employees;
    }
    if (roleFilter === "admin") {
      return employees.filter((employee) => employee.isAdmin);
    }
    if (roleFilter === "time") {
      return employees.filter((employee) => employee.isTimeAdmin);
    }
    if (roleFilter === "reports") {
      return employees.filter((employee) => employee.isReports);
    }
    return showAdminsOnly
      ? employees.filter((employee) => employee.isAdmin)
      : employees;
  }, [employees, roleFilter, showAdminsOnly, viewMode]);

  const deletedEmployees = useMemo(
    () => employees.filter((employee) => Boolean(employee.deletedAt)),
    [employees],
  );

  const handleToggleDisabled = async (employee: EmployeeRow) => {
    setStatus(null);
    setDisablingEmployeeId(employee.id);
    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled: employee.active }),
      });

      if (response.ok) {
        setEmployees((prev) =>
          prev.map((item) =>
            item.id === employee.id
              ? { ...item, active: !employee.active }
              : item,
          ),
        );
        setStatus(employee.active ? "User disabled." : "User enabled.");
      } else {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        setStatus(data.error || data.message || "Unable to update user status.");
      }
    } catch {
      setStatus("Unable to update user status.");
    } finally {
      setDisablingEmployeeId(null);
    }
  };

  const handleDelete = async (employee: EmployeeRow) => {
    setStatus(null);
    setDeletingEmployeeId(employee.id);
    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setEmployees((prev) => prev.filter((item) => item.id !== employee.id));
        setStatus(
          'User moved to "Deleted Users". Records are preserved and can be restored anytime.',
        );
      } else {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        setStatus(data.error || data.message || "Unable to archive user.");
      }
    } catch {
      setStatus("Unable to archive user.");
    } finally {
      setDeletingEmployeeId(null);
    }
  };

  const handleRestore = async (employee: EmployeeRow) => {
    setStatus(null);
    setRestoringEmployeeId(employee.id);
    try {
      const response = await fetch(`/api/employees/${employee.id}/restore`, {
        method: "PATCH",
      });
      if (response.ok) {
        setEmployees((prev) => prev.filter((item) => item.id !== employee.id));
        setStatus("User restored to active users.");
      } else {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        setStatus(data.error || data.message || "Unable to restore user.");
      }
    } catch {
      setStatus("Unable to restore user.");
    } finally {
      setRestoringEmployeeId(null);
    }
  };

  const handlePermanentDelete = async (employee: EmployeeRow) => {
    setStatus(null);
    setPurgingEmployeeId(employee.id);
    try {
      const response = await fetch(`/api/employees/${employee.id}/permanent`, {
        method: "DELETE",
      });
      if (response.ok) {
        setEmployees((prev) => prev.filter((item) => item.id !== employee.id));
        setStatus("User deleted permanently.");
      } else {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        setStatus(
          data.error || data.message || "Unable to delete user permanently.",
        );
      }
    } catch {
      setStatus("Unable to delete user permanently.");
    } finally {
      setPurgingEmployeeId(null);
    }
  };

  const onConfirmPendingAction = async () => {
    if (!pendingAction) return;

    if (pendingAction.kind === "toggle") {
      await handleToggleDisabled(pendingAction.employee);
      setPendingAction(null);
      return;
    }

    if (pendingAction.kind === "soft-delete") {
      if (pendingAction.step === "warning") {
        setPendingAction({ ...pendingAction, step: "confirm" });
        return;
      }
      await handleDelete(pendingAction.employee);
      setPendingAction(null);
      return;
    }

    if (pendingAction.kind === "restore") {
      await handleRestore(pendingAction.employee);
      setPendingAction(null);
      return;
    }

    if (pendingAction.step === "warning") {
      setPendingAction({ ...pendingAction, step: "confirm" });
      return;
    }
    await handlePermanentDelete(pendingAction.employee);
    setPendingAction(null);
  };

  const pendingActionBusy = pendingAction
    ? pendingAction.kind === "toggle"
      ? disablingEmployeeId === pendingAction.employee.id
      : pendingAction.kind === "soft-delete"
        ? deletingEmployeeId === pendingAction.employee.id
        : pendingAction.kind === "restore"
          ? restoringEmployeeId === pendingAction.employee.id
          : purgingEmployeeId === pendingAction.employee.id
    : false;

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>User Summary</h1>
        {viewMode === "active" && (
          <div className="admin-actions">
            <a className="btn btn-primary" href="/admin/users/new">
              Create New User
            </a>
          </div>
        )}
      </div>

      <div className="admin-card">
        {status && <div className="alert alert-info">{status}</div>}
        <div className="d-flex align-items-center justify-content-between gap-3 mb-3 flex-wrap">
          <div className="btn-group" role="group" aria-label="User scope tabs">
            <button
              type="button"
              className={`btn btn-sm ${
                viewMode === "active" ? "btn-primary" : "btn-outline-primary"
              }`}
              onClick={() => {
                setViewMode("active");
                setPendingAction(null);
              }}
            >
              Active Users
            </button>
            <button
              type="button"
              className={`btn btn-sm ${
                viewMode === "deleted" ? "btn-danger" : "btn-outline-danger"
              }`}
              onClick={() => {
                setViewMode("deleted");
                setPendingAction(null);
              }}
            >
              Deleted Users
            </button>
          </div>

          {viewMode === "active" && (
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <input
                id="adminsOnly"
                type="checkbox"
                checked={showAdminsOnly}
                onChange={(event) => setShowAdminsOnly(event.target.checked)}
              />
              <label htmlFor="adminsOnly">Show admins only</label>
              {roleFilter && (
                <a
                  className="btn btn-sm btn-outline-secondary"
                  href="/admin/users"
                >
                  Clear role filter
                </a>
              )}
            </div>
          )}
        </div>

        {viewMode === "deleted" && (
          <div className="alert alert-warning">
            Deleted users are archived here. Their records remain in the
            database until you use "Delete Forever".
          </div>
        )}

        <div className="table-responsive">
          {viewMode === "active" ? (
            <table className="table table-striped align-middle mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Location</th>
                  <th>Group</th>
                  <th>Manager</th>
                  <th>Hours Records</th>
                  <th>Disabled</th>
                  <th>Sys Admin</th>
                  <th>Time Admin</th>
                  <th>Reports</th>
                  <th>Server</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee, index) => (
                  <tr key={employee.id}>
                    <td>{index + 1}</td>
                    <td>{employee.name}</td>
                    <td>{employee.email || "—"}</td>
                    <td>
                      {employee.officeId
                        ? officeMap[employee.officeId] || "—"
                        : "—"}
                    </td>
                    <td>
                      {employee.groupId
                        ? groupMap[employee.groupId] || "—"
                        : "—"}
                    </td>
                    <td>{employee.isManager ? "Yes" : ""}</td>
                    <td>{employee.hoursRecordCount ?? 0}</td>
                    <td>{employee.active ? "" : "Yes"}</td>
                    <td>{employee.isAdmin ? "Yes" : ""}</td>
                    <td>{employee.isTimeAdmin ? "Yes" : ""}</td>
                    <td>{employee.isReports ? "Yes" : ""}</td>
                    <td>{employee.isServer ? "Yes" : ""}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <a
                          className="btn btn-sm btn-outline-primary"
                          href={`/admin/users/${employee.id}`}
                        >
                          Edit
                        </a>
                        <a
                          className="btn btn-sm btn-outline-secondary"
                          href={`/admin/time?${new URLSearchParams({
                            employeeId: employee.id,
                            returnTo: "/admin/users",
                          }).toString()}`}
                        >
                          Edit Times
                        </a>
                        <button
                          className="btn btn-sm btn-outline-warning"
                          disabled={
                            deletingEmployeeId === employee.id ||
                            disablingEmployeeId === employee.id
                          }
                          onClick={() =>
                            setPendingAction({ kind: "toggle", employee })
                          }
                        >
                          {disablingEmployeeId === employee.id
                            ? "Saving..."
                            : employee.active
                              ? "Disable"
                              : "Enable"}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          disabled={
                            deletingEmployeeId === employee.id ||
                            disablingEmployeeId === employee.id
                          }
                          onClick={() =>
                            setPendingAction({
                              kind: "soft-delete",
                              employee,
                              step: "warning",
                            })
                          }
                        >
                          {deletingEmployeeId === employee.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={12} className="text-center text-muted py-4">
                      No active users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="table table-striped align-middle mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Hours Records</th>
                  <th>Deleted At</th>
                  <th>Deleted By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deletedEmployees.map((employee, index) => (
                  <tr key={employee.id}>
                    <td>{index + 1}</td>
                    <td>{employee.name}</td>
                    <td>{employee.email || "—"}</td>
                    <td>{employee.hoursRecordCount ?? 0}</td>
                    <td>
                      {employee.deletedAt
                        ? new Date(employee.deletedAt).toLocaleString()
                        : "—"}
                    </td>
                    <td>{employee.deletedBy || "—"}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success"
                          disabled={
                            restoringEmployeeId === employee.id ||
                            purgingEmployeeId === employee.id
                          }
                          onClick={() =>
                            setPendingAction({ kind: "restore", employee })
                          }
                        >
                          {restoringEmployeeId === employee.id
                            ? "Restoring..."
                            : "Restore"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          disabled={
                            restoringEmployeeId === employee.id ||
                            purgingEmployeeId === employee.id
                          }
                          onClick={() =>
                            setPendingAction({
                              kind: "permanent-delete",
                              employee,
                              step: "warning",
                            })
                          }
                        >
                          {purgingEmployeeId === employee.id
                            ? "Deleting..."
                            : "Delete Forever"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {deletedEmployees.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">
                      No deleted users.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {pendingAction && (
        <div
          className="embedded-confirm-backdrop"
          onClick={() => {
            if (!pendingActionBusy) {
              setPendingAction(null);
            }
          }}
        >
          <div
            className="embedded-confirm-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="embedded-confirm-title">
              {pendingAction.kind === "toggle"
                ? pendingAction.employee.active
                  ? "Disable User"
                  : "Enable User"
                : pendingAction.kind === "soft-delete"
                  ? pendingAction.step === "warning"
                    ? "Archive User"
                    : "Final Confirmation"
                  : pendingAction.kind === "restore"
                    ? "Restore User"
                    : pendingAction.step === "warning"
                      ? "Delete Forever"
                      : "Final Permanent Delete"}
            </h2>
            <p className="embedded-confirm-message">
              {pendingAction.kind === "toggle"
                ? pendingAction.employee.active
                  ? `Disable user "${pendingAction.employee.name}"? They will not be active in the system.`
                  : `Enable user "${pendingAction.employee.name}" again?`
                : pendingAction.kind === "soft-delete"
                  ? pendingAction.step === "warning"
                    ? `You are deleting "${pendingAction.employee.name}". This account has ${pendingAction.employee.hoursRecordCount || 0} time records in this database. Labor law requires keeping employee records for 5 years.`
                    : `Proceed and move "${pendingAction.employee.name}" to Deleted Users? The records will be kept and recoverable.`
                  : pendingAction.kind === "restore"
                    ? `Restore "${pendingAction.employee.name}" to active users now?`
                    : pendingAction.step === "warning"
                      ? `You are about to permanently delete "${pendingAction.employee.name}" from Deleted Users. This removes all associated records forever.`
                      : `Final check: permanently delete "${pendingAction.employee.name}" forever? This cannot be undone.`}
            </p>
            {pendingAction.kind === "soft-delete" &&
              pendingAction.step === "warning" && (
                <p className="embedded-confirm-message text-danger mb-0">
                  Continue only if you intentionally want this user moved to
                  Deleted Users. You can restore later.
                </p>
              )}
            <div className="embedded-confirm-actions">
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={pendingActionBusy}
                onClick={() => setPendingAction(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn ${
                  pendingAction.kind === "toggle"
                    ? "btn-warning"
                    : pendingAction.kind === "restore"
                      ? "btn-success"
                      : pendingAction.kind === "soft-delete"
                        ? pendingAction.step === "warning"
                          ? "btn-warning"
                          : "btn-danger"
                        : pendingAction.step === "warning"
                          ? "btn-warning"
                          : "btn-danger"
                }`}
                disabled={pendingActionBusy}
                onClick={() => void onConfirmPendingAction()}
              >
                {pendingActionBusy
                  ? "Processing..."
                  : pendingAction.kind === "soft-delete"
                    ? pendingAction.step === "warning"
                      ? "Continue"
                      : "Yes, Move To Deleted"
                    : pendingAction.kind === "permanent-delete"
                      ? pendingAction.step === "warning"
                        ? "Continue"
                        : "Delete Forever"
                      : pendingAction.kind === "restore"
                        ? "Restore User"
                        : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
