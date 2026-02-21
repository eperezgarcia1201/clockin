"use client";

import { useEffect, useState } from "react";

type Status = { id: string; label: string; color: string; isIn: boolean };

export default function StatusSummary() {
  const [statuses, setStatuses] = useState<Status[]>([]);

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/statuses", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { statuses: Status[] };
      setStatuses(data.statuses || []);
    };
    load();
  }, []);

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>Status Summary</h1>
        <div className="admin-actions">
          <a className="btn btn-primary" href="/admin/status/new">
            Create Status
          </a>
        </div>
      </div>

      <div className="admin-card">
        <table className="table table-striped mb-0">
          <thead>
            <tr>
              <th>#</th>
              <th>Status</th>
              <th>Color</th>
              <th>In?</th>
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
                <td>{status.isIn ? "Yes" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
