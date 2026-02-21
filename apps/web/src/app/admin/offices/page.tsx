"use client";

import { useEffect, useState } from "react";

type Office = { id: string; name: string };

export default function OfficeSummary() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [multiLocationEnabled, setMultiLocationEnabled] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [locationsResponse, accessResponse] = await Promise.all([
        fetch("/api/offices", { cache: "no-store" }),
        fetch("/api/access/me", { cache: "no-store" }),
      ]);
      if (locationsResponse.ok) {
        const data = (await locationsResponse.json()) as { offices: Office[] };
        setOffices(data.offices || []);
      }
      if (accessResponse.ok) {
        const access = (await accessResponse.json()) as {
          multiLocationEnabled?: boolean;
        };
        setMultiLocationEnabled(Boolean(access.multiLocationEnabled));
      }
    };
    load();
  }, []);

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>Location Summary</h1>
        {multiLocationEnabled && (
          <div className="admin-actions">
            <a className="btn btn-primary" href="/admin/offices/new">
              Create New Location
            </a>
          </div>
        )}
      </div>

      <div className="admin-card">
        {!multiLocationEnabled && (
          <div className="alert alert-secondary">
            Multi-location mode is disabled. This tenant can operate with one
            location.
          </div>
        )}
        <table className="table table-striped mb-0">
          <thead>
            <tr>
              <th>#</th>
              <th>Location Name</th>
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
