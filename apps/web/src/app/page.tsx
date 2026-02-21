"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

const apiBase = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "");

type Employee = {
  id: string;
  name: string;
  active: boolean;
  isServer?: boolean;
  officeId?: string | null;
};

type Office = {
  id: string;
  name: string;
};

type TenantContext = {
  name: string;
  slug: string;
  subdomain: string;
  authOrgId: string;
};

type EmployeeContextResponse = {
  ok?: boolean;
  requiresLocationSelection?: boolean;
  tenant?: TenantContext;
  offices?: Office[];
  multiLocationEnabled?: boolean;
  selectedOfficeId?: string;
  error?: string;
};

type PunchRow = {
  id: string;
  name: string;
  status: string | null;
  occurredAt: string | null;
  office: string | null;
  group: string | null;
};

const EMPLOYEE_TENANT_STORAGE_KEY = "clockin_employee_tenant";
const EMPLOYEE_OFFICE_STORAGE_KEY = "clockin_employee_office_id";
const isOfficeScopeUnsupportedError = (message: string) => {
  const normalized = message.toLowerCase();
  return normalized.includes("officeid") && normalized.includes("should not exist");
};

const readApiErrorMessage = async (response: Response) => {
  const raw = await response.text().catch(() => "");
  if (!raw) {
    return `Request failed (${response.status})`;
  }
  try {
    const payload = JSON.parse(raw) as {
      message?: string;
      error?: string;
    };
    return payload.message || payload.error || raw;
  } catch {
    return raw;
  }
};

export default function Home() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [recentPunches, setRecentPunches] = useState<PunchRow[]>([]);
  const [loadingPunches, setLoadingPunches] = useState(false);
  const [employeeName, setEmployeeName] = useState("");
  const [punchType, setPunchType] = useState("IN");
  const [pin, setPin] = useState("");
  const [cashTips, setCashTips] = useState("0");
  const [creditCardTips, setCreditCardTips] = useState("0");
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tenantInput, setTenantInput] = useState("");
  const [tenantContext, setTenantContext] = useState<TenantContext | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [activeOfficeId, setActiveOfficeId] = useState("");
  const [awaitingOfficeSelection, setAwaitingOfficeSelection] = useState(false);
  const [setupChecked, setSetupChecked] = useState(false);
  const [resolvingTenant, setResolvingTenant] = useState(false);
  const [tenantStatus, setTenantStatus] = useState<string | null>(null);

  const contextReady = Boolean(tenantContext) && !awaitingOfficeSelection;

  const persistTenantSelection = useCallback(
    (tenant: TenantContext, officeId: string) => {
      if (typeof window === "undefined") return;
      localStorage.setItem(EMPLOYEE_TENANT_STORAGE_KEY, JSON.stringify(tenant));
      if (officeId) {
        localStorage.setItem(EMPLOYEE_OFFICE_STORAGE_KEY, officeId);
      } else {
        localStorage.removeItem(EMPLOYEE_OFFICE_STORAGE_KEY);
      }
    },
    [],
  );

  const clearTenantSelection = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(EMPLOYEE_TENANT_STORAGE_KEY);
    localStorage.removeItem(EMPLOYEE_OFFICE_STORAGE_KEY);
  }, []);

  const resolveTenantContext = useCallback(
    async (tenantValue: string, officeId?: string) => {
      const response = await fetch("/api/employee/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant: tenantValue,
          officeId: officeId || undefined,
        }),
      });
      const data = (await response
        .json()
        .catch(() => ({}))) as EmployeeContextResponse;
      if (!response.ok) {
        throw new Error(data?.error || "Unable to load tenant context.");
      }
      return data;
    },
    [],
  );

  const applyTenantContext = useCallback(
    (data: EmployeeContextResponse) => {
      if (!data.tenant) {
        throw new Error("Tenant context is incomplete.");
      }

      const availableOffices = data.offices || [];
      const selectedOfficeId = data.selectedOfficeId || availableOffices[0]?.id || "";
      const needsLocationSelection = Boolean(data.requiresLocationSelection);

      setTenantContext(data.tenant);
      setOffices(availableOffices);
      setActiveOfficeId(selectedOfficeId);
      setAwaitingOfficeSelection(needsLocationSelection);

      if (needsLocationSelection) {
        persistTenantSelection(data.tenant, "");
      } else {
        persistTenantSelection(data.tenant, selectedOfficeId);
      }
    },
    [persistTenantSelection],
  );

  const loadEmployees = useCallback(async () => {
    if (!contextReady) return;
    try {
      if (activeOfficeId) {
        const scopedResponse = await fetch(
          `${apiBase}/employees?officeId=${encodeURIComponent(activeOfficeId)}`,
          {
            cache: "no-store",
          },
        );
        if (scopedResponse.ok) {
          const scopedData = (await scopedResponse.json()) as {
            employees?: Employee[];
          };
          if (scopedData.employees) {
            setEmployees(scopedData.employees);
          }
          return;
        }

        const scopedErrorMessage = await readApiErrorMessage(scopedResponse);
        if (!isOfficeScopeUnsupportedError(scopedErrorMessage)) {
          return;
        }
      }

      const response = await fetch(`${apiBase}/employees`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as { employees?: Employee[] };
      if (data.employees) {
        if (!activeOfficeId) {
          setEmployees(data.employees);
          return;
        }

        const scopedFallback = data.employees.filter((employee) => {
          if (typeof employee.officeId === "string") {
            return employee.officeId === activeOfficeId;
          }
          return true;
        });
        setEmployees(scopedFallback);
      }
    } finally {
      setLoadingEmployees(false);
    }
  }, [activeOfficeId, contextReady]);

  const loadPunches = useCallback(async () => {
    if (!contextReady) return;
    try {
      if (activeOfficeId) {
        const scopedResponse = await fetch(
          `${apiBase}/employee-punches/recent?officeId=${encodeURIComponent(activeOfficeId)}`,
          {
            cache: "no-store",
          },
        );
        if (scopedResponse.ok) {
          const scopedData = (await scopedResponse.json()) as { rows?: PunchRow[] };
          if (scopedData.rows) {
            setRecentPunches(scopedData.rows);
          }
          return;
        }

        const scopedErrorMessage = await readApiErrorMessage(scopedResponse);
        if (!isOfficeScopeUnsupportedError(scopedErrorMessage)) {
          return;
        }
      }

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
  }, [activeOfficeId, contextReady]);

  useEffect(() => {
    let mounted = true;

    const hydrateTenantSelection = async () => {
      if (typeof window === "undefined") {
        if (mounted) {
          setSetupChecked(true);
        }
        return;
      }

      const rawTenant = localStorage.getItem(EMPLOYEE_TENANT_STORAGE_KEY);
      const savedOfficeId =
        localStorage.getItem(EMPLOYEE_OFFICE_STORAGE_KEY) || "";
      if (!rawTenant) {
        if (mounted) {
          setSetupChecked(true);
        }
        return;
      }

      let savedTenant: TenantContext | null = null;
      try {
        savedTenant = JSON.parse(rawTenant) as TenantContext;
      } catch {
        savedTenant = null;
      }

      const tenantIdentifier =
        savedTenant?.slug?.trim() || savedTenant?.name?.trim() || "";
      if (!tenantIdentifier) {
        clearTenantSelection();
        if (mounted) {
          setSetupChecked(true);
        }
        return;
      }

      if (mounted) {
        setTenantInput(savedTenant?.name || tenantIdentifier);
        setResolvingTenant(true);
      }

      try {
        const context = await resolveTenantContext(
          tenantIdentifier,
          savedOfficeId || undefined,
        );
        if (!mounted) return;
        applyTenantContext(context);
        setTenantStatus(
          context.requiresLocationSelection
            ? "Select your location to continue."
            : null,
        );
      } catch (error) {
        clearTenantSelection();
        if (mounted) {
          setTenantStatus(
            error instanceof Error
              ? error.message
              : "Unable to load tenant context.",
          );
        }
      } finally {
        if (mounted) {
          setResolvingTenant(false);
          setSetupChecked(true);
        }
      }
    };

    void hydrateTenantSelection();
    return () => {
      mounted = false;
    };
  }, [applyTenantContext, clearTenantSelection, resolveTenantContext]);

  useEffect(() => {
    if (!setupChecked || !contextReady) {
      return;
    }

    setLoadingEmployees(true);
    setLoadingPunches(true);
    void loadEmployees();
    void loadPunches();
  }, [contextReady, loadEmployees, loadPunches, setupChecked]);

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

  const activeOfficeName = useMemo(
    () =>
      offices.find((office) => office.id === activeOfficeId)?.name ||
      (offices.length === 1 ? offices[0].name : ""),
    [activeOfficeId, offices],
  );

  const handleTenantSubmit = async () => {
    if (!tenantInput.trim()) {
      setTenantStatus("Enter your tenant name to continue.");
      return;
    }

    setResolvingTenant(true);
    setTenantStatus(null);
    try {
      const context = await resolveTenantContext(tenantInput.trim());
      applyTenantContext(context);
      setTenantStatus(
        context.requiresLocationSelection
          ? "Select your location to continue."
          : null,
      );
      setSubmitStatus(null);
      setEmployees([]);
      setRecentPunches([]);
      setEmployeeName("");
    } catch (error) {
      setTenantStatus(
        error instanceof Error ? error.message : "Unable to load tenant context.",
      );
    } finally {
      setResolvingTenant(false);
      setSetupChecked(true);
    }
  };

  const handleLocationSubmit = async () => {
    if (!tenantContext) {
      setTenantStatus("Select your tenant first.");
      return;
    }
    if (!activeOfficeId) {
      setTenantStatus("Select your location to continue.");
      return;
    }

    setResolvingTenant(true);
    setTenantStatus(null);
    try {
      const context = await resolveTenantContext(
        tenantContext.slug || tenantContext.name,
        activeOfficeId,
      );
      applyTenantContext(context);
      setTenantStatus(null);
      setSubmitStatus(null);
      setEmployees([]);
      setRecentPunches([]);
      setEmployeeName("");
    } catch (error) {
      setTenantStatus(
        error instanceof Error ? error.message : "Unable to set location.",
      );
    } finally {
      setResolvingTenant(false);
      setSetupChecked(true);
    }
  };

  const handleChangeTenantOrLocation = async () => {
    try {
      await fetch("/api/employee/context", { method: "DELETE" });
    } catch {
      // ignore
    }

    clearTenantSelection();
    setTenantInput("");
    setTenantContext(null);
    setOffices([]);
    setActiveOfficeId("");
    setAwaitingOfficeSelection(false);
    setTenantStatus(null);
    setSubmitStatus(null);
    setEmployees([]);
    setRecentPunches([]);
    setLoadingEmployees(false);
    setLoadingPunches(false);
    setEmployeeName("");
    setPin("");
  };

  const handlePunch = async () => {
    if (!contextReady) {
      setSubmitStatus("Select tenant and location before punching.");
      return;
    }

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
      if (punchType === "OUT" && selectedEmployee.isServer) {
        const cash = Number.parseFloat(cashTips || "0");
        const credit = Number.parseFloat(creditCardTips || "0");
        if (
          !Number.isFinite(cash) ||
          cash < 0 ||
          !Number.isFinite(credit) ||
          credit < 0
        ) {
          throw new Error("Tips must be valid non-negative numbers.");
        }

        const tipsResponse = await fetch(`/api/employee-tips/${selectedEmployee.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cashTips: cash,
            creditCardTips: credit,
          }),
        });

        if (!tipsResponse.ok) {
          const data = await tipsResponse.json().catch(() => ({}));
          throw new Error(
            data?.message || data?.error || "Unable to submit tips.",
          );
        }
      }

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
      if (punchType === "OUT" && selectedEmployee.isServer) {
        setCashTips("0");
        setCreditCardTips("0");
      }
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
          <div className="landing-logo">
            <Image
              src="/websys-logo.png"
              alt="Websys logo"
              width={40}
              height={40}
              className="landing-logo-image"
              priority
            />
          </div>
          <div className="landing-brand-text">
            <div className="landing-brand-name">Websys</div>
            <div className="landing-brand-sub">ClockIn</div>
          </div>
        </div>
        <nav className="landing-links">
          <Link href="/" className="landing-link">
            <i className="fa-solid fa-gauge" aria-hidden="true" />
            Dashboard
          </Link>
          <Link href="/admin/offices" className="landing-link">
            <i className="fa-solid fa-building" aria-hidden="true" />
            Offices
          </Link>
          <Link href="/reports" className="landing-link">
            <i className="fa-solid fa-chart-column" aria-hidden="true" />
            Reports
          </Link>
          <Link href="/admin-login" className="landing-link landing-link-admin">
            <i className="fa-solid fa-user-shield" aria-hidden="true" />
            Admin
            <i className="fa-solid fa-chevron-down" aria-hidden="true" />
          </Link>
        </nav>
      </header>
      <div className="container-xl d-flex flex-column align-items-center gap-4">
        <section className="signin-card">
          <div className="signin-header">
            {contextReady ? "PLEASE SIGN IN BELOW:" : "SELECT TENANT & LOCATION"}
          </div>
          <div className="signin-body">
            {!setupChecked ? (
              <div className="alert alert-info mb-0">Loading tenant context...</div>
            ) : !contextReady ? (
              <>
                <div className="row g-3">
                  {!awaitingOfficeSelection && (
                    <div className="col-12">
                      <label className="form-label" htmlFor="tenant-name">
                        Tenant:
                      </label>
                      <div className="input-row">
                        <i className="fa-solid fa-building-user" aria-hidden="true" />
                        <input
                          id="tenant-name"
                          aria-label="Tenant name"
                          placeholder="Enter tenant name"
                          value={tenantInput}
                          onChange={(event) => setTenantInput(event.target.value)}
                          autoComplete="organization"
                        />
                      </div>
                    </div>
                  )}
                  {awaitingOfficeSelection && (
                    <>
                      <div className="col-12">
                        <label className="form-label" htmlFor="tenant-readonly">
                          Tenant:
                        </label>
                        <div className="input-row">
                          <i className="fa-solid fa-building-user" aria-hidden="true" />
                          <input
                            id="tenant-readonly"
                            value={tenantContext?.name || tenantInput}
                            readOnly
                          />
                        </div>
                      </div>
                      <div className="col-12">
                        <label className="form-label" htmlFor="tenant-location">
                          Location:
                        </label>
                        <select
                          id="tenant-location"
                          value={activeOfficeId}
                          onChange={(event) => setActiveOfficeId(event.target.value)}
                        >
                          {offices.map((office) => (
                            <option key={office.id} value={office.id}>
                              {office.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
                {tenantStatus && (
                  <div className="alert alert-info mt-3 mb-0">{tenantStatus}</div>
                )}
              </>
            ) : (
              <>
                <div className="alert alert-info mb-3">
                  Tenant: <strong>{tenantContext?.name}</strong>
                  {activeOfficeName ? (
                    <>
                      {" "}
                      | Location: <strong>{activeOfficeName}</strong>
                    </>
                  ) : null}
                </div>
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
                        placeholder={
                          loadingEmployees ? "Loading employees..." : "Enter username"
                        }
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
                  {punchType === "OUT" && selectedEmployee?.isServer && (
                    <>
                      <div className="col-12 col-md-6">
                        <label className="form-label" htmlFor="cash-tips">
                          Cash Tips ($):
                        </label>
                        <div className="input-row">
                          <i
                            className="fa-solid fa-money-bill-wave"
                            aria-hidden="true"
                          />
                          <input
                            id="cash-tips"
                            type="number"
                            min="0"
                            step="0.01"
                            value={cashTips}
                            onChange={(event) => setCashTips(event.target.value)}
                          />
                        </div>
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label" htmlFor="credit-tips">
                          Credit Card Tips ($):
                        </label>
                        <div className="input-row">
                          <i className="fa-solid fa-credit-card" aria-hidden="true" />
                          <input
                            id="credit-tips"
                            type="number"
                            min="0"
                            step="0.01"
                            value={creditCardTips}
                            onChange={(event) => setCreditCardTips(event.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
                {submitStatus && (
                  <div className="alert alert-info mt-3 mb-0">{submitStatus}</div>
                )}
              </>
            )}
          </div>

          <div className="signin-footer">
            {!contextReady ? (
              <button
                className="sign-button"
                type="button"
                onClick={
                  awaitingOfficeSelection ? handleLocationSubmit : handleTenantSubmit
                }
                disabled={resolvingTenant}
              >
                {resolvingTenant
                  ? "Loading..."
                  : awaitingOfficeSelection
                    ? "Use This Location"
                    : "Continue"}
              </button>
            ) : (
              <div className="d-flex flex-wrap justify-content-center gap-2">
                <button
                  className="sign-button"
                  type="button"
                  onClick={handlePunch}
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Sign In"}
                </button>
                <button
                  className="btn btn-outline-light"
                  type="button"
                  onClick={handleChangeTenantOrLocation}
                >
                  Change Tenant/Location
                </button>
              </div>
            )}
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
                {!contextReady ? (
                  <tr>
                    <td colSpan={6} className="table-empty">
                      Select tenant and location to view activity.
                    </td>
                  </tr>
                ) : loadingPunches ? (
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
        <footer className="legal-footer">
          <Link href="/privacy">Privacy Policy</Link>
          <span>•</span>
          <Link href="/terms">Terms of Service</Link>
          <span>•</span>
          <Link href="/support">Support</Link>
        </footer>
      </div>
    </main>
  );
}
