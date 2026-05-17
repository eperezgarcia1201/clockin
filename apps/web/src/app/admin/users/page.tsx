"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useUiLanguage } from "../../../lib/ui-language";
import { listGroups, type Group } from "../../../lib/api/groups";
import { listOffices, type Office } from "../../../lib/api/offices";
import {
  archiveEmployee,
  deleteEmployeePermanent,
  listEmployees as listEmployeesApi,
  restoreEmployee,
  type EmployeeRow,
  updateEmployee,
} from "../../../lib/api/users-admin";
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
  const lang = useUiLanguage();
  const tr = (en: string, es: string) => (lang === "es" ? es : en);
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
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
  const [purgingEmployeeId, setPurgingEmployeeId] = useState<string | null>(
    null,
  );
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [transferEmployee, setTransferEmployee] = useState<EmployeeRow | null>(
    null,
  );
  const [transferOfficeId, setTransferOfficeId] = useState("");
  const [transferGroupId, setTransferGroupId] = useState("");
  const [transferringEmployeeId, setTransferringEmployeeId] = useState<
    string | null
  >(null);

  const loadEmployees = useCallback(async (mode: ViewMode) => {
    try {
      const rows = await listEmployeesApi(
        mode === "deleted" ? { scope: "deleted" } : undefined,
      );
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
      const officesTask = listOffices()
        .then((offices) => {
          const map: Record<string, string> = {};
          offices.forEach((office) => {
            map[office.id] = office.name;
          });
          setOffices(offices);
          setOfficeMap(map);
        })
        .catch(() => {
          // Keep current behavior: silently ignore failed loads.
        });

      const groupsTask = listGroups()
        .then((groups) => {
          const map: Record<string, string> = {};
          groups.forEach((group) => {
            map[group.id] = group.name;
          });
          setGroups(groups);
          setGroupMap(map);
        })
        .catch(() => {
          // Keep current behavior: silently ignore failed loads.
        });

      await Promise.all([officesTask, groupsTask]);
    };

    void loadLookups();
  }, []);

  const fallbackStatus = (en: string, es: string) => tr(en, es);

  const statusFromError = (
    error: unknown,
    fallbackEn: string,
    fallbackEs: string,
  ) =>
    (error instanceof Error && error.message) ||
    fallbackStatus(fallbackEn, fallbackEs);

  const handleToggleDisabled = async (employee: EmployeeRow) => {
    setStatus(null);
    setDisablingEmployeeId(employee.id);
    try {
      await updateEmployee(employee.id, { disabled: employee.active });
      setEmployees((prev) =>
        prev.map((item) =>
          item.id === employee.id
            ? { ...item, active: !employee.active }
            : item,
        ),
      );
      setStatus(
        employee.active
          ? tr("User disabled.", "Usuario deshabilitado.")
          : tr("User enabled.", "Usuario habilitado."),
      );
    } catch (error) {
      setStatus(
        statusFromError(
          error,
          "Unable to update user status.",
          "No se pudo actualizar el estado del usuario.",
        ),
      );
    } finally {
      setDisablingEmployeeId(null);
    }
  };

  const handleDelete = async (employee: EmployeeRow) => {
    setStatus(null);
    setDeletingEmployeeId(employee.id);
    try {
      await archiveEmployee(employee.id);
      setEmployees((prev) => prev.filter((item) => item.id !== employee.id));
      setStatus(
        tr(
          'User moved to "Deleted Users". Records are preserved and can be restored anytime.',
          'Usuario movido a "Usuarios Eliminados". Los registros se conservan y se pueden restaurar en cualquier momento.',
        ),
      );
    } catch (error) {
      setStatus(
        statusFromError(
          error,
          "Unable to archive user.",
          "No se pudo archivar el usuario.",
        ),
      );
    } finally {
      setDeletingEmployeeId(null);
    }
  };

  const handleRestore = async (employee: EmployeeRow) => {
    setStatus(null);
    setRestoringEmployeeId(employee.id);
    try {
      await restoreEmployee(employee.id);
      setEmployees((prev) => prev.filter((item) => item.id !== employee.id));
      setStatus(
        tr(
          "User restored to active users.",
          "Usuario restaurado a usuarios activos.",
        ),
      );
    } catch (error) {
      setStatus(
        statusFromError(
          error,
          "Unable to restore user.",
          "No se pudo restaurar el usuario.",
        ),
      );
    } finally {
      setRestoringEmployeeId(null);
    }
  };

  const handlePermanentDelete = async (employee: EmployeeRow) => {
    setStatus(null);
    setPurgingEmployeeId(employee.id);
    try {
      await deleteEmployeePermanent(employee.id);
      setEmployees((prev) => prev.filter((item) => item.id !== employee.id));
      setStatus(
        tr("User deleted permanently.", "Usuario eliminado permanentemente."),
      );
    } catch (error) {
      setStatus(
        statusFromError(
          error,
          "Unable to delete user permanently.",
          "No se pudo eliminar el usuario permanentemente.",
        ),
      );
    } finally {
      setPurgingEmployeeId(null);
    }
  };

  const openTransfer = (employee: EmployeeRow) => {
    setStatus(null);
    setTransferEmployee(employee);
    setTransferOfficeId(employee.officeId || "");
    setTransferGroupId(employee.groupId || "");
  };

  const transferGroupOptions = useMemo(
    () =>
      groups.filter(
        (group) => !group.officeId || group.officeId === transferOfficeId,
      ),
    [groups, transferOfficeId],
  );

  const handleTransferOfficeChange = (officeId: string) => {
    setTransferOfficeId(officeId);
    const selectedGroup = groups.find((group) => group.id === transferGroupId);
    if (
      selectedGroup?.officeId &&
      officeId &&
      selectedGroup.officeId !== officeId
    ) {
      setTransferGroupId("");
    }
  };

  const handleTransferUser = async () => {
    if (!transferEmployee || !transferOfficeId) {
      return;
    }
    setStatus(null);
    setTransferringEmployeeId(transferEmployee.id);
    try {
      await updateEmployee(transferEmployee.id, {
        officeId: transferOfficeId,
        groupId: transferGroupId || "",
      });
      setEmployees((prev) =>
        prev.map((employee) =>
          employee.id === transferEmployee.id
            ? {
                ...employee,
                officeId: transferOfficeId,
                groupId: transferGroupId || null,
              }
            : employee,
        ),
      );
      setStatus(
        tr(
          `${transferEmployee.name} was transferred to ${
            officeMap[transferOfficeId] || "the selected location"
          }. Their time records stayed attached to the user.`,
          `${transferEmployee.name} fue transferido a ${
            officeMap[transferOfficeId] || "la ubicacion seleccionada"
          }. Sus registros de tiempo siguen conectados al usuario.`,
        ),
      );
      setTransferEmployee(null);
    } catch (error) {
      setStatus(
        statusFromError(
          error,
          "Unable to transfer user.",
          "No se pudo transferir el usuario.",
        ),
      );
    } finally {
      setTransferringEmployeeId(null);
    }
  };

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
        <h1>{tr("User Summary", "Resumen de Usuarios")}</h1>
        {viewMode === "active" && (
          <div className="admin-actions">
            <Link className="btn btn-primary" href="/admin/users/new">
              {tr("Create New User", "Crear Nuevo Usuario")}
            </Link>
          </div>
        )}
      </div>

      <div className="admin-card">
        {status && <div className="alert alert-info">{status}</div>}
        <div className="d-flex align-items-center justify-content-between gap-3 mb-3 flex-wrap">
          <div
            className="btn-group"
            role="group"
            aria-label={tr(
              "User scope tabs",
              "Pestanas de alcance de usuarios",
            )}
          >
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
              {tr("Active Users", "Usuarios Activos")}
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
              {tr("Deleted Users", "Usuarios Eliminados")}
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
              <label htmlFor="adminsOnly">
                {tr("Show admins only", "Mostrar solo admins")}
              </label>
              {roleFilter && (
                <Link
                  className="btn btn-sm btn-outline-secondary"
                  href="/admin/users"
                >
                  {tr("Clear role filter", "Limpiar filtro de rol")}
                </Link>
              )}
            </div>
          )}
        </div>

        {viewMode === "deleted" && (
          <div className="alert alert-warning">
            {tr(
              'Deleted users are archived here. Their records remain in the database until you use "Delete Forever".',
              'Los usuarios eliminados se archivan aqui. Sus registros permanecen en la base de datos hasta que uses "Eliminar para siempre".',
            )}
          </div>
        )}

        <div className="table-responsive">
          {viewMode === "active" ? (
            <table className="table table-striped align-middle mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{tr("Username", "Usuario")}</th>
                  <th>{tr("Email", "Correo")}</th>
                  <th>{tr("Location", "Ubicacion")}</th>
                  <th>{tr("Group", "Grupo")}</th>
                  <th>{tr("Manager", "Manager")}</th>
                  <th>{tr("Owner", "Owner")}</th>
                  <th>{tr("Hours Records", "Registros de Horas")}</th>
                  <th>{tr("Disabled", "Deshabilitado")}</th>
                  <th>{tr("Sys Admin", "Admin Sistema")}</th>
                  <th>{tr("Time Admin", "Admin Tiempo")}</th>
                  <th>{tr("Reports", "Reportes")}</th>
                  <th>{tr("Server", "Mesero")}</th>
                  <th>{tr("Kitchen Mgr", "Mgr Cocina")}</th>
                  <th>{tr("Open Schedule", "Horario Abierto")}</th>
                  <th>{tr("Actions", "Acciones")}</th>
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
                    <td>{employee.isManager ? tr("Yes", "Si") : ""}</td>
                    <td>
                      {employee.isManager
                        ? employee.isOwnerManager
                          ? tr("Yes", "Si")
                          : tr("No", "No")
                        : "—"}
                    </td>
                    <td>{employee.hoursRecordCount ?? 0}</td>
                    <td>{employee.active ? "" : tr("Yes", "Si")}</td>
                    <td>{employee.isAdmin ? tr("Yes", "Si") : ""}</td>
                    <td>{employee.isTimeAdmin ? tr("Yes", "Si") : ""}</td>
                    <td>{employee.isReports ? tr("Yes", "Si") : ""}</td>
                    <td>{employee.isServer ? tr("Yes", "Si") : ""}</td>
                    <td>{employee.isKitchenManager ? tr("Yes", "Si") : ""}</td>
                    <td>{employee.allowOpenSchedule ? tr("Yes", "Si") : ""}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <a
                          className="btn btn-sm btn-outline-primary"
                          href={`/admin/users/${employee.id}`}
                        >
                          {tr("Edit", "Editar")}
                        </a>
                        <a
                          className="btn btn-sm btn-outline-secondary"
                          href={`/admin/time?${new URLSearchParams({
                            employeeId: employee.id,
                            returnTo: "/admin/users",
                          }).toString()}`}
                        >
                          {tr("Edit Times", "Editar Horas")}
                        </a>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-info"
                          disabled={
                            transferringEmployeeId === employee.id ||
                            deletingEmployeeId === employee.id ||
                            disablingEmployeeId === employee.id
                          }
                          onClick={() => openTransfer(employee)}
                        >
                          {transferringEmployeeId === employee.id
                            ? tr("Moving...", "Moviendo...")
                            : tr("Transfer", "Transferir")}
                        </button>
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
                            ? tr("Saving...", "Guardando...")
                            : employee.active
                              ? tr("Disable", "Deshabilitar")
                              : tr("Enable", "Habilitar")}
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
                            ? tr("Deleting...", "Eliminando...")
                            : tr("Delete", "Eliminar")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={16} className="text-center text-muted py-4">
                      {tr(
                        "No active users found.",
                        "No se encontraron usuarios activos.",
                      )}
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
                  <th>{tr("Username", "Usuario")}</th>
                  <th>{tr("Email", "Correo")}</th>
                  <th>{tr("Hours Records", "Registros de Horas")}</th>
                  <th>{tr("Deleted At", "Eliminado En")}</th>
                  <th>{tr("Deleted By", "Eliminado Por")}</th>
                  <th>{tr("Actions", "Acciones")}</th>
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
                            ? tr("Restoring...", "Restaurando...")
                            : tr("Restore", "Restaurar")}
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
                            ? tr("Deleting...", "Eliminando...")
                            : tr("Delete Forever", "Eliminar para Siempre")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {deletedEmployees.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">
                      {tr("No deleted users.", "No hay usuarios eliminados.")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {transferEmployee && (
        <div
          className="embedded-confirm-backdrop"
          onClick={() => {
            if (transferringEmployeeId !== transferEmployee.id) {
              setTransferEmployee(null);
            }
          }}
        >
          <div
            className="embedded-confirm-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="embedded-confirm-title">
              {tr("Transfer User", "Transferir Usuario")}
            </h2>
            <p className="embedded-confirm-message">
              {tr(
                `Move "${transferEmployee.name}" to another business/location inside this tenant. Their time records stay attached to the user.`,
                `Mueve a "${transferEmployee.name}" a otro negocio/ubicacion dentro del mismo tenant. Sus registros de tiempo siguen conectados al usuario.`,
              )}
            </p>
            <div className="d-flex flex-column gap-3">
              <label className="d-flex flex-column gap-1">
                <span className="fw-semibold">
                  {tr("New Location", "Nueva Ubicacion")}
                </span>
                <select
                  className="form-select"
                  value={transferOfficeId}
                  disabled={transferringEmployeeId === transferEmployee.id}
                  onChange={(event) =>
                    handleTransferOfficeChange(event.target.value)
                  }
                >
                  <option value="">
                    {tr("Select a location", "Selecciona una ubicacion")}
                  </option>
                  {offices.map((office) => (
                    <option key={office.id} value={office.id}>
                      {office.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="d-flex flex-column gap-1">
                <span className="fw-semibold">
                  {tr("New Group", "Nuevo Grupo")}
                </span>
                <select
                  className="form-select"
                  value={transferGroupId}
                  disabled={
                    !transferOfficeId ||
                    transferringEmployeeId === transferEmployee.id
                  }
                  onChange={(event) => setTransferGroupId(event.target.value)}
                >
                  <option value="">
                    {tr(
                      "No group / choose later",
                      "Sin grupo / elegir despues",
                    )}
                  </option>
                  {transferGroupOptions.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                <span className="text-muted small">
                  {tr(
                    "Only groups for the selected location are shown.",
                    "Solo aparecen los grupos de la ubicacion seleccionada.",
                  )}
                </span>
              </label>
            </div>
            <div className="embedded-confirm-actions">
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={transferringEmployeeId === transferEmployee.id}
                onClick={() => setTransferEmployee(null)}
              >
                {tr("Cancel", "Cancelar")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={
                  !transferOfficeId ||
                  transferringEmployeeId === transferEmployee.id
                }
                onClick={() => void handleTransferUser()}
              >
                {transferringEmployeeId === transferEmployee.id
                  ? tr("Transferring...", "Transfiriendo...")
                  : tr("Transfer User", "Transferir Usuario")}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  ? tr("Disable User", "Deshabilitar Usuario")
                  : tr("Enable User", "Habilitar Usuario")
                : pendingAction.kind === "soft-delete"
                  ? pendingAction.step === "warning"
                    ? tr("Archive User", "Archivar Usuario")
                    : tr("Final Confirmation", "Confirmacion Final")
                  : pendingAction.kind === "restore"
                    ? tr("Restore User", "Restaurar Usuario")
                    : pendingAction.step === "warning"
                      ? tr("Delete Forever", "Eliminar para Siempre")
                      : tr(
                          "Final Permanent Delete",
                          "Eliminacion Final Permanente",
                        )}
            </h2>
            <p className="embedded-confirm-message">
              {pendingAction.kind === "toggle"
                ? pendingAction.employee.active
                  ? tr(
                      `Disable user "${pendingAction.employee.name}"? They will not be active in the system.`,
                      `Deshabilitar al usuario "${pendingAction.employee.name}"? No estara activo en el sistema.`,
                    )
                  : tr(
                      `Enable user "${pendingAction.employee.name}" again?`,
                      `Habilitar nuevamente al usuario "${pendingAction.employee.name}"?`,
                    )
                : pendingAction.kind === "soft-delete"
                  ? pendingAction.step === "warning"
                    ? tr(
                        `You are deleting "${pendingAction.employee.name}". This account has ${pendingAction.employee.hoursRecordCount || 0} time records in this database. Labor law requires keeping employee records for 5 years.`,
                        `Estas eliminando a "${pendingAction.employee.name}". Esta cuenta tiene ${pendingAction.employee.hoursRecordCount || 0} registros de tiempo en esta base de datos. La ley laboral exige mantener los registros de empleados por 5 anos.`,
                      )
                    : tr(
                        `Proceed and move "${pendingAction.employee.name}" to Deleted Users? The records will be kept and recoverable.`,
                        `Continuar y mover a "${pendingAction.employee.name}" a Usuarios Eliminados? Los registros se conservaran y podran recuperarse.`,
                      )
                  : pendingAction.kind === "restore"
                    ? tr(
                        `Restore "${pendingAction.employee.name}" to active users now?`,
                        `Restaurar ahora a "${pendingAction.employee.name}" a usuarios activos?`,
                      )
                    : pendingAction.step === "warning"
                      ? tr(
                          `You are about to permanently delete "${pendingAction.employee.name}" from Deleted Users. This removes all associated records forever.`,
                          `Estas por eliminar permanentemente a "${pendingAction.employee.name}" de Usuarios Eliminados. Esto elimina todos los registros asociados para siempre.`,
                        )
                      : tr(
                          `Final check: permanently delete "${pendingAction.employee.name}" forever? This cannot be undone.`,
                          `Ultima verificacion: eliminar permanentemente a "${pendingAction.employee.name}" para siempre? Esto no se puede deshacer.`,
                        )}
            </p>
            {pendingAction.kind === "soft-delete" &&
              pendingAction.step === "warning" && (
                <p className="embedded-confirm-message text-danger mb-0">
                  {tr(
                    "Continue only if you intentionally want this user moved to Deleted Users. You can restore later.",
                    'Continua solo si realmente deseas mover este usuario a "Usuarios Eliminados". Puedes restaurarlo despues.',
                  )}
                </p>
              )}
            <div className="embedded-confirm-actions">
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={pendingActionBusy}
                onClick={() => setPendingAction(null)}
              >
                {tr("Cancel", "Cancelar")}
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
                  ? tr("Processing...", "Procesando...")
                  : pendingAction.kind === "soft-delete"
                    ? pendingAction.step === "warning"
                      ? tr("Continue", "Continuar")
                      : tr("Yes, Move To Deleted", "Si, mover a Eliminados")
                    : pendingAction.kind === "permanent-delete"
                      ? pendingAction.step === "warning"
                        ? tr("Continue", "Continuar")
                        : tr("Delete Forever", "Eliminar para Siempre")
                      : pendingAction.kind === "restore"
                        ? tr("Restore User", "Restaurar Usuario")
                        : tr("Confirm", "Confirmar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
