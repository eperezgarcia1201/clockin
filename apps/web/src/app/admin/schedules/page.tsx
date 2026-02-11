"use client";

import { useEffect, useMemo, useState } from "react";

type Employee = { id: string; name: string };

type ScheduleDay = {
  weekday: number;
  label: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
};

const apiBase = "/api";

const weekdayLabels = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const buildDefaultDays = () =>
  weekdayLabels.map((label, weekday) => ({
    weekday,
    label,
    enabled: false,
    startTime: "09:00",
    endTime: "17:00",
  }));

const normalizeTime = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (!match) return trimmed;
  let hours = Number(match[1]);
  const minutes = match[2];
  const meridiem = match[3].toLowerCase();
  if (Number.isNaN(hours)) return trimmed;
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${minutes}`;
};

const sanitizeTime = (value: string) => {
  const normalized = normalizeTime(value);
  return /^\d{2}:\d{2}$/.test(normalized) ? normalized : "";
};

export default function ManageSchedules() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [days, setDays] = useState<ScheduleDay[]>(buildDefaultDays());
  const [status, setStatus] = useState<string | null>(null);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId) || null,
    [employees, selectedEmployeeId],
  );

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`${apiBase}/employees`, { cache: "no-store" });
        if (!response.ok) {
          setStatus("Unable to load employees.");
          return;
        }
        const data = (await response.json()) as { employees: Employee[] };
        setEmployees(data.employees || []);
        if (data.employees?.[0]) {
          setSelectedEmployeeId(data.employees[0].id);
        }
      } catch {
        setStatus("Failed to fetch employees.");
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedEmployeeId) return;
    const loadSchedule = async () => {
      setStatus(null);
      try {
        const response = await fetch(
          `${apiBase}/employee-schedules?employeeId=${selectedEmployeeId}`,
          { cache: "no-store" },
        );
        if (!response.ok) {
          setDays(buildDefaultDays());
          return;
        }
        const data = (await response.json()) as { days?: ScheduleDay[] };
        if (data.days && data.days.length === 7) {
          setDays(data.days);
        } else {
          setDays(buildDefaultDays());
        }
      } catch {
        setStatus("Failed to fetch schedule.");
        setDays(buildDefaultDays());
      }
    };
    loadSchedule();
  }, [selectedEmployeeId]);

  const updateDay = (weekday: number, key: keyof ScheduleDay, value: string | boolean) => {
    setDays((prev) =>
      prev.map((day) => {
        if (day.weekday !== weekday) return day;
        if (key === "enabled") {
          const enabled = Boolean(value);
          if (!enabled) {
            return { ...day, enabled, startTime: "", endTime: "" };
          }
          return {
            ...day,
            enabled,
            startTime: day.startTime || "09:00",
            endTime: day.endTime || "17:00",
          };
        }
        return { ...day, [key]: value };
      }),
    );
  };

  const handleSave = async () => {
    if (!selectedEmployeeId) {
      setStatus("Select an employee first.");
      return;
    }
    setStatus(null);
    const normalizedDays = days
      .filter((day) => day.enabled)
      .map((day) => {
        const startTime = sanitizeTime(day.startTime);
        const endTime = sanitizeTime(day.endTime);
        return {
          weekday: day.weekday,
          enabled: true,
          ...(startTime ? { startTime } : {}),
          ...(endTime ? { endTime } : {}),
        };
      });

    const response = await fetch(
      `${apiBase}/employee-schedules/${selectedEmployeeId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: normalizedDays }),
      },
    );

    if (response.ok) {
      setStatus("Schedule saved.");
    } else {
      const data = await response.json().catch(() => ({}));
      setStatus(data?.error || "Unable to save schedule.");
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>Manage Schedules</h1>
        <p className="text-muted">
          Employees can only clock in on days enabled in their schedule. Disable a
          day to block punch-ins.
        </p>
      </div>

      <div className="admin-card">
        {status && <div className="alert alert-info">{status}</div>}
        <div className="row g-3 align-items-end">
          <div className="col-12 col-lg-6">
            <label className="form-label">Employee</label>
            <select
              className="form-select"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
            >
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-lg-6 text-lg-end">
            <button className="btn btn-primary" onClick={handleSave}>
              Save Schedule
            </button>
          </div>
        </div>

        {selectedEmployee && (
          <div className="mt-4">
            <h2 className="h5 mb-3">Weekly Schedule</h2>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Enabled</th>
                    <th>Start</th>
                    <th>End</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((day) => (
                    <tr key={day.weekday}>
                      <td className="fw-semibold">{day.label}</td>
                      <td>
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={day.enabled}
                            onChange={(e) =>
                              updateDay(day.weekday, "enabled", e.target.checked)
                            }
                          />
                        </div>
                      </td>
                      <td>
                        <input
                          type="time"
                          className="form-control"
                          value={day.startTime}
                          onChange={(e) =>
                            updateDay(day.weekday, "startTime", e.target.value)
                          }
                          disabled={!day.enabled}
                        />
                      </td>
                      <td>
                        <input
                          type="time"
                          className="form-control"
                          value={day.endTime}
                          onChange={(e) =>
                            updateDay(day.weekday, "endTime", e.target.value)
                          }
                          disabled={!day.enabled}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
