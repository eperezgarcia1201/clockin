"use client";

import { useState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreateOffice() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [multiLocationEnabled, setMultiLocationEnabled] = useState(false);

  useEffect(() => {
    const loadAccess = async () => {
      try {
        const response = await fetch("/api/access/me", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as {
          multiLocationEnabled?: boolean;
        };
        setMultiLocationEnabled(Boolean(data.multiLocationEnabled));
      } catch {
        // ignore
      }
    };
    void loadAccess();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    if (!multiLocationEnabled) {
      setStatus(
        "Multi-location mode is disabled for this tenant. Enable it from owner controls first.",
      );
      return;
    }
    const response = await fetch("/api/offices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (response.ok) {
      const created = (await response.json().catch(() => null)) as
        | { id?: string; name?: string }
        | null;
      const createdId = created?.id?.trim();
      if (createdId) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("clockin_active_location_id", createdId);
          sessionStorage.removeItem("clockin_active_location_all");
          document.cookie = `clockin_active_location_id=${encodeURIComponent(createdId)}; path=/`;
        }
        router.push("/admin");
        return;
      }
      setStatus("Location created successfully.");
      setName("");
    } else {
      setStatus("Unable to create location.");
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>Create New Location</h1>
      </div>

      <div className="admin-card">
        {status && <div className="alert alert-info">{status}</div>}
        {!multiLocationEnabled && (
          <div className="alert alert-warning">
            Multi-location mode is disabled for this tenant.
          </div>
        )}
        <form onSubmit={submit} className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label">Location Name</label>
            <input
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="col-12 d-flex gap-2">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={!multiLocationEnabled}
            >
              Create Location
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
