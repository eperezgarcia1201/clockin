"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useUiLanguage } from "../../../lib/ui-language";
import {
  getEmployeeSchedule,
  getTodaySchedule,
  listScheduleEmployees,
  type EmployeeOption as Employee,
  type ScheduleDay,
  type TodayScheduleResponse,
  type TodayScheduleRow,
  updateEmployeeSchedule,
} from "../../../lib/api/schedules-admin";

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
    breakMinutes: 0,
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

const normalizeBreakMinutes = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(24 * 60, Math.round(value)));
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
  const lang = useUiLanguage();
  const tr = useCallback(
    (en: string, es: string) => (lang === "es" ? es : en),
    [lang],
  );
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [days, setDays] = useState<ScheduleDay[]>(buildDefaultDays());
  const [status, setStatus] = useState<string | null>(null);
  const [todaySchedule, setTodaySchedule] =
    useState<TodayScheduleResponse | null>(null);
  const [todayStatus, setTodayStatus] = useState<string | null>(null);
  const [selectedRoleTab, setSelectedRoleTab] = useState("All");

  const selectedEmployee = useMemo(
    () =>
      employees.find((employee) => employee.id === selectedEmployeeId) || null,
    [employees, selectedEmployeeId],
  );

  const loadTodaySchedule = useCallback(async () => {
    setTodayStatus(null);
    try {
      const parsed = await getTodaySchedule();
      const rows = Array.isArray(parsed.rows)
        ? (parsed.rows as TodayScheduleRow[])
        : [];
      setTodaySchedule({
        date: parsed.date || "",
        weekday: typeof parsed.weekday === "number" ? parsed.weekday : 0,
        weekdayLabel: parsed.weekdayLabel || "",
        timezone: parsed.timezone || "UTC",
        rows: rows.map((row) => ({
          ...row,
          breakMinutes: normalizeBreakMinutes(row.breakMinutes || 0),
        })),
      });
    } catch {
      setTodayStatus(
        tr(
          "Failed to fetch today's schedule.",
          "Error al obtener el horario de hoy.",
        ),
      );
      setTodaySchedule(null);
    }
  }, [tr]);

  useEffect(() => {
    const load = async () => {
      try {
        const employees = await listScheduleEmployees();
        setEmployees(employees);
        if (employees[0]) {
          setSelectedEmployeeId(employees[0].id);
        }
      } catch {
        setStatus(
          tr("Failed to fetch employees.", "Error al obtener empleados."),
        );
      }
    };
    load();
  }, [tr]);

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
        const days = await getEmployeeSchedule(selectedEmployeeId);
        if (days.length === 7) {
          setDays(
            days.map((day) => ({
              ...day,
              breakMinutes: normalizeBreakMinutes(day.breakMinutes || 0),
            })),
          );
        } else {
          setDays(buildDefaultDays());
        }
      } catch {
        setStatus(
          tr("Failed to fetch schedule.", "Error al obtener el horario."),
        );
        setDays(buildDefaultDays());
      }
    };
    loadSchedule();
  }, [selectedEmployeeId, tr]);

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
      return tr(
        "Who should work today, filtered by role.",
        "Quién debe trabajar hoy, filtrado por rol.",
      );
    }
    const dateLabel = todaySchedule.date
      ? formatDateLabel(todaySchedule.date)
      : tr("Today", "Hoy");
    const weekdayLabel = todaySchedule.weekdayLabel || tr("Today", "Hoy");
    const timezoneLabel = todaySchedule.timezone
      ? ` (${todaySchedule.timezone})`
      : "";
    return `${weekdayLabel}, ${dateLabel}${timezoneLabel}`;
  }, [todaySchedule, tr]);

  const updateDay = (
    weekday: number,
    key: keyof ScheduleDay,
    value: string | number | boolean,
  ) => {
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
        if (key === "breakMinutes") {
          return {
            ...day,
            breakMinutes: normalizeBreakMinutes(Number(value)),
          };
        }
        return { ...day, [key]: value };
      }),
    );
  };

  const handleSave = async () => {
    if (!selectedEmployeeId) {
      setStatus(
        tr("Select an employee first.", "Selecciona primero un empleado."),
      );
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
            breakMinutes: normalizeBreakMinutes(day.breakMinutes),
          };
        });

      await updateEmployeeSchedule(selectedEmployeeId, {
        days: normalizedDays,
      });
      setStatus(tr("Schedule saved.", "Horario guardado."));
      void loadTodaySchedule();
    } catch (error) {
      setStatus(
        (error instanceof Error && error.message) ||
          tr("Unable to save schedule.", "No se pudo guardar el horario."),
      );
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>{tr("Manage Schedules", "Gestionar Horarios")}</h1>
        <p className="text-muted">
          {tr(
            "Review who should work today by role, then edit weekly schedules for each employee.",
            "Revisa quién debe trabajar hoy por rol y luego edita los horarios semanales de cada empleado.",
          )}
        </p>
      </div>

      <div className="admin-card">
        <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
          <div>
            <h2 className="h5 mb-1">{tr("Today's Team", "Equipo de Hoy")}</h2>
            <p className="text-muted mb-0">{todayLabel}</p>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => {
              void loadTodaySchedule();
            }}
          >
            {tr("Refresh", "Actualizar")}
          </button>
        </div>

        {todayStatus && (
          <div className="alert alert-info mt-3 mb-0">{todayStatus}</div>
        )}

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
                {tr(
                  "No employees are scheduled for this role today.",
                  "No hay empleados programados para este rol hoy.",
                )}
              </p>
            ) : (
              <div className="table-responsive mt-3">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>{tr("Employee", "Empleado")}</th>
                      <th>{tr("Role", "Rol")}</th>
                      <th>{tr("Shift", "Turno")}</th>
                      <th>{tr("Location", "Ubicación")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTodayRows.map((row) => (
                      <tr key={row.employeeId}>
                        <td className="fw-semibold">{row.employeeName}</td>
                        <td>{row.roleLabel}</td>
                        <td>{formatShiftLabel(row.startTime, row.endTime)}</td>
                        <td>
                          {row.officeName ||
                            tr("All locations", "Todas las ubicaciones")}
                        </td>
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
            <label className="form-label">{tr("Employee", "Empleado")}</label>
            <select
              className="form-select"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
            >
              {employees.length === 0 && (
                <option value="">
                  {tr("No employees found", "No se encontraron empleados")}
                </option>
              )}
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
              {tr("Save Schedule", "Guardar Horario")}
            </button>
          </div>
        </div>

        {selectedEmployee && (
          <div className="mt-4">
            <h2 className="h5 mb-3">
              {tr("Weekly Schedule Editor", "Editor de Horario Semanal")}
            </h2>
            <p className="text-muted">
              {tr(
                "Employees can only clock in on days enabled in their schedule. Add break minutes to compare paid hours against the schedule at review time.",
                "Los empleados solo pueden marcar entrada en días habilitados en su horario. Agrega minutos de descanso para comparar las horas pagadas contra el horario al revisar.",
              )}
            </p>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>{tr("Day", "Día")}</th>
                    <th>{tr("Enabled", "Habilitado")}</th>
                    <th>{tr("Start", "Inicio")}</th>
                    <th>{tr("End", "Fin")}</th>
                    <th>{tr("Break (min)", "Descanso (min)")}</th>
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
                              updateDay(
                                day.weekday,
                                "enabled",
                                e.target.checked,
                              )
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
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          min={0}
                          max={24 * 60}
                          step={15}
                          value={day.breakMinutes}
                          onChange={(e) =>
                            updateDay(
                              day.weekday,
                              "breakMinutes",
                              normalizeBreakMinutes(Number(e.target.value)),
                            )
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
          {tr(
            "Add at least one employee to configure weekly schedules.",
            "Agrega al menos un empleado para configurar horarios semanales.",
          )}
        </p>
      )}
    </div>
  );
}
