"use client";

import { useEffect, useState } from "react";
import {
  type ManagerFeatureKey,
  managerFeatureOptions,
} from "../../../../lib/manager-features";

type Office = { id: string; name: string };
type Group = { id: string; name: string };

type FormState = {
  fullName: string;
  displayName: string;
  email: string;
  pin: string;
  hourlyRate: string;
  officeId: string;
  groupId: string;
  isManager: boolean;
  managerPermissions: ManagerFeatureKey[];
  isAdmin: boolean;
  isTimeAdmin: boolean;
  isReports: boolean;
  isServer: boolean;
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
  managerPermissions: [],
  isAdmin: false,
  isTimeAdmin: false,
  isReports: false,
  isServer: false,
  disabled: false,
};

const sanitizePin = (value: string) => value.replace(/\D/g, "").slice(0, 4);

export default function CreateUser() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [offices, setOffices] = useState<Office[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [officesRes, groupsRes] = await Promise.all([
        fetch("/api/offices"),
        fetch("/api/groups"),
      ]);
      if (officesRes.ok) {
        const data = (await officesRes.json()) as { offices: Office[] };
        setOffices(data.offices || []);
      }
      if (groupsRes.ok) {
        const data = (await groupsRes.json()) as { groups: Group[] };
        setGroups(data.groups || []);
      }
    };

    load();
  }, []);

  const update = (key: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleManagerFeature = (feature: ManagerFeatureKey) => {
    setForm((prev) => {
      const enabled = prev.managerPermissions.includes(feature);
      return {
        ...prev,
        managerPermissions: enabled
          ? prev.managerPermissions.filter((key) => key !== feature)
          : [...prev.managerPermissions, feature],
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);

    if (form.pin && form.pin.length !== 4) {
      setStatus("PIN must be exactly 4 digits.");
      return;
    }

    const hourlyRateValue = form.hourlyRate
      ? Number.parseFloat(form.hourlyRate)
      : undefined;

    if (form.hourlyRate && Number.isNaN(hourlyRateValue)) {
      setStatus("Hourly rate must be a number.");
      return;
    }

    const response = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: form.fullName,
        displayName: form.displayName || undefined,
        email: form.email || undefined,
        pin: form.pin || undefined,
        hourlyRate: hourlyRateValue,
        officeId: form.officeId || undefined,
        groupId: form.groupId || undefined,
        isManager: form.isManager,
        managerPermissions: form.isManager ? form.managerPermissions : [],
        isAdmin: form.isAdmin,
        isTimeAdmin: form.isTimeAdmin,
        isReports: form.isReports,
        isServer: form.isServer,
        disabled: form.disabled,
      }),
    });

    if (response.ok) {
      setStatus("User created successfully.");
      setForm(initialForm);
    } else {
      setStatus("Unable to create user. Check required fields.");
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>Create New User</h1>
      </div>

      <div className="admin-card">
        {status && <div className="alert alert-info">{status}</div>}
        <form onSubmit={handleSubmit} className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label">Username *</label>
            <input
              className="form-control"
              value={form.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Display Name *</label>
            <input
              className="form-control"
              value={form.displayName}
              onChange={(e) => update("displayName", e.target.value)}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Password / PIN</label>
            <div className="d-flex flex-column gap-2">
              <input
                className="form-control"
                type="password"
                value={form.pin}
                inputMode="numeric"
                maxLength={4}
                onChange={(e) => update("pin", sanitizePin(e.target.value))}
                placeholder="4-digit PIN"
              />
              <div className="d-flex gap-2 flex-wrap">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => update("pin", "1234")}
                >
                  Use 1234
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => update("pin", "0000")}
                >
                  Use 0000
                </button>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Hourly Rate ($)</label>
            <input
              className="form-control"
              type="number"
              min={0}
              step="0.01"
              value={form.hourlyRate}
              onChange={(e) => update("hourlyRate", e.target.value)}
              placeholder="e.g. 15.00"
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Email *</label>
            <input
              className="form-control"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Location *</label>
            <select
              className="form-select"
              value={form.officeId}
              onChange={(e) => update("officeId", e.target.value)}
              required
            >
              <option value="">Select location</option>
              {offices.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Group *</label>
            <select
              className="form-select"
              value={form.groupId}
              onChange={(e) => update("groupId", e.target.value)}
              required
            >
              <option value="">Select group</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Manager Access?</label>
            <select
              className="form-select"
              value={form.isManager ? "yes" : "no"}
              onChange={(e) => update("isManager", e.target.value === "yes")}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          {form.isManager && (
            <div className="col-12">
              <label className="form-label">Manager Feature Access</label>
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
            <label className="form-label">Sys Admin User?</label>
            <select
              className="form-select"
              value={form.isAdmin ? "yes" : "no"}
              onChange={(e) => update("isAdmin", e.target.value === "yes")}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Time Admin User?</label>
            <select
              className="form-select"
              value={form.isTimeAdmin ? "yes" : "no"}
              onChange={(e) => update("isTimeAdmin", e.target.value === "yes")}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Reports User?</label>
            <select
              className="form-select"
              value={form.isReports ? "yes" : "no"}
              onChange={(e) => update("isReports", e.target.value === "yes")}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Server User?</label>
            <select
              className="form-select"
              value={form.isServer ? "yes" : "no"}
              onChange={(e) => update("isServer", e.target.value === "yes")}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">User Account Disabled?</label>
            <select
              className="form-select"
              value={form.disabled ? "yes" : "no"}
              onChange={(e) => update("disabled", e.target.value === "yes")}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div className="col-12 d-flex gap-2">
            <button className="btn btn-primary" type="submit">
              Create User
            </button>
            <a className="btn btn-outline-secondary" href="/admin/users">
              Cancel
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
