"use client";

import { useEffect, useState } from "react";
import {
  useUiCopy,
  useUiLanguage,
  type UiLang,
} from "../../../lib/ui-language";
import { getAccessMe } from "../../../lib/api/access";
import { listOffices, type Office } from "../../../lib/api/offices";

const copy: Record<UiLang, Record<string, string>> = {
  en: {
    title: "Location Summary",
    createLocation: "Create New Location",
    disabledAlert:
      "Multi-location mode is disabled. This tenant can operate with one location.",
    locationName: "Location Name",
  },
  es: {
    title: "Resumen de Ubicaciones",
    createLocation: "Crear Nueva Ubicación",
    disabledAlert:
      "El modo multi-ubicación está desactivado. Este tenant puede operar con una sola ubicación.",
    locationName: "Nombre de Ubicación",
  },
};

export default function OfficeSummary() {
  const lang = useUiLanguage();
  const t = useUiCopy(copy, lang);
  const [offices, setOffices] = useState<Office[]>([]);
  const [multiLocationEnabled, setMultiLocationEnabled] = useState(false);

  useEffect(() => {
    const load = async () => {
      const locationsTask = listOffices()
        .then((offices) => {
          setOffices(offices);
        })
        .catch(() => {
          // Keep current behavior: silently ignore failed loads.
        });

      const accessTask = getAccessMe()
        .then((access) => {
          setMultiLocationEnabled(Boolean(access.multiLocationEnabled));
        })
        .catch(() => {
          // Keep current behavior: silently ignore failed loads.
        });

      await Promise.all([locationsTask, accessTask]);
    };
    void load();
  }, []);

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
        {!multiLocationEnabled && (
          <div className="alert alert-secondary">{t.disabledAlert}</div>
        )}
        <table className="table table-striped mb-0">
          <thead>
            <tr>
              <th>#</th>
              <th>{t.locationName}</th>
            </tr>
          </thead>
          <tbody>
            {offices.map((office, index) => (
              <tr key={office.id}>
                <td>{index + 1}</td>
                <td>{office.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
