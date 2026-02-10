"use client";

import { useState } from "react";

export default function CreateOffice() {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    const response = await fetch("/api/offices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (response.ok) {
      setStatus("Office created successfully.");
      setName("");
    } else {
      setStatus("Unable to create office.");
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>Create New Office</h1>
      </div>

      <div className="admin-card">
        {status && <div className="alert alert-info">{status}</div>}
        <form onSubmit={submit} className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label">Office Name</label>
            <input
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="col-12 d-flex gap-2">
            <button className="btn btn-primary" type="submit">
              Create Office
            </button>
            <a className="btn btn-outline-secondary" href="/admin/offices">
              Cancel
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
