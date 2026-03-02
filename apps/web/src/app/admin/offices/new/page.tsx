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
      const created = await createOffice({ name });
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
