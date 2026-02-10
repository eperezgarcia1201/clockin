"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type Employee = {
  id: string;
  name: string;
};

type PunchRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  office: string | null;
  group: string | null;
  type: string;
  occurredAt: string;
  notes: string;
};

const apiBase = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "");

const toLocalInput = (value: string) => {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

export default function TimeAdmin() {
  const searchParams = useSearchParams();
  const initializedRef = useRef(false);
  const returnToParam = searchParams.get("returnTo");
  const returnTo =
    returnToParam && returnToParam.startsWith("/")
      ? returnToParam
      : "/admin/users";
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<PunchRecord[]>([]);
  const [allowManual, setAllowManual] = useState(true);
  const [employeeId, setEmployeeId] = useState("");
  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [type, setType] = useState("IN");
  const [occurredAt, setOccurredAt] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const tzOffset = useMemo(() => -new Date().getTimezoneOffset(), []);

  const loadRecords = async (
    filterId = "",
    from = filterFrom,
    to = filterTo,
  ) => {
    const query = new URLSearchParams();
    query.set("limit", "50");
    if (filterId) query.set("employeeId", filterId);
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    query.set("tzOffset", String(tzOffset));
    const response = await fetch(
      `${apiBase}/employee-punches/records?${query.toString()}`,
      { cache: "no-store" },
    );
    if (!response.ok) return;
    const data = (await response.json()) as { records: PunchRecord[] };
    setRecords(data.records || []);
  };

  useEffect(() => {
    if (initializedRef.current) return;
    const id = searchParams.get("employeeId") || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    if (id) {
      setEmployeeId(id);
      setFilterEmployeeId(id);
    }
    if (from) {
      setFilterFrom(from);
    }
    if (to) {
      setFilterTo(to);
    }
    initializedRef.current = true;
  }, [searchParams]);

  useEffect(() => {
    const loadEmployees = async () => {
      const response = await fetch(`${apiBase}/employees`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as {
        employees: { id: string; name: string }[];
      };
      setEmployees(data.employees || []);
    };

    const loadSettings = async () => {
      const response = await fetch(`${apiBase}/settings`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as { allowManualTimeEdits?: boolean };
      if (typeof data.allowManualTimeEdits === "boolean") {
        setAllowManual(data.allowManualTimeEdits);
      }
    };

    loadEmployees();
    loadSettings();
    loadRecords();
  }, []);

  useEffect(() => {
    loadRecords(filterEmployeeId);
  }, [filterEmployeeId, filterFrom, filterTo]);

  const resetForm = () => {
    setEmployeeId("");
    setType("IN");
    setOccurredAt("");
    setNotes("");
    setEditingId(null);
  };

  const saveEntry = async (afterSave: boolean) => {
    setStatus(null);

    if (!employeeId) {
      setStatus("Please select an employee.");
      return false;
    }

    const payload = {
      employeeId,
      type,
      occurredAt: new Date(occurredAt).toISOString(),
      notes: notes || undefined,
    };

    const response = await fetch(
      editingId
        ? `${apiBase}/employee-punches/records/${editingId}`
        : `${apiBase}/employee-punches/records`,
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (response.ok) {
      setStatus(editingId ? "Time updated." : "Time entry added.");
      resetForm();
      loadRecords(filterEmployeeId);
      if (afterSave && returnTo) {
        window.location.href = returnTo;
      }
      return true;
    } else {
      const data = await response.json().catch(() => ({}));
      setStatus(data?.error || "Unable to save time entry.");
      return false;
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await saveEntry(false);
  };

  const handleEdit = (record: PunchRecord) => {
    setEditingId(record.id);
    setEmployeeId(record.employeeId);
    setType(record.type);
    setOccurredAt(toLocalInput(record.occurredAt));
    setNotes(record.notes || "");
    setStatus("Editing time entry. Update fields and click Save Changes.");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleDelete = async (id: string) => {
    const ok = confirm("Delete this time entry?");
    if (!ok) return;
    const response = await fetch(
      `${apiBase}/employee-punches/records/${id}`,
      {
      method: "DELETE",
      },
    );
    if (response.ok) {
      setStatus("Time entry deleted.");
      loadRecords(filterEmployeeId);
    } else {
      const data = await response.json().catch(() => ({}));
      setStatus(data?.error || "Unable to delete time entry.");
    }
  };

  const canSave = useMemo(
    () => Boolean(employeeId && occurredAt),
    [employeeId, occurredAt],
  );

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>Add / Edit / Delete Time</h1>
        <div className="admin-actions">
          <a className="btn btn-outline-secondary" href={returnTo}>
            Back
          </a>
        </div>
      </div>

      <div className="admin-card">
        {!allowManual && (
          <div className="alert alert-warning">
            Manual time edits are disabled in System Settings.
          </div>
        )}
        {status && <div className="alert alert-info">{status}</div>}
        <form onSubmit={handleSubmit} className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label">Employee</label>
            <select
              className="form-select"
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              required
              disabled={!allowManual}
            >
              <option value="">Select employee</option>
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
              disabled={!allowManual}
            >
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
              <option value="BREAK">BREAK</option>
              <option value="LUNCH">LUNCH</option>
            </select>
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">Date & Time</label>
            <input
              className="form-control"
              type="datetime-local"
              value={occurredAt}
              onChange={(event) => setOccurredAt(event.target.value)}
              required
              disabled={!allowManual}
            />
          </div>
          <div className="col-12">
            <label className="form-label">Notes</label>
            <input
              className="form-control"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={!allowManual}
            />
          </div>
          <div className="col-12 d-flex gap-2">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={!canSave || !allowManual}
            >
              {editingId ? "Save Changes" : "Add Entry"}
            </button>
            <button
              className="btn btn-outline-secondary"
              type="button"
              disabled={!canSave || !allowManual}
              onClick={() => saveEntry(true)}
            >
              Save &amp; Back
            </button>
            {editingId && (
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={resetForm}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="admin-card">
        <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
          <h2 className="h5 mb-0">Recent Time Entries</h2>
          <div className="d-flex align-items-center gap-2">
            <label className="form-label mb-0">Filter</label>
            <select
              className="form-select"
              value={filterEmployeeId}
              onChange={(event) => setFilterEmployeeId(event.target.value)}
            >
              <option value="">All Employees</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="row g-3 align-items-end mb-3">
          <div className="col-12 col-md-3">
            <label className="form-label">From</label>
            <input
              className="form-control"
              type="date"
              value={filterFrom}
              onChange={(event) => setFilterFrom(event.target.value)}
            />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">To</label>
            <input
              className="form-control"
              type="date"
              value={filterTo}
              onChange={(event) => setFilterTo(event.target.value)}
            />
          </div>
          <div className="col-12 col-md-6 d-flex gap-2 flex-wrap">
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={() => {
                setFilterFrom("");
                setFilterTo("");
              }}
            >
              Clear dates
            </button>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-striped align-middle mb-0">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Date</th>
                <th>Office</th>
                <th>Group</th>
                <th>Notes</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>{record.employeeName}</td>
                  <td>{record.type}</td>
                  <td>
                    {new Date(record.occurredAt).toLocaleString()}
                  </td>
                  <td>{record.office || "—"}</td>
                  <td>{record.group || "—"}</td>
                  <td>{record.notes || "—"}</td>
                  <td>
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleEdit(record)}
                        disabled={!allowManual}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(record.id)}
                        disabled={!allowManual}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    No time entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
