"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const apiBase = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "");

type Employee = {
  id: string;
  name: string;
  active: boolean;
};

type PunchRow = {
  id: string;
  name: string;
  status: string | null;
  occurredAt: string | null;
  office: string | null;
  group: string | null;
};

export default function Home() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [recentPunches, setRecentPunches] = useState<PunchRow[]>([]);
  const [loadingPunches, setLoadingPunches] = useState(true);
  const [employeeName, setEmployeeName] = useState("");
  const [punchType, setPunchType] = useState("IN");
  const [pin, setPin] = useState("");
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadEmployees = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/employees`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as { employees?: Employee[] };
      if (data.employees) {
        setEmployees(data.employees);
      }
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  const loadPunches = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/employee-punches/recent`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as { rows?: PunchRow[] };
      if (data.rows) {
        setRecentPunches(data.rows);
      }
    } finally {
      setLoadingPunches(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
    loadPunches();
  }, [loadEmployees, loadPunches]);

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.active),
    [employees],
  );

  const selectedEmployee = useMemo(() => {
    const needle = employeeName.trim().toLowerCase();
    if (!needle) return null;
    return (
      activeEmployees.find(
        (employee) => employee.name.trim().toLowerCase() === needle,
      ) || null
    );
  }, [employeeName, activeEmployees]);

  const activePunches = useMemo(
    () =>
      recentPunches.filter(
        (row) =>
          row.status &&
          ["IN", "BREAK", "LUNCH"].includes(row.status.toUpperCase()),
      ),
    [recentPunches],
  );

  const handlePunch = async () => {
    if (!employeeName.trim()) {
      setSubmitStatus("Please enter your username.");
      return;
    }

    if (!selectedEmployee) {
      setSubmitStatus("Employee not found.");
      return;
    }

    setSubmitting(true);
    setSubmitStatus(null);
    try {
      const payload: Record<string, string> = { type: punchType };
      if (pin) {
        payload.pin = pin;
      }
      const response = await fetch(
        `${apiBase}/employee-punches/${selectedEmployee.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data?.message || data?.error || "Unable to record punch.",
        );
      }

      setSubmitStatus("Punch recorded.");
      setPin("");
      loadPunches();
    } catch (error) {
      setSubmitStatus(
        error instanceof Error ? error.message : "Unable to record punch.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page landing-page">
      <header className="landing-nav">
        <div className="landing-brand">
          <div className="landing-logo">W</div>
          <div className="landing-brand-text">
            <div className="landing-brand-name">Websys</div>
            <div className="landing-brand-sub">ClockIn</div>
          </div>
        </div>
        <nav className="landing-links">
          <a href="/" className="landing-link">
            <i className="fa-solid fa-gauge" aria-hidden="true" />
            Dashboard
          </a>
          <a href="/admin/offices" className="landing-link">
            <i className="fa-solid fa-building" aria-hidden="true" />
            Offices
          </a>
          <a href="/reports" className="landing-link">
            <i className="fa-solid fa-chart-column" aria-hidden="true" />
            Reports
          </a>
          <a href="/admin-login" className="landing-link landing-link-admin">
            <i className="fa-solid fa-user-shield" aria-hidden="true" />
            Admin
            <i className="fa-solid fa-chevron-down" aria-hidden="true" />
          </a>
        </nav>
      </header>
      <div className="container-xl d-flex flex-column align-items-center gap-4">
        <section className="signin-card">
          <div className="signin-header">PLEASE SIGN IN BELOW:</div>
          <div className="signin-body">
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="name">
                  Name:
                </label>
                <div className="input-row">
                  <i className="fa-solid fa-user" aria-hidden="true" />
                  <input
                    id="name"
                    aria-label="Employee username"
                    placeholder={loadingEmployees ? "Loading employees..." : "Enter username"}
                    value={employeeName}
                    onChange={(event) => setEmployeeName(event.target.value)}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="password">
                  PIN:
                </label>
                <div className="input-row">
                  <i className="fa-solid fa-lock" aria-hidden="true" />
                  <input
                    id="password"
                    placeholder="4-digit PIN"
                    type="password"
                    inputMode="numeric"
                    pattern="\\d{4}"
                    maxLength={4}
                    aria-label="PIN"
                    value={pin}
                    onChange={(event) => setPin(event.target.value)}
                  />
                </div>
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="inout-left">
                  In/Out:
                </label>
                <select
                  id="inout-left"
                  aria-label="In or out"
                  value={punchType}
                  onChange={(event) => setPunchType(event.target.value)}
                >
                  <option value="IN">In</option>
                  <option value="OUT">Out</option>
                  <option value="BREAK">Break</option>
                  <option value="LUNCH">Lunch</option>
                </select>
              </div>
            </div>
            {submitStatus && (
              <div className="alert alert-info mt-3 mb-0">{submitStatus}</div>
            )}
          </div>

          <div className="signin-footer">
            <button
              className="sign-button"
              type="button"
              onClick={handlePunch}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Sign In"}
            </button>
          </div>
        </section>

        <section className="table-card">
          <div className="table-header">
            <div>
              <h2>Employee Activity</h2>
              <p>Live status for active employees.</p>
            </div>
            <div className="table-meta">
              {activePunches.length} Active
            </div>
          </div>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>In/Out</th>
                  <th>Time</th>
                  <th>Date</th>
                  <th>Office</th>
                  <th>Group</th>
                </tr>
              </thead>
              <tbody>
                {loadingPunches ? (
                  <tr>
                    <td colSpan={6} className="table-empty">
                      Loading employee status…
                    </td>
                  </tr>
                ) : activePunches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="table-empty">
                      No active employees yet.
                    </td>
                  </tr>
                ) : (
                  activePunches.map((row) => {
                    const statusLabel = row.status ?? "—";
                    const statusClass =
                      row.status?.toLowerCase() || "unknown";
                    const occurred = row.occurredAt
                      ? new Date(row.occurredAt)
                      : null;
                    const time = occurred
                      ? occurred.toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "—";
                    const date = occurred
                      ? occurred.toLocaleDateString()
                      : "—";

                    return (
                      <tr key={row.id}>
                        <td>{row.name}</td>
                        <td>
                          <span className={`status-pill status-${statusClass}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td>{time}</td>
                        <td>{date}</td>
                        <td>{row.office || "—"}</td>
                        <td>{row.group || "—"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="table-footer">Coded by Elmer Perez</div>
        </section>

        <section className="mobile-apps">
          <div>
            <h3>Mobile Apps</h3>
            <p>
              Employees can clock in from mobile. Admins receive punch alerts and
              break compliance notifications.
            </p>
          </div>
          <div className="mobile-app-grid">
            <div className="mobile-app-card">
              <h4>Employee App</h4>
              <span>Clock in/out, breaks, and view recent punches.</span>
              <div className="mobile-app-actions">
                <span className="mobile-app-button">iOS (Expo)</span>
                <span className="mobile-app-button">Android (Expo)</span>
              </div>
            </div>
            <div className="mobile-app-card">
              <h4>Admin App</h4>
              <span>Get alerts for punches and 6-hour no-break warnings.</span>
              <div className="mobile-app-actions">
                <span className="mobile-app-button">Admin Alerts</span>
                <span className="mobile-app-button">Live Refresh</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
