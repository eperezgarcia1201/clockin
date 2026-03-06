"use client";

import { useCallback, useEffect, useState } from "react";
import {
  useUiCopy,
  useUiLanguage,
  type UiLang,
} from "../../../lib/ui-language";
import { getAccessMe } from "../../../lib/api/access";
import {
  deleteOffice,
  listOffices,
  updateOffice,
  type Office,
} from "../../../lib/api/offices";

const copy: Record<UiLang, Record<string, string>> = {
  en: {
    title: "Location Summary",
    createLocation: "Create New Location",
    disabledAlert:
      "Multi-location mode is disabled. This tenant can operate with one location.",
    locationName: "Location Name",
    latitude: "Latitude",
    longitude: "Longitude",
    radius: "Radius (m)",
    actions: "Actions",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    updateSuccess: "Location updated.",
    deleteSuccess: "Location deleted.",
    updateFailed: "Unable to update location.",
    deleteFailed: "Unable to delete location.",
    loadFailed: "Unable to load locations.",
    confirmDelete: "Delete this location?",
    locationNameRequired: "Location name is required.",
    coordinatesTogether:
      "Latitude and longitude must be provided together or both left empty.",
    invalidLatitude: "Latitude must be a valid number.",
    invalidLongitude: "Longitude must be a valid number.",
    invalidRadius: "Radius must be a valid positive number.",
    empty: "—",
    noLocations: "No locations found.",
    cannotDeleteLast: "You must keep at least one location for this tenant.",
  },
  es: {
    title: "Resumen de Ubicaciones",
    createLocation: "Crear Nueva Ubicación",
    disabledAlert:
      "El modo multi-ubicación está desactivado. Este tenant puede operar con una sola ubicación.",
    locationName: "Nombre de Ubicación",
    latitude: "Latitud",
    longitude: "Longitud",
    radius: "Radio (m)",
    actions: "Acciones",
    edit: "Editar",
    delete: "Eliminar",
    save: "Guardar",
    cancel: "Cancelar",
    updateSuccess: "Ubicación actualizada.",
    deleteSuccess: "Ubicación eliminada.",
    updateFailed: "No se pudo actualizar la ubicación.",
    deleteFailed: "No se pudo eliminar la ubicación.",
    loadFailed: "No se pudieron cargar las ubicaciones.",
    confirmDelete: "¿Eliminar esta ubicación?",
    locationNameRequired: "El nombre de la ubicación es obligatorio.",
    coordinatesTogether:
      "La latitud y la longitud deben enviarse juntas o dejarse vacías.",
    invalidLatitude: "La latitud debe ser un número válido.",
    invalidLongitude: "La longitud debe ser un número válido.",
    invalidRadius: "El radio debe ser un número positivo válido.",
    empty: "—",
    noLocations: "No se encontraron ubicaciones.",
    cannotDeleteLast:
      "Debes mantener al menos una ubicación para este tenant.",
  },
};

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function formatOptionalNumber(value?: number | null) {
  return value === null || value === undefined ? "" : String(value);
}

export default function OfficeSummary() {
  const lang = useUiLanguage();
  const t = useUiCopy(copy, lang);
  const [offices, setOffices] = useState<Office[]>([]);
  const [multiLocationEnabled, setMultiLocationEnabled] = useState(false);
  const [editingOfficeId, setEditingOfficeId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftLatitude, setDraftLatitude] = useState("");
  const [draftLongitude, setDraftLongitude] = useState("");
  const [draftRadius, setDraftRadius] = useState("");
  const [savingOfficeId, setSavingOfficeId] = useState<string | null>(null);
  const [deletingOfficeId, setDeletingOfficeId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const loadOffices = useCallback(async () => {
    try {
      const data = await listOffices();
      setOffices(data);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t.loadFailed);
    }
  }, [t.loadFailed]);

  useEffect(() => {
    void loadOffices();
  }, [loadOffices]);

  useEffect(() => {
    const loadAccess = async () => {
      try {
        const access = await getAccessMe();
        setMultiLocationEnabled(Boolean(access.multiLocationEnabled));
      } catch {
        // Keep current behavior: ignore access load failures.
      }
    };

    void loadAccess();
  }, []);

  const startEditing = (office: Office) => {
    setStatus(null);
    setEditingOfficeId(office.id);
    setDraftName(office.name);
    setDraftLatitude(formatOptionalNumber(office.latitude));
    setDraftLongitude(formatOptionalNumber(office.longitude));
    setDraftRadius(formatOptionalNumber(office.geofenceRadiusMeters));
  };

  const cancelEditing = () => {
    setEditingOfficeId(null);
    setDraftName("");
    setDraftLatitude("");
    setDraftLongitude("");
    setDraftRadius("");
  };

  const saveEdit = async () => {
    if (!editingOfficeId) {
      return;
    }

    const name = draftName.trim();
    if (!name) {
      setStatus(t.locationNameRequired);
      return;
    }

    const latitude = parseOptionalNumber(draftLatitude);
    const longitude = parseOptionalNumber(draftLongitude);
    const radius = parseOptionalNumber(draftRadius);

    if (Number.isNaN(latitude)) {
      setStatus(t.invalidLatitude);
      return;
    }
    if (Number.isNaN(longitude)) {
      setStatus(t.invalidLongitude);
      return;
    }
    if (Number.isNaN(radius) || (radius !== null && radius < 0)) {
      setStatus(t.invalidRadius);
      return;
    }
    if ((latitude === null) !== (longitude === null)) {
      setStatus(t.coordinatesTogether);
      return;
    }

    setSavingOfficeId(editingOfficeId);
    setStatus(null);
    try {
      await updateOffice(editingOfficeId, {
        name,
        latitude,
        longitude,
        geofenceRadiusMeters:
          latitude === null && longitude === null
            ? null
            : radius === null
              ? null
              : Math.round(radius),
      });
      setStatus(t.updateSuccess);
      cancelEditing();
      await loadOffices();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t.updateFailed);
    } finally {
      setSavingOfficeId(null);
    }
  };

  const removeOffice = async (officeId: string) => {
    if (offices.length <= 1) {
      setStatus(t.cannotDeleteLast);
      return;
    }
    if (!window.confirm(t.confirmDelete)) {
      return;
    }

    setDeletingOfficeId(officeId);
    setStatus(null);
    try {
      await deleteOffice(officeId);
      if (editingOfficeId === officeId) {
        cancelEditing();
      }
      setStatus(t.deleteSuccess);
      await loadOffices();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t.deleteFailed);
    } finally {
      setDeletingOfficeId(null);
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>{t.title}</h1>
        {multiLocationEnabled && (
          <div className="admin-actions">
            <a className="btn btn-primary" href="/admin/offices/new">
              {t.createLocation}
            </a>
          </div>
        )}
      </div>

      <div className="admin-card">
        {status ? <div className="alert alert-info">{status}</div> : null}
        {!multiLocationEnabled && (
          <div className="alert alert-secondary">{t.disabledAlert}</div>
        )}
        <table className="table table-striped mb-0">
          <thead>
            <tr>
              <th>#</th>
              <th>{t.locationName}</th>
              <th>{t.latitude}</th>
              <th>{t.longitude}</th>
              <th>{t.radius}</th>
              <th>{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {offices.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-muted py-4">
                  {t.noLocations}
                </td>
              </tr>
            ) : (
              offices.map((office, index) => (
                <tr key={office.id}>
                  <td>{index + 1}</td>
                  <td>
                    {editingOfficeId === office.id ? (
                      <input
                        className="form-control form-control-sm"
                        value={draftName}
                        onChange={(event) => setDraftName(event.target.value)}
                      />
                    ) : (
                      office.name
                    )}
                  </td>
                  <td>
                    {editingOfficeId === office.id ? (
                      <input
                        className="form-control form-control-sm"
                        value={draftLatitude}
                        onChange={(event) =>
                          setDraftLatitude(event.target.value)
                        }
                        inputMode="decimal"
                      />
                    ) : office.latitude === null || office.latitude === undefined ? (
                      t.empty
                    ) : (
                      office.latitude
                    )}
                  </td>
                  <td>
                    {editingOfficeId === office.id ? (
                      <input
                        className="form-control form-control-sm"
                        value={draftLongitude}
                        onChange={(event) =>
                          setDraftLongitude(event.target.value)
                        }
                        inputMode="decimal"
                      />
                    ) : office.longitude === null ||
                      office.longitude === undefined ? (
                      t.empty
                    ) : (
                      office.longitude
                    )}
                  </td>
                  <td>
                    {editingOfficeId === office.id ? (
                      <input
                        className="form-control form-control-sm"
                        value={draftRadius}
                        onChange={(event) => setDraftRadius(event.target.value)}
                        inputMode="numeric"
                      />
                    ) : office.geofenceRadiusMeters === null ||
                      office.geofenceRadiusMeters === undefined ? (
                      t.empty
                    ) : (
                      office.geofenceRadiusMeters
                    )}
                  </td>
                  <td>
                    <div className="d-flex gap-2 flex-wrap">
                      {editingOfficeId === office.id ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={saveEdit}
                            disabled={savingOfficeId === office.id}
                          >
                            {t.save}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={cancelEditing}
                            disabled={savingOfficeId === office.id}
                          >
                            {t.cancel}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => startEditing(office)}
                            disabled={deletingOfficeId === office.id}
                          >
                            {t.edit}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeOffice(office.id)}
                            disabled={
                              deletingOfficeId === office.id || offices.length <= 1
                            }
                          >
                            {t.delete}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
