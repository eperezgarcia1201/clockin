"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Employee = { id: string; name: string };

type ScheduleDay = {
  weekday: number;
  label: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
};

type TodayScheduleRow = {
  employeeId: string;
  employeeName: string;
  startTime: string;
  endTime: string;
  isServer: boolean;
  officeId?: string | null;
  officeName?: string | null;
  groupId?: string | null;
  groupName?: string | null;
  roleLabel: string;
};

type TodayScheduleResponse = {
  date: string;
  weekday: number;
  weekdayLabel: string;
  timezone: string;
  rows: TodayScheduleRow[];
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

const formatTimeLabel = (value: string) => {
  if (!/^\d{2}:\d{2}$/.test(value)) return value || "";
  const [hoursText, minutesText] = value.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2000, 0, 1, hours, minutes));
};

const formatShiftLabel = (startTime: string, endTime: string) => {
  if (startTime && endTime) {
    return `${formatTimeLabel(startTime)} - ${formatTimeLabel(endTime)}`;
  }
  if (startTime) {
    return `Starts ${formatTimeLabel(startTime)}`;
  }
  if (endTime) {
    return `Ends ${formatTimeLabel(endTime)}`;
  }
  return "Any time";
};

const formatDateLabel = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map((part) => Number(part));
  if (!year || !month || !day) {
    return dateKey;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
};

export default function ManageSchedules() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [days, setDays] = useState<ScheduleDay[]>(buildDefaultDays());
  const [status, setStatus] = useState<string | null>(null);
  const [todaySchedule, setTodaySchedule] = useState<TodayScheduleResponse | null>(
    null,
  );
  const [todayStatus, setTodayStatus] = useState<string | null>(null);
  const [selectedRoleTab, setSelectedRoleTab] = useState("All");

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId) || null,
    [employees, selectedEmployeeId],
  );

  const loadTodaySchedule = useCallback(async () => {
    setTodayStatus(null);
    try {
      const response = await fetch(`${apiBase}/employee-schedules/today`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        const message =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : undefined;
        setTodayStatus(message || "Unable to load today's schedule.");
        setTodaySchedule(null);
        return;
      }

      const parsed =
        payload && typeof payload === "object"
          ? (payload as Partial<TodayScheduleResponse>)
          : {};
      const rows = Array.isArray(parsed.rows)
        ? (parsed.rows as TodayScheduleRow[])
        : [];
      setTodaySchedule({
        date: parsed.date || "",
        weekday: typeof parsed.weekday === "number" ? parsed.weekday : 0,
        weekdayLabel: parsed.weekdayLabel || "",
        timezone: parsed.timezone || "UTC",
        rows,
      });
    } catch {
      setTodayStatus("Failed to fetch today's schedule.");
      setTodaySchedule(null);
    }
  }, []);

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
    const timer = window.setTimeout(() => {
      void loadTodaySchedule();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadTodaySchedule]);

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

  const roleTabs = useMemo(() => {
    const labels = new Set<string>();
    (todaySchedule?.rows || []).forEach((row) => {
      const label = row.roleLabel.trim() || "Unassigned";
      labels.add(label);
    });
    return ["All", ...Array.from(labels).sort((a, b) => a.localeCompare(b))];
  }, [todaySchedule]);

  const activeRoleTab = roleTabs.includes(selectedRoleTab)
    ? selectedRoleTab
    : "All";

  const filteredTodayRows = useMemo(() => {
    const rows = todaySchedule?.rows || [];
    if (activeRoleTab === "All") {
      return rows;
    }
    return rows.filter((row) => row.roleLabel === activeRoleTab);
  }, [activeRoleTab, todaySchedule]);

  const todayLabel = useMemo(() => {
    if (!todaySchedule) {
      return "Who should work today, filtered by role.";
    }
    const dateLabel = todaySchedule.date
      ? formatDateLabel(todaySchedule.date)
      : "Today";
    const weekdayLabel = todaySchedule.weekdayLabel || "Today";
    const timezoneLabel = todaySchedule.timezone
      ? ` (${todaySchedule.timezone})`
      : "";
    return `${weekdayLabel}, ${dateLabel}${timezoneLabel}`;
  }, [todaySchedule]);

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
    try {
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
        void loadTodaySchedule();
      } else {
        const data = await response.json().catch(() => ({}));
        setStatus(data?.error || "Unable to save schedule.");
      }
    } catch {
      setStatus("Unable to save schedule.");
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>Manage Schedules</h1>
        <p className="text-muted">
          Review who should work today by role, then edit weekly schedules for each
          employee.
        </p>
      </div>

      <div className="admin-card">
        <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
          <div>
            <h2 className="h5 mb-1">Today&apos;s Team</h2>
            <p className="text-muted mb-0">{todayLabel}</p>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => {
              void loadTodaySchedule();
            }}
          >
            Refresh
          </button>
        </div>

        {todayStatus && <div className="alert alert-info mt-3 mb-0">{todayStatus}</div>}

        {!todayStatus && (
          <>
            <div
              className="btn-group mt-3 flex-wrap"
              role="group"
              aria-label="Role filters"
            >
              {roleTabs.map((role) => (
                <button
                  key={role}
                    type="button"
                    className={`btn btn-sm ${
                    activeRoleTab === role
                      ? "btn-primary"
                      : "btn-outline-primary"
                  }`}
                  onClick={() => setSelectedRoleTab(role)}
                >
                  {role}
                </button>
              ))}
            </div>

            {filteredTodayRows.length === 0 ? (
              <p className="text-muted mt-3 mb-0">
                No employees are scheduled for this role today.
              </p>
            ) : (
              <div className="table-responsive mt-3">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Role</th>
                      <th>Shift</th>
                      <th>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTodayRows.map((row) => (
                      <tr key={row.employeeId}>
                        <td className="fw-semibold">{row.employeeName}</td>
                        <td>{row.roleLabel}</td>
                        <td>{formatShiftLabel(row.startTime, row.endTime)}</td>
                        <td>{row.officeName || "All locations"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
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
              {employees.length === 0 && <option value="">No employees found</option>}
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-lg-6 text-lg-end">
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!selectedEmployee}
            >
              Save Schedule
            </button>
          </div>
        </div>

        {selectedEmployee && (
          <div className="mt-4">
            <h2 className="h5 mb-3">Weekly Schedule Editor</h2>
            <p className="text-muted">
              Employees can only clock in on days enabled in their schedule. Disable
              a day to block punch-ins.
            </p>
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
      {!selectedEmployee && (
        <p className="text-muted mb-0">
          Add at least one employee to configure weekly schedules.
        </p>
      )}
    </div>
  );
}
