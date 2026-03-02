"use client";

import { useEffect, useState } from "react";
import {
  useUiCopy,
  useUiLanguage,
  type UiLang,
} from "../../../lib/ui-language";
import { listGroups, listOffices, type Group } from "../../../lib/api/groups";

const copy: Record<UiLang, Record<string, string>> = {
  en: {
    title: "Group Summary",
    createGroup: "Create New Group",
    groupName: "Group Name",
    location: "Location",
    empty: "—",
  },
  es: {
    title: "Resumen de Grupos",
    createGroup: "Crear Nuevo Grupo",
    groupName: "Nombre del Grupo",
    location: "Ubicación",
    empty: "—",
  },
};

export default function GroupSummary() {
  const lang = useUiLanguage();
  const t = useUiCopy(copy, lang);
  const [groups, setGroups] = useState<Group[]>([]);
  const [officeMap, setOfficeMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const data = await listGroups();
        setGroups(data);
      } catch {
        // Keep current behavior: silently ignore failed loads.
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadOffices = async () => {
      try {
        const offices = await listOffices();
        const map: Record<string, string> = {};
        offices.forEach((office) => {
          map[office.id] = office.name;
        });
        setOfficeMap(map);
      } catch {
        // Keep current behavior: silently ignore failed loads.
      }
    };
    loadOffices();
  }, []);

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>{t.title}</h1>
        <div className="admin-actions">
          <a className="btn btn-primary" href="/admin/groups/new">
            {t.createGroup}
          </a>
        </div>
      </div>

      <div className="admin-card">
        <table className="table table-striped mb-0">
          <thead>
            <tr>
              <th>#</th>
              <th>{t.groupName}</th>
              <th>{t.location}</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group, index) => (
              <tr key={group.id}>
                <td>{index + 1}</td>
                <td>{group.name}</td>
                <td>
                  {group.officeId
                    ? officeMap[group.officeId] || t.empty
                    : t.empty}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
