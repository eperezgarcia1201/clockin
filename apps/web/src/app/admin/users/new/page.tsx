"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  type ManagerFeatureKey,
  managerFeatureOptions,
} from "../../../../lib/manager-features";
import { useUiLanguage } from "../../../../lib/ui-language";
import { listGroups, type Group } from "../../../../lib/api/groups";
import { listOffices, type Office } from "../../../../lib/api/offices";
import {
  createEmployee,
  type EmployeePayload,
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

const initialForm: FormState = {
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

export default function CreateUser() {
  const lang = useUiLanguage();
  const tr = (en: string, es: string) => (lang === "es" ? es : en);
  const [form, setForm] = useState<FormState>(initialForm);
  const [offices, setOffices] = useState<Office[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
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
  }, []);

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

    const payload: EmployeePayload = {
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
      await createEmployee(payload);
      setStatus(
        tr("User created successfully.", "Usuario creado correctamente."),
      );
      setForm(initialForm);
    } catch {
      setStatus(
        tr(
          "Unable to create user. Check required fields.",
          "No se pudo crear el usuario. Revisa los campos requeridos.",
        ),
      );
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>{tr("Create New User", "Crear Nuevo Usuario")}</h1>
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
              {tr("Password / PIN", "Contrasena / PIN")}
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
              {tr("Create User", "Crear Usuario")}
            </button>
            <Link className="btn btn-outline-secondary" href="/admin/users">
              {tr("Cancel", "Cancelar")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
