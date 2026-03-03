"use client";

import { useState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useUiCopy,
  useUiLanguage,
  type UiLang,
} from "../../../../lib/ui-language";
import { getAccessMe } from "../../../../lib/api/access";
import { geocodeAddress } from "../../../../lib/api/geocode";
import { createOffice } from "../../../../lib/api/offices";

const copy: Record<UiLang, Record<string, string>> = {
  en: {
    disabledMessage:
      "Multi-location mode is disabled for this tenant. Enable it from owner controls first.",
    created: "Location created successfully.",
    createFailed: "Unable to create location.",
    disabledWarning: "Multi-location mode is disabled for this tenant.",
    title: "Create New Location",
    locationName: "Location Name",
    geofenceAddress: "Geofence Address",
    geofenceLookup: "Auto Detect Geofence",
    geofenceLookuping: "Detecting...",
    geofenceRadius: "Geofence Radius (meters)",
    geofenceFound: "Address detected and geofence coordinates applied.",
    geofenceFailed: "Unable to detect that address.",
    geofenceCoords: "Coordinates",
    createLocation: "Create Location",
    cancel: "Cancel",
  },
  es: {
    disabledMessage:
      "El modo multi-ubicación está desactivado para este tenant. Actívalo primero desde controles de owner.",
    created: "Ubicación creada correctamente.",
    createFailed: "No se pudo crear la ubicación.",
    disabledWarning:
      "El modo multi-ubicación está desactivado para este tenant.",
    title: "Crear Nueva Ubicación",
    locationName: "Nombre de Ubicación",
    geofenceAddress: "Dirección de Geocerca",
    geofenceLookup: "Detectar Geocerca",
    geofenceLookuping: "Detectando...",
    geofenceRadius: "Radio de Geocerca (metros)",
    geofenceFound: "Dirección detectada y geocerca aplicada.",
    geofenceFailed: "No se pudo detectar esa dirección.",
    geofenceCoords: "Coordenadas",
    createLocation: "Crear Ubicación",
    cancel: "Cancelar",
  },
};

export default function CreateOffice() {
  const lang = useUiLanguage();
  const t = useUiCopy(copy, lang);
  const router = useRouter();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [multiLocationEnabled, setMultiLocationEnabled] = useState(false);
  const [geofenceAddress, setGeofenceAddress] = useState("");
  const [geofenceLatitude, setGeofenceLatitude] = useState<number | null>(null);
  const [geofenceLongitude, setGeofenceLongitude] = useState<number | null>(
    null,
  );
  const [geofenceRadius, setGeofenceRadius] = useState("120");
  const [geofenceLoading, setGeofenceLoading] = useState(false);

  useEffect(() => {
    const loadAccess = async () => {
      try {
        const data = await getAccessMe();
        setMultiLocationEnabled(Boolean(data.multiLocationEnabled));
      } catch {
        // ignore
      }
    };
    void loadAccess();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    if (!multiLocationEnabled) {
      setStatus(t.disabledMessage);
      return;
    }
    try {
      const radius = Number(geofenceRadius);
      const hasGeofence =
        geofenceLatitude !== null &&
        geofenceLongitude !== null &&
        Number.isFinite(radius) &&
        radius >= 25 &&
        radius <= 5000;
      const created = await createOffice({
        name,
        latitude: hasGeofence ? geofenceLatitude : null,
        longitude: hasGeofence ? geofenceLongitude : null,
        geofenceRadiusMeters: hasGeofence ? Math.round(radius) : null,
      });
      const createdId = created?.id?.trim();
      if (createdId) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("clockin_active_location_id", createdId);
          sessionStorage.removeItem("clockin_active_location_all");
          document.cookie = `clockin_active_location_id=${encodeURIComponent(createdId)}; path=/`;
        }
        router.push("/admin");
        return;
      }
      setStatus(t.created);
      setName("");
    } catch {
      setStatus(t.createFailed);
    }
  };

  const lookupGeofence = async () => {
    const address = geofenceAddress.trim();
    if (!address) {
      setStatus(t.geofenceFailed);
      return;
    }
    setGeofenceLoading(true);
    setStatus(null);
    try {
      const data = await geocodeAddress(address);
      if (
        !Number.isFinite(data.latitude) ||
        !Number.isFinite(data.longitude)
      ) {
        throw new Error(t.geofenceFailed);
      }
      setGeofenceLatitude(Number(data.latitude));
      setGeofenceLongitude(Number(data.longitude));
      setStatus(t.geofenceFound);
    } catch {
      setStatus(t.geofenceFailed);
    } finally {
      setGeofenceLoading(false);
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>{t.title}</h1>
      </div>

      <div className="admin-card">
        {status && <div className="alert alert-info">{status}</div>}
        {!multiLocationEnabled && (
          <div className="alert alert-warning">{t.disabledWarning}</div>
        )}
        <form onSubmit={submit} className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label">{t.locationName}</label>
            <input
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="col-12 col-md-8">
            <label className="form-label">{t.geofenceAddress}</label>
            <input
              className="form-control"
              value={geofenceAddress}
              onChange={(event) => setGeofenceAddress(event.target.value)}
              placeholder="123 Main St, City, State"
            />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">{t.geofenceRadius}</label>
            <input
              className="form-control"
              value={geofenceRadius}
              onChange={(event) => setGeofenceRadius(event.target.value)}
              inputMode="numeric"
            />
          </div>
          <div className="col-12 d-flex flex-wrap gap-2 align-items-center">
            <button
              className="btn btn-outline-primary"
              type="button"
              onClick={lookupGeofence}
              disabled={geofenceLoading}
            >
              {geofenceLoading ? t.geofenceLookuping : t.geofenceLookup}
            </button>
            {geofenceLatitude !== null && geofenceLongitude !== null && (
              <small className="text-muted">
                {t.geofenceCoords}: {geofenceLatitude.toFixed(6)},{" "}
                {geofenceLongitude.toFixed(6)}
              </small>
            )}
          </div>
          <div className="col-12 d-flex gap-2">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={!multiLocationEnabled}
            >
              {t.createLocation}
            </button>
            <a className="btn btn-outline-secondary" href="/admin/offices">
              {t.cancel}
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
