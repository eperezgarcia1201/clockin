"use client";

import { useEffect, useState } from "react";

type Office = { id: string; name: string };

export default function CreateGroup() {
  const [name, setName] = useState("");
  const [officeId, setOfficeId] = useState("");
  const [offices, setOffices] = useState<Office[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/offices", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { offices: Office[] };
      setOffices(data.offices || []);
    };
    load();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    const response = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, officeId: officeId || undefined }),
    });
    if (response.ok) {
      setStatus("Group created successfully.");
      setName("");
      setOfficeId("");
    } else {
      setStatus("Unable to create group.");
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>Create New Group</h1>
      </div>

      <div className="admin-card">
        {status && <div className="alert alert-info">{status}</div>}
        <form onSubmit={submit} className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label">Group Name</label>
            <input
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Location</label>
            <select
              className="form-select"
              value={officeId}
              onChange={(e) => setOfficeId(e.target.value)}
            >
              <option value="">Select location</option>
              {offices.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 d-flex gap-2">
            <button className="btn btn-primary" type="submit">
              Create Group
            </button>
            <a className="btn btn-outline-secondary" href="/admin/groups">
              Cancel
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
