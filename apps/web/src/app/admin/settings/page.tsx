"use client";

import { useEffect, useState } from "react";

type Settings = {
  timezone: string;
  roundingMinutes: number;
  requirePin: boolean;
  ipRestrictions: string;
  reportsEnabled: boolean;
  allowManualTimeEdits: boolean;
};

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "UTC",
];

const roundingOptions = [0, 5, 10, 15, 30];

const defaults: Settings = {
  timezone: "America/New_York",
  roundingMinutes: 15,
  requirePin: true,
  ipRestrictions: "",
  reportsEnabled: true,
  allowManualTimeEdits: true,
};

export default function SystemSettings() {
  const [form, setForm] = useState<Settings>(defaults);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/settings", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = (await response.json()) as Partial<Settings>;
        setForm((prev) => ({ ...prev, ...data }));
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  const update = (key: keyof Settings, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (response.ok) {
      setStatus("Settings saved.");
    } else {
      setStatus("Unable to save settings.");
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>System Settings</h1>
      </div>
      <div className="admin-card">
        {status && <div className="alert alert-info">{status}</div>}
        <form onSubmit={save} className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label">Timezone</label>
            <select
              className="form-select"
              value={form.timezone}
              onChange={(event) => update("timezone", event.target.value)}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Rounding Minutes</label>
            <select
              className="form-select"
              value={form.roundingMinutes}
              onChange={(event) =>
                update("roundingMinutes", Number(event.target.value))
              }
            >
              {roundingOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 0 ? "No rounding" : `${opt} minutes`}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12">
            <label className="form-label">IP Restrictions</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Comma-separated IPs or CIDR ranges"
              value={form.ipRestrictions}
              onChange={(event) =>
                update("ipRestrictions", event.target.value)
              }
            />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">Require PIN</label>
            <select
              className="form-select"
              value={form.requirePin ? "yes" : "no"}
              onChange={(event) =>
                update("requirePin", event.target.value === "yes")
              }
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">Reports Enabled</label>
            <select
              className="form-select"
              value={form.reportsEnabled ? "yes" : "no"}
              onChange={(event) =>
                update("reportsEnabled", event.target.value === "yes")
              }
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">Allow Manual Time Edits</label>
            <select
              className="form-select"
              value={form.allowManualTimeEdits ? "yes" : "no"}
              onChange={(event) =>
                update("allowManualTimeEdits", event.target.value === "yes")
              }
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div className="col-12 d-flex gap-2">
            <button className="btn btn-primary" type="submit">
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
