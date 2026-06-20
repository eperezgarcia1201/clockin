"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  fetchEmployeesRequest,
  fetchTipsReportRequest,
} from "../../../lib/api/reports-core";
import { useUiLanguage } from "../../../lib/ui-language";
import { tipsCopy, type TipsLang as Lang } from "./tips-copy";
type Employee = { id: string; name: string; isServer?: boolean };

type DayTip = {
  id: string;
  date: string;
  cashTips: number;
  creditCardTips: number;
  totalTips: number;
};

type EmployeeTipReport = {
  id: string;
  name: string;
  totalCashTips: number;
  totalCreditCardTips: number;
  totalTips: number;
  days: DayTip[];
};

type TipsReportResponse = {
  range: { from: string; to: string };
  employees: EmployeeTipReport[];
};

type TipFormMode = "create" | "edit";

type TipFormState = {
  mode: TipFormMode;
  tipId?: string;
  employeeId: string;
  workDate: string;
  cashTips: string;
  creditCardTips: string;
};

const formatDate = (date: Date) => date.toISOString().slice(0, 10);
const formatMoney = (value: number, lang: Lang) =>
  new Intl.NumberFormat(lang === "es" ? "es-US" : "en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

export default function TipsReportPage() {
  const lang = useUiLanguage();
  const t = useMemo(() => tipsCopy[lang] ?? tipsCopy.en, [lang]);

  const today = useMemo(() => new Date(), []);
  const sevenDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return date;
  }, []);

  const [period, setPeriod] = useState("weekly");
  const [from, setFrom] = useState(formatDate(sevenDaysAgo));
  const [to, setTo] = useState(formatDate(today));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [report, setReport] = useState<TipsReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [tipForm, setTipForm] = useState<TipFormState | null>(null);
  const [tipActionId, setTipActionId] = useState<string | null>(null);
  const [tipStatus, setTipStatus] = useState<string | null>(null);

  const serverEmployees = useMemo(
    () => employees.filter((employee) => employee.isServer !== false),
    [employees],
  );

  const applyPeriod = (value: string) => {
    if (value === "custom") return;
    const now = new Date();
    const end = new Date(now);
    let start = new Date(now);

    if (value === "weekly") {
      start.setDate(now.getDate() - 6);
    } else if (value === "biweekly") {
      start.setDate(now.getDate() - 13);
    } else if (value === "monthly") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    setFrom(formatDate(start));
    setTo(formatDate(end));
  };

  useEffect(() => {
    const loadEmployees = async () => {
      const response = await fetchEmployeesRequest();
      if (!response.ok) return;
      const data = (await response.json()) as { employees: Employee[] };
      setEmployees(
        (data.employees || []).filter(
          (employee) => employee.isServer !== false,
        ),
      );
    };

    void loadEmployees();
  }, []);

  useEffect(() => {
    applyPeriod(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const runReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("from", from);
      params.set("to", to);
      if (employeeId) {
        params.set("employeeId", employeeId);
      }

      const response = await fetchTipsReportRequest(params);
      if (!response.ok) {
        throw new Error(t.allGood);
      }
      const data = (await response.json()) as TipsReportResponse;
      setReport(data);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const parseApiError = async (response: Response, fallback: string) => {
    const data = await response.json().catch(() => null);
    if (data && typeof data.message === "string") return data.message;
    if (data && typeof data.error === "string") return data.error;
    if (data && Array.isArray(data.message)) return data.message.join(", ");
    return fallback;
  };

  const openCreateForm = () => {
    setTipStatus(null);
    setTipForm({
      mode: "create",
      employeeId: employeeId || serverEmployees[0]?.id || "",
      workDate: to,
      cashTips: "0.00",
      creditCardTips: "0.00",
    });
  };

  const openEditForm = (employee: EmployeeTipReport, day: DayTip) => {
    setTipStatus(null);
    setTipForm({
      mode: "edit",
      tipId: day.id,
      employeeId: employee.id,
      workDate: day.date,
      cashTips: String(day.cashTips.toFixed(2)),
      creditCardTips: String(day.creditCardTips.toFixed(2)),
    });
  };

  const saveTipForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!tipForm) return;

    const payload = {
      employeeId: tipForm.employeeId,
      workDate: tipForm.workDate,
      cashTips: Number(tipForm.cashTips || 0),
      creditCardTips: Number(tipForm.creditCardTips || 0),
    };

    setTipStatus(null);
    setTipActionId(tipForm.tipId || "create");
    try {
      const response =
        tipForm.mode === "create"
          ? await fetch("/api/employee-tips/admin", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch(`/api/employee-tips/admin/${tipForm.tipId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                cashTips: payload.cashTips,
                creditCardTips: payload.creditCardTips,
              }),
            });

      if (!response.ok) {
        throw new Error(
          await parseApiError(response, "Unable to save tip entry."),
        );
      }

      setTipForm(null);
      setTipStatus(
        tipForm.mode === "create" ? "Tip entry created." : "Tip entry updated.",
      );
      await runReport();
    } catch (error) {
      setTipStatus(
        error instanceof Error ? error.message : "Unable to save tip entry.",
      );
    } finally {
      setTipActionId(null);
    }
  };

  const deleteTip = async (employee: EmployeeTipReport, day: DayTip) => {
    const confirmed = window.confirm(
      `Delete tips for ${employee.name} on ${day.date}? This cannot be undone.`,
    );
    if (!confirmed) return;

    setTipStatus(null);
    setTipActionId(day.id);
    try {
      const response = await fetch(`/api/employee-tips/admin/${day.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(
          await parseApiError(response, "Unable to delete tip entry."),
        );
      }
      setTipStatus("Tip entry deleted.");
      await runReport();
    } catch (error) {
      setTipStatus(
        error instanceof Error ? error.message : "Unable to delete tip entry.",
      );
    } finally {
      setTipActionId(null);
    }
  };

  useEffect(() => {
    void runReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="reports-page">
      <div className="admin-header">
        <h1>{t.title}</h1>
      </div>

      <div className="admin-card report-filters">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-3">
            <label className="form-label">{t.period}</label>
            <select
              className="form-select"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            >
              <option value="weekly">{t.weekly}</option>
              <option value="biweekly">{t.biweekly}</option>
              <option value="monthly">{t.monthly}</option>
              <option value="custom">{t.custom}</option>
            </select>
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">{t.from}</label>
            <input
              className="form-control"
              type="date"
              value={from}
              onChange={(event) => {
                setPeriod("custom");
                setFrom(event.target.value);
              }}
            />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">{t.to}</label>
            <input
              className="form-control"
              type="date"
              value={to}
              onChange={(event) => {
                setPeriod("custom");
                setTo(event.target.value);
              }}
            />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">{t.employee}</label>
            <select
              className="form-select"
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
            >
              <option value="">{t.allServers}</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 d-flex gap-2 flex-wrap">
            <button
              className="btn btn-primary"
              onClick={() => void runReport()}
            >
              {loading ? t.running : t.runReport}
            </button>
            <button
              className="btn btn-outline-primary"
              type="button"
              onClick={openCreateForm}
              disabled={serverEmployees.length === 0}
            >
              Add Tip Entry
            </button>
            <a
              className="btn btn-outline-secondary"
              href={`/api/reports/tips/export?${new URLSearchParams({
                from,
                to,
                ...(employeeId ? { employeeId } : {}),
              }).toString()}`}
            >
              {t.downloadPdf}
            </a>
          </div>
        </div>
      </div>

      {tipStatus && <div className="alert alert-info">{tipStatus}</div>}

      {report && report.employees.length === 0 && (
        <div className="admin-card">
          <p className="mb-0">{t.noData}</p>
        </div>
      )}

      {report && report.employees.length > 0 && (
        <div className="report-results">
          {report.employees.map((employee) => (
            <div key={employee.id} className="report-card">
              <div className="report-card-header">
                <div>
                  <div className="report-employee">{employee.name}</div>
                  <div className="report-range">
                    {report.range.from} → {report.range.to}
                  </div>
                </div>
                <div className="report-card-meta">
                  <div className="report-total">
                    <div className="report-total-label">{t.totalTips}</div>
                    <div className="report-total-value">
                      {formatMoney(employee.totalTips, lang)}
                      <span className="report-total-decimal">
                        {t.creditCard}{" "}
                        {formatMoney(employee.totalCreditCardTips, lang)} /{" "}
                        {t.cash} {formatMoney(employee.totalCashTips, lang)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="table-responsive">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>{t.date}</th>
                      <th>{t.cash}</th>
                      <th>{t.creditCard}</th>
                      <th>{t.totalTips}</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employee.days.map((day) => (
                      <tr key={`${employee.id}-${day.date}`}>
                        <td>{day.date}</td>
                        <td>{formatMoney(day.cashTips, lang)}</td>
                        <td>{formatMoney(day.creditCardTips, lang)}</td>
                        <td>{formatMoney(day.totalTips, lang)}</td>
                        <td>
                          <div className="d-flex gap-2 flex-wrap">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              disabled={tipActionId === day.id}
                              onClick={() => openEditForm(employee, day)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              disabled={tipActionId === day.id}
                              onClick={() => void deleteTip(employee, day)}
                            >
                              {tipActionId === day.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {tipForm && (
        <div
          className="embedded-confirm-backdrop"
          onClick={() => {
            if (!tipActionId) setTipForm(null);
          }}
        >
          <form
            className="embedded-confirm-dialog"
            onSubmit={(event) => void saveTipForm(event)}
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="embedded-confirm-title">
              {tipForm.mode === "create" ? "Add Tip Entry" : "Edit Tip Entry"}
            </h2>
            <p className="embedded-confirm-message">
              Create or correct the cash and credit card tips for one server and
              one work date.
            </p>
            <div className="d-flex flex-column gap-3">
              <label className="d-flex flex-column gap-1">
                <span className="fw-semibold">Employee</span>
                <select
                  className="form-select"
                  value={tipForm.employeeId}
                  disabled={tipForm.mode === "edit" || Boolean(tipActionId)}
                  onChange={(event) =>
                    setTipForm((current) =>
                      current
                        ? { ...current, employeeId: event.target.value }
                        : current,
                    )
                  }
                  required
                >
                  <option value="">Select server</option>
                  {serverEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="d-flex flex-column gap-1">
                <span className="fw-semibold">Work Date</span>
                <input
                  className="form-control"
                  type="date"
                  value={tipForm.workDate}
                  disabled={tipForm.mode === "edit" || Boolean(tipActionId)}
                  onChange={(event) =>
                    setTipForm((current) =>
                      current
                        ? { ...current, workDate: event.target.value }
                        : current,
                    )
                  }
                  required
                />
              </label>

              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">Cash Tips</label>
                  <input
                    className="form-control"
                    type="number"
                    min="0"
                    step="0.01"
                    value={tipForm.cashTips}
                    disabled={Boolean(tipActionId)}
                    onChange={(event) =>
                      setTipForm((current) =>
                        current
                          ? { ...current, cashTips: event.target.value }
                          : current,
                      )
                    }
                    required
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Credit Card Tips</label>
                  <input
                    className="form-control"
                    type="number"
                    min="0"
                    step="0.01"
                    value={tipForm.creditCardTips}
                    disabled={Boolean(tipActionId)}
                    onChange={(event) =>
                      setTipForm((current) =>
                        current
                          ? { ...current, creditCardTips: event.target.value }
                          : current,
                      )
                    }
                    required
                  />
                </div>
              </div>
            </div>
            <div className="embedded-confirm-actions">
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={Boolean(tipActionId)}
                onClick={() => setTipForm(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={Boolean(tipActionId)}
              >
                {tipActionId ? "Saving..." : "Save Tip Entry"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
