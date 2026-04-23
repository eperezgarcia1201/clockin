"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  type ManagerFeatureKey,
  managerFeatureOptions,
} from "../../../../lib/manager-features";
import { useUiLanguage } from "../../../../lib/ui-language";
import { ClientApiError } from "../../../../lib/api/client";
import { listGroups, type Group } from "../../../../lib/api/groups";
import { listOffices, type Office } from "../../../../lib/api/offices";
import {
  createPunchRecord,
  getTimeAdminSettings,
  listPunchRecords,
  type PunchRecord,
} from "../../../../lib/api/time-admin";
import {
  archiveEmployee,
  getEmployeeById,
  type EmployeePayload,
  updateEmployee,
} from "../../../../lib/api/users-admin";

type FormState = {
  fullName: string;
  displayName: string;
  email: string;
  pin: string;
  hourlyRate: string;
  officeId: string;
  groupId: string;
  isManager: boolean;
  isOwnerManager: boolean;
  managerPermissions: ManagerFeatureKey[];
  isAdmin: boolean;
  isTimeAdmin: boolean;
  isReports: boolean;
  isServer: boolean;
  isKitchenManager: boolean;
  allowOpenSchedule: boolean;
  requiresPunchPhoto: boolean;
  disabled: boolean;
};

const emptyForm: FormState = {
  fullName: "",
  displayName: "",
  email: "",
  pin: "",
  hourlyRate: "",
  officeId: "",
  groupId: "",
  isManager: false,
  isOwnerManager: false,
  managerPermissions: [],
  isAdmin: false,
  isTimeAdmin: false,
  isReports: false,
  isServer: false,
  isKitchenManager: false,
  allowOpenSchedule: false,
  requiresPunchPhoto: false,
  disabled: false,
};

const sanitizePin = (value: string) => value.replace(/\D/g, "").slice(0, 4);

const toLocalInput = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

export default function EditUser() {
  const lang = useUiLanguage();
  const tr = (en: string, es: string) => (lang === "es" ? es : en);
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [employeeId, setEmployeeId] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [offices, setOffices] = useState<Office[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [allowManual, setAllowManual] = useState(true);
  const [latestPunch, setLatestPunch] = useState<PunchRecord | null>(null);
  const [clockOutType, setClockOutType] = useState("OUT");
  const [clockOutAt, setClockOutAt] = useState("");
  const [clockOutNotes, setClockOutNotes] = useState("Manual clock-out");
  const [timeStatus, setTimeStatus] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);

  useEffect(() => {
    const idParam = params?.id;
    let resolved = "";
    if (typeof idParam === "string") {
      resolved = idParam;
    } else if (Array.isArray(idParam)) {
      resolved = idParam[0] || "";
    }

    if (!resolved && typeof window !== "undefined") {
      const match = window.location.pathname.match(/\/admin\/users\/([^/]+)/);
      if (match) {
        resolved = match[1];
      }
    }

    setEmployeeId(resolved);
  }, [params]);

  useEffect(() => {
    if (!employeeId) return;
    const load = async () => {
      try {
        const employee = await getEmployeeById(employeeId);
        setForm({
          fullName: employee.fullName,
          displayName: employee.displayName || "",
          email: employee.email || "",
          pin: "",
          hourlyRate:
            employee.hourlyRate !== null && employee.hourlyRate !== undefined
              ? String(employee.hourlyRate)
              : "",
          officeId: employee.officeId || "",
          groupId: employee.groupId || "",
          isManager: Boolean(employee.isManager),
          isOwnerManager: Boolean(employee.isOwnerManager),
          managerPermissions:
            (employee.managerPermissions as ManagerFeatureKey[]) || [],
          isAdmin: employee.isAdmin,
          isTimeAdmin: employee.isTimeAdmin,
          isReports: employee.isReports,
          isServer: employee.isServer,
          isKitchenManager: employee.isKitchenManager,
          allowOpenSchedule: employee.allowOpenSchedule,
          requiresPunchPhoto: employee.requiresPunchPhoto,
          disabled: employee.disabled,
        });
      } catch (error) {
        if (error instanceof ClientApiError) {
          setStatus(
            tr(
              `Unable to load user (status ${error.status}).`,
              `No se pudo cargar el usuario (estado ${error.status}).`,
            ),
          );
        } else {
          setStatus(
            tr("Unable to load user.", "No se pudo cargar el usuario."),
          );
        }
      }

      const officesTask = listOffices()
        .then((data) => setOffices(data))
        .catch(() => {
          // Keep current behavior: silently ignore failed loads.
        });
      const groupsTask = listGroups()
        .then((data) => setGroups(data))
        .catch(() => {
          // Keep current behavior: silently ignore failed loads.
        });

      await Promise.all([officesTask, groupsTask]);
    };

    void load();
  }, [employeeId]);

  useEffect(() => {
    if (!employeeId) return;
    const loadTimeInfo = async () => {
      const settingsTask = getTimeAdminSettings()
        .then((data) => {
          if (typeof data.allowManualTimeEdits === "boolean") {
            setAllowManual(data.allowManualTimeEdits);
          }
        })
        .catch(() => {
          // Keep current behavior: silently ignore failed loads.
        });
      const recordsTask = listPunchRecords({ employeeId, limit: 1 })
        .then((data) => {
          setLatestPunch(data[0] ?? null);
        })
        .catch(() => {
          // Keep current behavior: silently ignore failed loads.
        });

      await Promise.all([settingsTask, recordsTask]);

      setClockOutAt((prev) => prev || toLocalInput(new Date()));
    };

    void loadTimeInfo();
  }, [employeeId]);

  const update = (key: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleManagerFeature = (feature: ManagerFeatureKey) => {
    setForm((prev) => {
      const enabled = prev.managerPermissions.includes(feature);
      const managerPermissions = enabled
        ? prev.managerPermissions.filter((key) => key !== feature)
        : [...prev.managerPermissions, feature];
      return {
        ...prev,
        isManager: managerPermissions.length > 0 ? true : prev.isManager,
        managerPermissions,
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);

    if (form.pin && form.pin.length !== 4) {
      setStatus(
        tr(
          "PIN must be exactly 4 digits.",
          "El PIN debe tener exactamente 4 digitos.",
        ),
      );
      return;
    }

    const hourlyRateValue = form.hourlyRate
      ? Number.parseFloat(form.hourlyRate)
      : undefined;

    if (form.hourlyRate && Number.isNaN(hourlyRateValue)) {
      setStatus(
        tr(
          "Hourly rate must be a number.",
          "La tarifa por hora debe ser un numero.",
        ),
      );
      return;
    }

    const payload: Partial<EmployeePayload> = {
      fullName: form.fullName,
      displayName: form.displayName || undefined,
      email: form.email || undefined,
      pin: form.pin || undefined,
      hourlyRate: hourlyRateValue,
      officeId: form.officeId || undefined,
      groupId: form.groupId || undefined,
      isManager: form.isManager,
      isOwnerManager: form.isManager ? form.isOwnerManager : false,
      managerPermissions: form.isManager ? form.managerPermissions : [],
      isAdmin: form.isAdmin,
      isTimeAdmin: form.isTimeAdmin,
      isReports: form.isReports,
      isServer: form.isServer,
      isKitchenManager: form.isKitchenManager,
      allowOpenSchedule: form.allowOpenSchedule,
      requiresPunchPhoto: form.requiresPunchPhoto,
      disabled: form.disabled,
    };

    try {
      await updateEmployee(employeeId, payload);
      setStatus(tr("User updated.", "Usuario actualizado."));
      setForm((prev) => ({ ...prev, pin: "" }));
    } catch {
      setStatus(
        tr("Unable to update user.", "No se pudo actualizar el usuario."),
      );
    }
  };

  const handleClockOut = async (event: React.FormEvent) => {
    event.preventDefault();
    setTimeStatus(null);

    if (!clockOutAt) {
      setTimeStatus(tr("Select a date & time.", "Selecciona fecha y hora."));
      return;
    }

    try {
      await createPunchRecord({
        employeeId,
        type: clockOutType,
        occurredAt: new Date(clockOutAt).toISOString(),
        notes: clockOutNotes || undefined,
      });
      setTimeStatus(tr("Time entry added.", "Registro de tiempo agregado."));
      setClockOutNotes(tr("Manual clock-out", "Salida manual"));
      try {
        const data = await listPunchRecords({ employeeId, limit: 1 });
        setLatestPunch(data[0] ?? null);
      } catch {
        // Keep current behavior: silently ignore latest-refresh failures.
      }
    } catch {
      setTimeStatus(
        tr(
          "Unable to add time entry.",
          "No se pudo agregar el registro de tiempo.",
        ),
      );
    }
  };

  const handleDelete = async () => {
    setDeletingUser(true);
    setStatus(null);
    try {
      await archiveEmployee(employeeId);
      setConfirmDeleteOpen(false);
      router.push("/admin/users");
    } catch {
      setStatus(
        tr(
          "Unable to move user to Deleted Users.",
          'No se pudo mover el usuario a "Usuarios Eliminados".',
        ),
      );
    } finally {
      setDeletingUser(false);
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>{tr("Edit User", "Editar Usuario")}</h1>
      </div>

      <div className="admin-card">
        {status && <div className="alert alert-info">{status}</div>}
        <form onSubmit={handleSubmit} className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label">
              {tr("Username *", "Usuario *")}
            </label>
            <input
              className="form-control"
              value={form.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">
              {tr("Display Name *", "Nombre Visible *")}
            </label>
            <input
              className="form-control"
              value={form.displayName}
              onChange={(e) => update("displayName", e.target.value)}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">
              {tr("Reset PIN (4 digits)", "Restablecer PIN (4 digitos)")}
            </label>
            <div className="d-flex flex-column gap-2">
              <input
                className="form-control"
                type="password"
                value={form.pin}
                inputMode="numeric"
                maxLength={4}
                onChange={(e) => update("pin", sanitizePin(e.target.value))}
                placeholder={tr("4-digit PIN", "PIN de 4 digitos")}
              />
              <div className="d-flex gap-2 flex-wrap">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => update("pin", "1234")}
                >
                  {tr("Use 1234", "Usar 1234")}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => update("pin", "0000")}
                >
                  {tr("Use 0000", "Usar 0000")}
                </button>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">
              {tr("Hourly Rate ($)", "Tarifa por Hora ($)")}
            </label>
            <input
              className="form-control"
              type="number"
              min={0}
              step="0.01"
              value={form.hourlyRate}
              onChange={(e) => update("hourlyRate", e.target.value)}
              placeholder={tr("e.g. 15.00", "ej. 15.00")}
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">{tr("Email *", "Correo *")}</label>
            <input
              className="form-control"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">
              {tr("Location *", "Ubicacion *")}
            </label>
            <select
              className="form-select"
              value={form.officeId}
              onChange={(e) => update("officeId", e.target.value)}
              required
            >
              <option value="">
                {tr("Select location", "Selecciona ubicacion")}
              </option>
              {offices.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">{tr("Group *", "Grupo *")}</label>
            <select
              className="form-select"
              value={form.groupId}
              onChange={(e) => update("groupId", e.target.value)}
              required
            >
              <option value="">{tr("Select group", "Selecciona grupo")}</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">
              {tr("Manager Access?", "Acceso de Manager?")}
            </label>
            <select
              className="form-select"
              value={form.isManager ? "yes" : "no"}
              onChange={(e) => {
                const enabled = e.target.value === "yes";
                setForm((prev) => ({
                  ...prev,
                  isManager: enabled,
                  isOwnerManager: enabled ? prev.isOwnerManager : false,
                  managerPermissions: enabled ? prev.managerPermissions : [],
                }));
              }}
            >
              <option value="no">{tr("No", "No")}</option>
              <option value="yes">{tr("Yes", "Si")}</option>
            </select>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">
              {tr("Manager Is Owner?", "Manager es Owner?")}
            </label>
            <select
              className="form-select"
              value={form.isOwnerManager ? "yes" : "no"}
              onChange={(e) =>
                update("isOwnerManager", e.target.value === "yes")
              }
              disabled={!form.isManager}
            >
              <option value="no">{tr("No", "No")}</option>
              <option value="yes">{tr("Yes", "Si")}</option>
            </select>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">
              {tr("Kitchen Manager User?", "Usuario Kitchen Manager?")}
            </label>
            <select
              className="form-select"
              value={form.isKitchenManager ? "yes" : "no"}
              onChange={(e) =>
                update("isKitchenManager", e.target.value === "yes")
              }
            >
              <option value="no">{tr("No", "No")}</option>
              <option value="yes">{tr("Yes", "Si")}</option>
            </select>
          </div>
          {form.isManager && (
            <div className="col-12">
              <label className="form-label">
                {tr("Manager Feature Access", "Accesos del Manager")}
              </label>
              <div className="d-flex flex-wrap gap-2">
                {managerFeatureOptions.map((feature) => {
                  const checked = form.managerPermissions.includes(feature.key);
                  return (
                    <label
                      key={feature.key}
                      className={`btn btn-sm ${
                        checked ? "btn-primary" : "btn-outline-secondary"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="d-none"
                        checked={checked}
                        onChange={() => toggleManagerFeature(feature.key)}
                      />
                      {feature.label}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          <div className="col-12 col-md-6">
            <label className="form-label">
              {tr("Sys Admin User?", "Usuario Admin del Sistema?")}
            </label>
            <select
              className="form-select"
              value={form.isAdmin ? "yes" : "no"}
              onChange={(e) => update("isAdmin", e.target.value === "yes")}
            >
              <option value="yes">{tr("Yes", "Si")}</option>
              <option value="no">{tr("No", "No")}</option>
            </select>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">
              {tr("Time Admin User?", "Usuario Admin de Tiempo?")}
            </label>
            <select
              className="form-select"
              value={form.isTimeAdmin ? "yes" : "no"}
              onChange={(e) => update("isTimeAdmin", e.target.value === "yes")}
            >
              <option value="yes">{tr("Yes", "Si")}</option>
              <option value="no">{tr("No", "No")}</option>
            </select>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">
              {tr("Reports User?", "Usuario de Reportes?")}
            </label>
            <select
              className="form-select"
              value={form.isReports ? "yes" : "no"}
              onChange={(e) => update("isReports", e.target.value === "yes")}
            >
              <option value="yes">{tr("Yes", "Si")}</option>
              <option value="no">{tr("No", "No")}</option>
            </select>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">
              {tr("Server User?", "Usuario Mesero?")}
            </label>
            <select
              className="form-select"
              value={form.isServer ? "yes" : "no"}
              onChange={(e) => update("isServer", e.target.value === "yes")}
            >
              <option value="yes">{tr("Yes", "Si")}</option>
              <option value="no">{tr("No", "No")}</option>
            </select>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">
              {tr("Open Schedule?", "Horario abierto?")}
            </label>
            <select
              className="form-select"
              value={form.allowOpenSchedule ? "yes" : "no"}
              onChange={(e) =>
                update("allowOpenSchedule", e.target.value === "yes")
              }
            >
              <option value="yes">{tr("Yes", "Si")}</option>
              <option value="no">{tr("No", "No")}</option>
            </select>
            <div className="form-text">
              {tr(
                "Allows this employee to clock in without any fixed daily schedule. Early clock-ins on a scheduled day are already auto-approved.",
                "Permite que este usuario marque sin un horario fijo diario. Las entradas tempranas en un día programado ya se aprueban automáticamente.",
              )}
            </div>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">
              {tr(
                "Require Face Photo on Punch?",
                "Requerir foto facial al marcar?",
              )}
            </label>
            <select
              className="form-select"
              value={form.requiresPunchPhoto ? "yes" : "no"}
              onChange={(e) =>
                update("requiresPunchPhoto", e.target.value === "yes")
              }
            >
              <option value="yes">{tr("Yes", "Si")}</option>
              <option value="no">{tr("No", "No")}</option>
            </select>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">
              {tr("User Account Disabled?", "Cuenta de Usuario Deshabilitada?")}
            </label>
            <select
              className="form-select"
              value={form.disabled ? "yes" : "no"}
              onChange={(e) => update("disabled", e.target.value === "yes")}
            >
              <option value="yes">{tr("Yes", "Si")}</option>
              <option value="no">{tr("No", "No")}</option>
            </select>
          </div>
          <div className="col-12 d-flex gap-2">
            <button className="btn btn-primary" type="submit">
              {tr("Save Changes", "Guardar Cambios")}
            </button>
            <button
              className="btn btn-outline-danger"
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
            >
              {tr("Delete User", "Eliminar Usuario")}
            </button>
            <Link className="btn btn-outline-secondary" href="/admin/users">
              {tr("Cancel", "Cancelar")}
            </Link>
          </div>
        </form>
      </div>

      {confirmDeleteOpen && (
        <div
          className="embedded-confirm-backdrop"
          onClick={() => {
            if (!deletingUser) {
              setConfirmDeleteOpen(false);
            }
          }}
        >
          <div
            className="embedded-confirm-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="embedded-confirm-title">
              {tr("Archive User", "Archivar Usuario")}
            </h2>
            <p className="embedded-confirm-message">
              {tr(
                "Move this user to Deleted Users? Records will be preserved and can be restored later.",
                'Mover este usuario a "Usuarios Eliminados"? Los registros se conservaran y se pueden restaurar despues.',
              )}
            </p>
            <div className="embedded-confirm-actions">
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={deletingUser}
                onClick={() => setConfirmDeleteOpen(false)}
              >
                {tr("Cancel", "Cancelar")}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={deletingUser}
                onClick={() => void handleDelete()}
              >
                {deletingUser
                  ? tr("Processing...", "Procesando...")
                  : tr("Confirm", "Confirmar")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-card">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h2 className="h5 mb-0">
            {tr("Fix Missing Clock-Out", "Corregir Salida Faltante")}
          </h2>
          <a
            className="btn btn-outline-secondary"
            href={`/admin/time?${new URLSearchParams({
              employeeId,
              returnTo: `/admin/users/${employeeId}`,
            }).toString()}`}
          >
            {tr("Open Time Admin", "Abrir Admin de Tiempo")}
          </a>
        </div>
        {!allowManual && (
          <div className="alert alert-warning mb-3">
            {tr(
              "Manual time edits are disabled in System Settings.",
              "Las ediciones manuales de tiempo estan deshabilitadas en Configuracion del Sistema.",
            )}
          </div>
        )}
        {latestPunch && (
          <div className="alert alert-light border mb-3">
            <strong>{tr("Latest Punch:", "Ultimo Registro:")}</strong>{" "}
            {latestPunch.type} {tr("at", "a las")}{" "}
            {new Date(latestPunch.occurredAt).toLocaleString()}
          </div>
        )}
        {timeStatus && <div className="alert alert-info">{timeStatus}</div>}
        <form onSubmit={handleClockOut} className="row g-3">
          <div className="col-12 col-md-4">
            <label className="form-label">{tr("Type", "Tipo")}</label>
            <select
              className="form-select"
              value={clockOutType}
              onChange={(event) => setClockOutType(event.target.value)}
              disabled={!allowManual}
            >
              <option value="OUT">{tr("OUT", "SALIDA")}</option>
              <option value="BREAK">{tr("BREAK", "DESCANSO")}</option>
              <option value="LUNCH">{tr("LUNCH", "COMIDA")}</option>
              <option value="IN">{tr("IN", "ENTRADA")}</option>
            </select>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">
              {tr("Date & Time", "Fecha y Hora")}
            </label>
            <input
              className="form-control"
              type="datetime-local"
              value={clockOutAt}
              onChange={(event) => setClockOutAt(event.target.value)}
              required
              disabled={!allowManual}
            />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">{tr("Notes", "Notas")}</label>
            <input
              className="form-control"
              value={clockOutNotes}
              onChange={(event) => setClockOutNotes(event.target.value)}
              disabled={!allowManual}
            />
          </div>
          <div className="col-12">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={!allowManual}
            >
              {tr("Add Time Entry", "Agregar Registro de Tiempo")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
