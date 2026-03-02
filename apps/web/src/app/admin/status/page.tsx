"use client";

import { useEffect, useState } from "react";
import {
  useUiCopy,
  useUiLanguage,
  type UiLang,
} from "../../../lib/ui-language";
import { listStatuses, type Status } from "../../../lib/api/statuses";

const copy: Record<UiLang, Record<string, string>> = {
  en: {
    title: "Status Summary",
    createStatus: "Create Status",
    status: "Status",
    color: "Color",
    countsAsIn: "In?",
    yes: "Yes",
  },
  es: {
    title: "Resumen de Estatus",
    createStatus: "Crear Estatus",
    status: "Estatus",
    color: "Color",
    countsAsIn: "¿Cuenta como Entrada?",
    yes: "Sí",
  },
};

export default function StatusSummary() {
  const lang = useUiLanguage();
  const t = useUiCopy(copy, lang);
  const [statuses, setStatuses] = useState<Status[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await listStatuses();
        setStatuses(data);
      } catch {
        // Keep current behavior: silently ignore failed loads.
      }
    };
    void load();
  }, []);

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>{t.title}</h1>
        <div className="admin-actions">
          <a className="btn btn-primary" href="/admin/status/new">
            {t.createStatus}
          </a>
        </div>
      </div>

      <div className="admin-card">
        <table className="table table-striped mb-0">
          <thead>
            <tr>
              <th>#</th>
              <th>{t.status}</th>
              <th>{t.color}</th>
              <th>{t.countsAsIn}</th>
            </tr>
          </thead>
          <tbody>
            {statuses.map((status, index) => (
              <tr key={status.id}>
                <td>{index + 1}</td>
                <td>{status.label}</td>
                <td>
                  <span
                    style={{
                      display: "inline-block",
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      background: status.color,
                      marginRight: 8,
                    }}
                  />
                  {status.color}
                </td>
                <td>{status.isIn ? t.yes : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
