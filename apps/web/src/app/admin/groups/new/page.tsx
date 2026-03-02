"use client";

import { useEffect, useState } from "react";
import {
  useUiCopy,
  useUiLanguage,
  type UiLang,
} from "../../../../lib/ui-language";
import {
  createGroup,
  listOffices,
  type Office,
} from "../../../../lib/api/groups";

const copy: Record<UiLang, Record<string, string>> = {
  en: {
    title: "Create New Group",
    created: "Group created successfully.",
    createFailed: "Unable to create group.",
    groupName: "Group Name",
    location: "Location",
    selectLocation: "Select location",
    createGroup: "Create Group",
    cancel: "Cancel",
  },
  es: {
    title: "Crear Nuevo Grupo",
    created: "Grupo creado correctamente.",
    createFailed: "No se pudo crear el grupo.",
    groupName: "Nombre del Grupo",
    location: "Ubicación",
    selectLocation: "Seleccionar ubicación",
    createGroup: "Crear Grupo",
    cancel: "Cancelar",
  },
};

export default function CreateGroup() {
  const lang = useUiLanguage();
  const t = useUiCopy(copy, lang);
  const [name, setName] = useState("");
  const [officeId, setOfficeId] = useState("");
  const [offices, setOffices] = useState<Office[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await listOffices();
        setOffices(data);
      } catch {
        // Keep current behavior: silently ignore failed loads.
      }
    };
    load();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    try {
      await createGroup({ name, officeId: officeId || undefined });
      setStatus(t.created);
      setName("");
      setOfficeId("");
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
        <form onSubmit={submit} className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label">{t.groupName}</label>
            <input
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">{t.location}</label>
            <select
              className="form-select"
              value={officeId}
              onChange={(e) => setOfficeId(e.target.value)}
            >
              <option value="">{t.selectLocation}</option>
              {offices.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 d-flex gap-2">
            <button className="btn btn-primary" type="submit">
              {t.createGroup}
            </button>
            <a className="btn btn-outline-secondary" href="/admin/groups">
              {t.cancel}
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
