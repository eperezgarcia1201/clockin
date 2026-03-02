"use client";

import { useEffect, useState } from "react";
import {
  useUiCopy,
  useUiLanguage,
  type UiLang,
} from "../../../../lib/ui-language";
import {
  listEmployees,
  type EmployeeRow,
} from "../../../../lib/api/users-admin";

const copy: Record<UiLang, Record<string, string>> = {
  en: {
    title: "User Search",
    searchByName: "Search by name",
    placeholder: "Start typing a name...",
    name: "Name",
    email: "Email",
    empty: "—",
  },
  es: {
    title: "Búsqueda de Usuarios",
    searchByName: "Buscar por nombre",
    placeholder: "Comienza a escribir un nombre...",
    name: "Nombre",
    email: "Correo",
    empty: "—",
  },
};

export default function UserSearch() {
  const lang = useUiLanguage();
  const t = useUiCopy(copy, lang);
  const [query, setQuery] = useState("");
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await listEmployees();
        setEmployees(data);
      } catch {
        // Keep current behavior: silently ignore failed loads.
      }
    };
    void load();
  }, []);

  const results = employees.filter((employee) =>
    employee.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>{t.title}</h1>
      </div>

      <div className="admin-card">
        <label className="form-label">{t.searchByName}</label>
        <input
          className="form-control"
          placeholder={t.placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="admin-card">
        <div className="table-responsive">
          <table className="table table-striped mb-0">
            <thead>
              <tr>
                <th>{t.name}</th>
                <th>{t.email}</th>
              </tr>
            </thead>
            <tbody>
              {results.map((employee) => (
                <tr key={employee.id}>
                  <td>{employee.name}</td>
                  <td>{employee.email || t.empty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
