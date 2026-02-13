"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Office = { id: string; name: string };
type Group = { id: string; name: string };

type Employee = {
  id: string;
  fullName: string;
  displayName: string | null;
  email: string | null;
  hourlyRate?: number | null;
  officeId: string | null;
  groupId: string | null;
  isAdmin: boolean;
  isTimeAdmin: boolean;
  isReports: boolean;
  isServer: boolean;
  disabled: boolean;
};

type PunchRecord = {
  id: string;
  type: string;
  occurredAt: string;
};

type FormState = {
  fullName: string;
  displayName: string;
  email: string;
  pin: string;
  hourlyRate: string;
  officeId: string;
  groupId: string;
  isAdmin: boolean;
  isTimeAdmin: boolean;
  isReports: boolean;
  isServer: boolean;
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
  isAdmin: false,
  isTimeAdmin: false,
  isReports: false,
  isServer: false,
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
      const [employeeRes, officesRes, groupsRes] = await Promise.all([
        fetch(`/api/employees/${employeeId}`, { cache: "no-store" }),
        fetch("/api/offices"),
        fetch("/api/groups"),
      ]);

      if (employeeRes.ok) {
        const employee = (await employeeRes.json()) as Employee;
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
          isAdmin: employee.isAdmin,
          isTimeAdmin: employee.isTimeAdmin,
          isReports: employee.isReports,
          isServer: employee.isServer,
          disabled: employee.disabled,
        });
      } else {
        setStatus(`Unable to load user (status ${employeeRes.status}).`);
      }

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
  }, [employeeId]);

  useEffect(() => {
    if (!employeeId) return;
    const loadTimeInfo = async () => {
      const [settingsRes, recordsRes] = await Promise.all([
        fetch("/api/settings", { cache: "no-store" }),
        fetch(
          `/api/employee-punches/records?${new URLSearchParams({
            employeeId,
            limit: "1",
          }).toString()}`,
          { cache: "no-store" },
        ),
      ]);

      if (settingsRes.ok) {
        const data = (await settingsRes.json()) as {
          allowManualTimeEdits?: boolean;
        };
        if (typeof data.allowManualTimeEdits === "boolean") {
          setAllowManual(data.allowManualTimeEdits);
        }
      }

      if (recordsRes.ok) {
        const data = (await recordsRes.json()) as { records: PunchRecord[] };
        setLatestPunch(data.records?.[0] ?? null);
      }

      setClockOutAt((prev) => prev || toLocalInput(new Date()));
    };

    loadTimeInfo();
  }, [employeeId]);

  const update = (key: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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

    const response = await fetch(`/api/employees/${employeeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: form.fullName,
        displayName: form.displayName || undefined,
        email: form.email || undefined,
        pin: form.pin || undefined,
        hourlyRate: hourlyRateValue,
        officeId: form.officeId || undefined,
        groupId: form.groupId || undefined,
        isAdmin: form.isAdmin,
        isTimeAdmin: form.isTimeAdmin,
        isReports: form.isReports,
        isServer: form.isServer,
        disabled: form.disabled,
      }),
    });

    if (response.ok) {
      setStatus("User updated.");
      setForm((prev) => ({ ...prev, pin: "" }));
    } else {
      setStatus("Unable to update user.");
    }
  };

  const handleClockOut = async (event: React.FormEvent) => {
    event.preventDefault();
    setTimeStatus(null);

    if (!clockOutAt) {
      setTimeStatus("Select a date & time.");
      return;
    }

    const response = await fetch("/api/employee-punches/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId,
        type: clockOutType,
        occurredAt: new Date(clockOutAt).toISOString(),
        notes: clockOutNotes || undefined,
      }),
    });

    if (response.ok) {
      setTimeStatus("Time entry added.");
      setClockOutNotes("Manual clock-out");
      const latestRes = await fetch(
        `/api/employee-punches/records?${new URLSearchParams({
          employeeId,
          limit: "1",
        }).toString()}`,
        { cache: "no-store" },
      );
      if (latestRes.ok) {
        const data = (await latestRes.json()) as { records: PunchRecord[] };
        setLatestPunch(data.records?.[0] ?? null);
      }
    } else {
      setTimeStatus("Unable to add time entry.");
    }
  };

  const handleDelete = async () => {
    const ok = confirm("Disable this user?");
    if (!ok) return;
    const response = await fetch(`/api/employees/${employeeId}`, {
      method: "DELETE",
    });
    if (response.ok) {
      router.push("/admin/users");
    } else {
      setStatus("Unable to disable user.");
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>Edit User</h1>
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
            <label className="form-label">Reset PIN (4 digits)</label>
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
            <label className="form-label">Office *</label>
            <select
              className="form-select"
              value={form.officeId}
              onChange={(e) => update("officeId", e.target.value)}
              required
            >
              <option value="">Select office</option>
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
              Save Changes
            </button>
            <button
              className="btn btn-outline-danger"
              type="button"
              onClick={handleDelete}
            >
              Disable User
            </button>
            <a className="btn btn-outline-secondary" href="/admin/users">
              Cancel
            </a>
          </div>
        </form>
      </div>

      <div className="admin-card">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h2 className="h5 mb-0">Fix Missing Clock-Out</h2>
          <a
            className="btn btn-outline-secondary"
            href={`/admin/time?${new URLSearchParams({
              employeeId,
              returnTo: `/admin/users/${employeeId}`,
            }).toString()}`}
          >
            Open Time Admin
          </a>
        </div>
        {!allowManual && (
          <div className="alert alert-warning mb-3">
            Manual time edits are disabled in System Settings.
          </div>
        )}
        {latestPunch && (
          <div className="alert alert-light border mb-3">
            <strong>Latest Punch:</strong> {latestPunch.type} at{" "}
            {new Date(latestPunch.occurredAt).toLocaleString()}
          </div>
        )}
        {timeStatus && <div className="alert alert-info">{timeStatus}</div>}
        <form onSubmit={handleClockOut} className="row g-3">
          <div className="col-12 col-md-4">
            <label className="form-label">Type</label>
            <select
              className="form-select"
              value={clockOutType}
              onChange={(event) => setClockOutType(event.target.value)}
              disabled={!allowManual}
            >
              <option value="OUT">OUT</option>
              <option value="BREAK">BREAK</option>
              <option value="LUNCH">LUNCH</option>
              <option value="IN">IN</option>
            </select>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">Date & Time</label>
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
            <label className="form-label">Notes</label>
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
              Add Time Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
