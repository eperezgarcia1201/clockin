"use client";

import { useEffect, useMemo, useState } from "react";

type Employee = { id: string; name: string };

type AuditRecord = {
  id: string;
  employeeName: string;
  office: string | null;
  group: string | null;
  type: string;
  occurredAt: string;
  notes: string;
};

type AuditResponse = {
  records: AuditRecord[];
};

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

export default function AuditReport() {
  const today = useMemo(() => new Date(), []);
  const sevenDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return date;
  }, []);

  const [period, setPeriod] = useState("weekly");
  const [from, setFrom] = useState(formatDate(sevenDaysAgo));
  const [to, setTo] = useState(formatDate(today));
  const [limit, setLimit] = useState("200");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState("");
  const [report, setReport] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [tzOffset, setTzOffset] = useState(0);

  useEffect(() => {
    setTzOffset(-new Date().getTimezoneOffset());
  }, []);

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
      const response = await fetch("/api/employees", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { employees: Employee[] };
      setEmployees(data.employees || []);
    };

    loadEmployees();
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
      params.set("limit", limit);
      params.set("tzOffset", String(tzOffset));
      if (employeeId) {
        params.set("employeeId", employeeId);
      }
      if (type) {
        params.set("type", type);
      }

      const response = await fetch(`/api/reports/audit?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Unable to load report");
      }
      const data = (await response.json()) as AuditResponse;
      setReport(data);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="reports-page">
      <div className="admin-header">
        <h1>Audit Log</h1>
      </div>

      <div className="admin-card report-filters">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-3">
            <label className="form-label">Period</label>
            <select
              className="form-select"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">From</label>
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
            <label className="form-label">To</label>
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
            <label className="form-label">Employee</label>
            <select
              className="form-select"
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
            >
              <option value="">All Employees</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">Type</label>
            <select
              className="form-select"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="">All Types</option>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
              <option value="BREAK">BREAK</option>
              <option value="LUNCH">LUNCH</option>
            </select>
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">Limit</label>
            <input
              className="form-control"
              type="number"
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              min={10}
              max={1000}
            />
          </div>
          <div className="col-12 d-flex gap-2 flex-wrap">
            <button className="btn btn-primary" onClick={runReport}>
              {loading ? "Running..." : "Run Report"}
            </button>
            <a
              className="btn btn-outline-secondary"
              href={`/api/reports/audit/export?${new URLSearchParams({
                from,
                to,
                limit,
                tzOffset: String(tzOffset),
                ...(employeeId ? { employeeId } : {}),
                ...(type ? { type } : {}),
              }).toString()}`}
            >
              Export Excel
            </a>
          </div>
        </div>
      </div>

      {report && report.records.length === 0 && (
        <div className="admin-card">
          <p className="mb-0">No audit records found.</p>
        </div>
      )}

      {report && report.records.length > 0 && (
        <div className="report-card">
          <div className="report-card-header">
            <div>
              <div className="report-employee">Audit Log Results</div>
              <div className="report-range">
                {from} → {to}
              </div>
            </div>
            <div className="report-card-meta">
              <div className="report-total">
                <div className="report-total-label">Records</div>
                <div className="report-total-value">
                  {report.records.length}
                </div>
              </div>
            </div>
          </div>
          <div className="table-responsive">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Date &amp; Time</th>
                  <th>Office</th>
                  <th>Group</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {report.records.map((record) => (
                  <tr key={record.id}>
                    <td>{record.employeeName}</td>
                    <td>{record.type}</td>
                    <td>{new Date(record.occurredAt).toLocaleString()}</td>
                    <td>{record.office || "—"}</td>
                    <td>{record.group || "—"}</td>
                    <td>{record.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
