"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatPunchNoteForDisplay } from "../../../lib/punch-note-format";
import { useUiLanguage } from "../../../lib/ui-language";
import {
  createPunchRecord,
  deletePunchRecord,
  getTimeAdminSettings,
  listEmployees,
  listPunchRecords,
  type Employee,
  type PunchRecord,
  updatePunchRecord,
} from "../../../lib/api/time-admin";

const toLocalInput = (value: string) => {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

export default function TimeAdmin() {
  const lang = useUiLanguage();
  const tr = (en: string, es: string) => (lang === "es" ? es : en);
  const searchParams = useSearchParams();
  const initializedRef = useRef(false);
  const lockedEmployeeId = useMemo(() => {
    const candidate = searchParams.get("employeeId") || "";
    return candidate.trim();
  }, [searchParams]);
  const lockedFromContext = Boolean(lockedEmployeeId);
  const returnToParam = searchParams.get("returnTo");
  const fallbackReturnTo = useMemo(() => {
    const from = searchParams.get("from")?.trim();
    const to = searchParams.get("to")?.trim();
    if (from && to) {
      const params = new URLSearchParams({ from, to });
      return `/reports/daily?${params.toString()}`;
    }
    return "/admin/users";
  }, [searchParams]);
  const returnTo =
    returnToParam && returnToParam.startsWith("/")
      ? returnToParam
      : fallbackReturnTo;
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
  const [editingOriginalNotes, setEditingOriginalNotes] = useState<
    string | null
  >(null);
  const [editingDisplayNotes, setEditingDisplayNotes] = useState<string | null>(
    null,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pendingDeleteRecord, setPendingDeleteRecord] =
    useState<PunchRecord | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const tzOffset = useMemo(() => -new Date().getTimezoneOffset(), []);

  const loadRecords = async (
    filterId = "",
    from = filterFrom,
    to = filterTo,
  ) => {
    const scopedFilterId = lockedEmployeeId || filterId;
    try {
      const data = await listPunchRecords({
        employeeId: scopedFilterId || undefined,
        from: from || undefined,
        to: to || undefined,
        tzOffset,
        limit: 50,
      });
      setRecords(data);
    } catch {
      // Keep current behavior: silently ignore failed loads.
    }
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
      try {
        const data = await listEmployees();
        setEmployees(data);
      } catch {
        // Keep current behavior: silently ignore failed loads.
      }
    };

    const loadSettings = async () => {
      try {
        const data = await getTimeAdminSettings();
        if (typeof data.allowManualTimeEdits === "boolean") {
          setAllowManual(data.allowManualTimeEdits);
        }
      } catch {
        // Keep current behavior: silently ignore failed loads.
      }
    };

    void loadEmployees();
    void loadSettings();
    void loadRecords();
  }, []);

  useEffect(() => {
    void loadRecords(lockedEmployeeId || filterEmployeeId);
  }, [filterEmployeeId, filterFrom, filterTo, lockedEmployeeId]);

  const resetForm = () => {
    setEmployeeId("");
    setType("IN");
    setOccurredAt("");
    setNotes("");
    setEditingOriginalNotes(null);
    setEditingDisplayNotes(null);
    setEditingId(null);
  };

  const saveEntry = async (afterSave: boolean) => {
    setStatus(null);

    if (!employeeId) {
      setStatus(tr("Please select an employee.", "Selecciona un empleado."));
      return false;
    }

    const noteToSave =
      editingId &&
      editingOriginalNotes !== null &&
      editingDisplayNotes !== null &&
      notes === editingDisplayNotes
        ? editingOriginalNotes
        : notes;

    try {
      if (editingId) {
        await updatePunchRecord(editingId, {
          type,
          occurredAt: new Date(occurredAt).toISOString(),
          notes: noteToSave || undefined,
        });
      } else {
        await createPunchRecord({
          employeeId,
          type,
          occurredAt: new Date(occurredAt).toISOString(),
          notes: noteToSave || undefined,
        });
      }
      setStatus(
        editingId
          ? tr("Time updated.", "Tiempo actualizado.")
          : tr("Time entry added.", "Entrada de tiempo agregada."),
      );
      resetForm();
      void loadRecords(filterEmployeeId);
      if (afterSave && returnTo) {
        window.location.href = returnTo;
      }
      return true;
    } catch (error) {
      setStatus(
        (error instanceof Error && error.message) ||
          tr(
            "Unable to save time entry.",
            "No se pudo guardar la entrada de tiempo.",
          ),
      );
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
    const originalNotes = record.notes || "";
    const displayNotes = formatPunchNoteForDisplay(originalNotes);
    setNotes(displayNotes);
    setEditingOriginalNotes(originalNotes);
    setEditingDisplayNotes(displayNotes);
    setStatus(
      tr(
        "Editing time entry. Update fields and click Save Changes.",
        "Editando entrada de tiempo. Actualiza los campos y haz clic en Guardar Cambios.",
      ),
    );
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingRecordId(id);
    try {
      await deletePunchRecord(id);
      setStatus(tr("Time entry deleted.", "Entrada de tiempo eliminada."));
      void loadRecords(filterEmployeeId);
    } catch (error) {
      setStatus(
        (error instanceof Error && error.message) ||
          tr(
            "Unable to delete time entry.",
            "No se pudo eliminar la entrada de tiempo.",
          ),
      );
    } finally {
      setDeletingRecordId(null);
    }
  };

  const onConfirmDeleteRecord = async () => {
    if (!pendingDeleteRecord) {
      return;
    }
    await handleDelete(pendingDeleteRecord.id);
    setPendingDeleteRecord(null);
  };

  const pendingDeleteBusy =
    pendingDeleteRecord !== null && deletingRecordId === pendingDeleteRecord.id;

  const canSave = useMemo(
    () => Boolean(employeeId && occurredAt),
    [employeeId, occurredAt],
  );

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>
          {tr("Add / Edit / Delete Time", "Agregar / Editar / Eliminar Tiempo")}
        </h1>
        <div className="admin-actions">
          <a className="btn btn-outline-secondary" href={returnTo}>
            {tr("Back", "Volver")}
          </a>
        </div>
      </div>

      <div className="admin-card">
        {!allowManual && (
          <div className="alert alert-warning">
            {tr(
              "Manual time edits are disabled in System Settings.",
              "Las ediciones manuales de tiempo están desactivadas en Configuración del Sistema.",
            )}
          </div>
        )}
        {status && <div className="alert alert-info">{status}</div>}
        <form onSubmit={handleSubmit} className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label">{tr("Employee", "Empleado")}</label>
            <select
              className="form-select"
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              required
              disabled={!allowManual || lockedFromContext}
            >
              {lockedFromContext && !employeeId && (
                <option value={lockedEmployeeId}>
                  {tr(
                    "Loading selected employee...",
                    "Cargando empleado seleccionado...",
                  )}
                </option>
              )}
              <option value="">
                {tr("Select employee", "Seleccionar empleado")}
              </option>
              {employees
                .filter((employee) =>
                  lockedFromContext ? employee.id === lockedEmployeeId : true,
                )
                .map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
            </select>
            {lockedFromContext && (
              <div className="form-text">
                {tr(
                  "Employee scope is locked from the previous screen.",
                  "El alcance del empleado está bloqueado desde la pantalla anterior.",
                )}
              </div>
            )}
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">{tr("Type", "Tipo")}</label>
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
            <label className="form-label">
              {tr("Date & Time", "Fecha y Hora")}
            </label>
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
            <label className="form-label">{tr("Notes", "Notas")}</label>
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
              {editingId
                ? tr("Save Changes", "Guardar Cambios")
                : tr("Add Entry", "Agregar Entrada")}
            </button>
            <button
              className="btn btn-outline-secondary"
              type="button"
              disabled={!canSave || !allowManual}
              onClick={() => saveEntry(true)}
            >
              {tr("Save & Back", "Guardar y Volver")}
            </button>
            {editingId && (
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={resetForm}
              >
                {tr("Cancel", "Cancelar")}
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="admin-card">
        <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
          <h2 className="h5 mb-0">
            {tr("Recent Time Entries", "Entradas de Tiempo Recientes")}
          </h2>
          <div className="d-flex align-items-center gap-2">
            <label className="form-label mb-0">{tr("Filter", "Filtro")}</label>
            <select
              className="form-select"
              value={lockedEmployeeId || filterEmployeeId}
              onChange={(event) => setFilterEmployeeId(event.target.value)}
              disabled={lockedFromContext}
            >
              {!lockedFromContext && (
                <option value="">
                  {tr("All Employees", "Todos los Empleados")}
                </option>
              )}
              {employees
                .filter((employee) =>
                  lockedFromContext ? employee.id === lockedEmployeeId : true,
                )
                .map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div className="row g-3 align-items-end mb-3">
          <div className="col-12 col-md-3">
            <label className="form-label">{tr("From", "Desde")}</label>
            <input
              className="form-control"
              type="date"
              value={filterFrom}
              onChange={(event) => setFilterFrom(event.target.value)}
            />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">{tr("To", "Hasta")}</label>
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
              {tr("Clear dates", "Limpiar fechas")}
            </button>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-striped align-middle mb-0">
            <thead>
              <tr>
                <th>{tr("Employee", "Empleado")}</th>
                <th>{tr("Type", "Tipo")}</th>
                <th>{tr("Date", "Fecha")}</th>
                <th>{tr("Location", "Ubicación")}</th>
                <th>{tr("Group", "Grupo")}</th>
                <th>{tr("Notes", "Notas")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const rawNotes = record.notes || "";
                const displayNotes = formatPunchNoteForDisplay(rawNotes);
                const noteTitle =
                  rawNotes && rawNotes !== displayNotes ? rawNotes : undefined;

                return (
                  <tr key={record.id}>
                    <td>{record.employeeName}</td>
                    <td>{record.type}</td>
                    <td>{new Date(record.occurredAt).toLocaleString()}</td>
                    <td>{record.office || "—"}</td>
                    <td>{record.group || "—"}</td>
                    <td title={noteTitle}>{displayNotes || "—"}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleEdit(record)}
                          disabled={!allowManual}
                        >
                          {tr("Edit", "Editar")}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setPendingDeleteRecord(record)}
                          disabled={
                            !allowManual || deletingRecordId === record.id
                          }
                        >
                          {deletingRecordId === record.id
                            ? tr("Deleting...", "Eliminando...")
                            : tr("Delete", "Eliminar")}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {records.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    {tr(
                      "No time entries found.",
                      "No se encontraron entradas de tiempo.",
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pendingDeleteRecord && (
        <div
          className="embedded-confirm-backdrop"
          onClick={() => {
            if (!pendingDeleteBusy) {
              setPendingDeleteRecord(null);
            }
          }}
        >
          <div
            className="embedded-confirm-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="embedded-confirm-title">
              {tr("Delete Time Entry", "Eliminar Entrada de Tiempo")}
            </h2>
            <p className="embedded-confirm-message">
              {tr("Delete", "Eliminar")} {pendingDeleteRecord.type}{" "}
              {tr("entry for", "para")} {pendingDeleteRecord.employeeName}{" "}
              {tr("on", "el")}{" "}
              {new Date(pendingDeleteRecord.occurredAt).toLocaleString()}?
            </p>
            <div className="embedded-confirm-actions">
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={pendingDeleteBusy}
                onClick={() => setPendingDeleteRecord(null)}
              >
                {tr("Cancel", "Cancelar")}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={pendingDeleteBusy}
                onClick={() => void onConfirmDeleteRecord()}
              >
                {pendingDeleteBusy
                  ? tr("Deleting...", "Eliminando...")
                  : tr("Confirm Delete", "Confirmar Eliminación")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
