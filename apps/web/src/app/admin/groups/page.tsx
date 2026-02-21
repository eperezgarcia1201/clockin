"use client";

import { useEffect, useState } from "react";

type Group = { id: string; name: string; officeId?: string | null };
type Office = { id: string; name: string };

export default function GroupSummary() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [officeMap, setOfficeMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/groups", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { groups: Group[] };
      setGroups(data.groups || []);
    };
    load();
  }, []);

  useEffect(() => {
    const loadOffices = async () => {
      const response = await fetch("/api/offices");
      if (!response.ok) return;
      const data = (await response.json()) as { offices: Office[] };
      const map: Record<string, string> = {};
      data.offices?.forEach((office) => {
        map[office.id] = office.name;
      });
      setOfficeMap(map);
    };
    loadOffices();
  }, []);

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>Group Summary</h1>
        <div className="admin-actions">
          <a className="btn btn-primary" href="/admin/groups/new">
            Create New Group
          </a>
        </div>
      </div>

      <div className="admin-card">
        <table className="table table-striped mb-0">
          <thead>
            <tr>
              <th>#</th>
              <th>Group Name</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group, index) => (
              <tr key={group.id}>
                <td>{index + 1}</td>
                <td>{group.name}</td>
                <td>
                  {group.officeId ? officeMap[group.officeId] || "—" : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
