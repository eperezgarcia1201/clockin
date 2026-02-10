"use client";

import { useEffect, useState } from "react";

type Office = { id: string; name: string };

export default function OfficeSummary() {
  const [offices, setOffices] = useState<Office[]>([]);

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/offices", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { offices: Office[] };
      setOffices(data.offices || []);
    };
    load();
  }, []);

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>Office Summary</h1>
        <div className="admin-actions">
          <a className="btn btn-primary" href="/admin/offices/new">
            Create New Office
          </a>
        </div>
      </div>

      <div className="admin-card">
        <table className="table table-striped mb-0">
          <thead>
            <tr>
              <th>#</th>
              <th>Office Name</th>
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
