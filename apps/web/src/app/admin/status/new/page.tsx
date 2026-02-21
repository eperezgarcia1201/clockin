"use client";

import { useState } from "react";

export default function CreateStatus() {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#2a4d8f");
  const [isIn, setIsIn] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    const response = await fetch("/api/statuses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, color, isIn }),
    });
    if (response.ok) {
      setStatus("Status created successfully.");
      setLabel("");
      setColor("#2a4d8f");
      setIsIn(false);
    } else {
      setStatus("Unable to create status.");
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>Create Status</h1>
      </div>

      <div className="admin-card">
        {status && <div className="alert alert-info">{status}</div>}
        <form onSubmit={submit} className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label">Status Label</label>
            <input
              className="form-control"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Color</label>
            <input
              className="form-control form-control-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>
          <div className="col-12">
            <label className="form-label">Counts as In?</label>
            <select
              className="form-select"
              value={isIn ? "yes" : "no"}
              onChange={(e) => setIsIn(e.target.value === "yes")}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div className="col-12 d-flex gap-2">
            <button className="btn btn-primary" type="submit">
              Create Status
            </button>
            <a className="btn btn-outline-secondary" href="/admin/status">
              Cancel
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
