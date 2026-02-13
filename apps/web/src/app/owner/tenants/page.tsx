"use client";

import { useCallback, useEffect, useState } from "react";

type TenantFeatures = {
  requirePin: boolean;
  reportsEnabled: boolean;
  allowManualTimeEdits: boolean;
};

type TenantAccount = {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  authOrgId: string;
  adminUsername: string;
  ownerEmail: string | null;
  ownerName: string | null;
  isActive: boolean;
  timezone: string;
  roundingMinutes: number;
  features: TenantFeatures;
  counts: {
    employees: number;
    memberships: number;
  };
  createdAt: string;
  updatedAt: string;
};

type TenantDraft = {
  name: string;
  subdomain: string;
  adminUsername: string;
  adminPassword: string;
  ownerEmail: string;
  ownerName: string;
  isActive: boolean;
  timezone: string;
  roundingMinutes: string;
  features: TenantFeatures;
};

type CreateForm = TenantDraft;

const defaultFeatures: TenantFeatures = {
  requirePin: true,
  reportsEnabled: true,
  allowManualTimeEdits: true,
};

const timezoneOptions = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "UTC",
];

const toDraft = (tenant: TenantAccount): TenantDraft => ({
  name: tenant.name,
  subdomain: tenant.subdomain || tenant.slug,
  adminUsername: tenant.adminUsername || "admin",
  adminPassword: "",
  ownerEmail: tenant.ownerEmail || "",
  ownerName: tenant.ownerName || "",
  isActive: tenant.isActive,
  timezone: tenant.timezone,
  roundingMinutes: String(tenant.roundingMinutes),
  features: { ...tenant.features },
});

const emptyCreateForm = (): CreateForm => ({
  name: "",
  subdomain: "",
  adminUsername: "admin",
  adminPassword: "1234qwer",
  ownerEmail: "",
  ownerName: "",
  isActive: true,
  timezone: "America/New_York",
  roundingMinutes: "15",
  features: { ...defaultFeatures },
});

export default function TenantAccountsPage() {
  const [tenants, setTenants] = useState<TenantAccount[]>([]);
  const [drafts, setDrafts] = useState<Record<string, TenantDraft>>({});
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingTenantId, setSavingTenantId] = useState<string | null>(null);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [togglingTenantId, setTogglingTenantId] = useState<string | null>(null);
  const [deletingTenantId, setDeletingTenantId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const syncDrafts = useCallback((items: TenantAccount[]) => {
    const next: Record<string, TenantDraft> = {};
    items.forEach((tenant) => {
      next[tenant.id] = toDraft(tenant);
    });
    setDrafts(next);
  }, []);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    setStatus(null);
    try {
      const response = await fetch("/api/tenant-accounts", { cache: "no-store" });
      const data = (await response.json()) as {
        tenants?: TenantAccount[];
        error?: string;
      };

      if (!response.ok) {
        setStatus(data.error || "Unable to load tenant accounts.");
        setTenants([]);
        syncDrafts([]);
        return;
      }

      const list = data.tenants || [];
      setTenants(list);
      syncDrafts(list);
      if (list.length === 0) {
        setCreateOpen(true);
      }
    } catch {
      setStatus("Unable to load tenant accounts.");
      setTenants([]);
      syncDrafts([]);
    } finally {
      setLoading(false);
    }
  }, [syncDrafts]);

  useEffect(() => {
    void loadTenants();
  }, [loadTenants]);

  const updateCreateForm = (
    field: keyof CreateForm,
    value: string | boolean,
  ) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateCreateFeatures = (field: keyof TenantFeatures, value: boolean) => {
    setCreateForm((prev) => ({
      ...prev,
      features: { ...prev.features, [field]: value },
    }));
  };

  const updateDraft = (
    tenantId: string,
    field: keyof TenantDraft,
    value: string | boolean,
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [tenantId]: { ...prev[tenantId], [field]: value },
    }));
  };

  const updateDraftFeatures = (
    tenantId: string,
    field: keyof TenantFeatures,
    value: boolean,
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [tenantId]: {
        ...prev[tenantId],
        features: { ...prev[tenantId].features, [field]: value },
      },
    }));
  };

  const parseRounding = (value: string) => {
    const number = Number.parseInt(value, 10);
    if (!Number.isFinite(number) || number < 0) {
      return null;
    }
    return number;
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);

    if (!createForm.name.trim()) {
      setStatus("Tenant name is required.");
      return;
    }

    const roundingMinutes = parseRounding(createForm.roundingMinutes);
    if (roundingMinutes === null) {
      setStatus("Rounding minutes must be a non-negative number.");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/tenant-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name.trim(),
          subdomain: createForm.subdomain.trim() || undefined,
          adminUsername: createForm.adminUsername.trim() || undefined,
          adminPassword: createForm.adminPassword.trim() || undefined,
          ownerEmail: createForm.ownerEmail.trim() || undefined,
          ownerName: createForm.ownerName.trim() || undefined,
          isActive: createForm.isActive,
          timezone: createForm.timezone,
          roundingMinutes,
          features: createForm.features,
        }),
      });

      const data = (await response.json()) as TenantAccount & { error?: string };
      if (!response.ok) {
        setStatus(data.error || "Unable to create tenant account.");
        return;
      }

      const nextTenants = [data, ...tenants];
      setTenants(nextTenants);
      syncDrafts(nextTenants);
      setCreateForm(emptyCreateForm());
      setCreateOpen(false);
      setStatus("Tenant account created.");
    } catch {
      setStatus("Unable to create tenant account.");
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async (tenantId: string) => {
    const draft = drafts[tenantId];
    if (!draft) {
      return;
    }

    if (!draft.name.trim()) {
      setStatus("Tenant name is required.");
      return;
    }

    const roundingMinutes = parseRounding(draft.roundingMinutes);
    if (roundingMinutes === null) {
      setStatus("Rounding minutes must be a non-negative number.");
      return;
    }

    setSavingTenantId(tenantId);
    setStatus(null);
    try {
      const response = await fetch(`/api/tenant-accounts/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          subdomain: draft.subdomain.trim() || undefined,
          adminUsername: draft.adminUsername.trim() || undefined,
          adminPassword: draft.adminPassword.trim() || undefined,
          ownerEmail: draft.ownerEmail.trim() || undefined,
          ownerName: draft.ownerName.trim() || undefined,
          isActive: draft.isActive,
          timezone: draft.timezone,
          roundingMinutes,
          features: draft.features,
        }),
      });

      const data = (await response.json()) as TenantAccount & { error?: string };
      if (!response.ok) {
        setStatus(data.error || "Unable to update tenant account.");
        return;
      }

      const nextTenants = tenants.map((tenant) =>
        tenant.id === tenantId ? data : tenant,
      );
      setTenants(nextTenants);
      syncDrafts(nextTenants);
      setEditingTenantId(null);
      setStatus("Tenant account updated.");
    } catch {
      setStatus("Unable to update tenant account.");
    } finally {
      setSavingTenantId(null);
    }
  };

  const handleToggleActive = async (tenant: TenantAccount) => {
    setTogglingTenantId(tenant.id);
    setStatus(null);
    try {
      const response = await fetch(`/api/tenant-accounts/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !tenant.isActive }),
      });
      const data = (await response.json()) as TenantAccount & { error?: string };
      if (!response.ok) {
        setStatus(data.error || "Unable to change tenant status.");
        return;
      }

      const nextTenants = tenants.map((item) =>
        item.id === tenant.id ? data : item,
      );
      setTenants(nextTenants);
      syncDrafts(nextTenants);
      setStatus(
        data.isActive ? "Tenant account activated." : "Tenant account deactivated.",
      );
    } catch {
      setStatus("Unable to change tenant status.");
    } finally {
      setTogglingTenantId(null);
    }
  };

  const handleDelete = async (tenant: TenantAccount) => {
    const approved = window.confirm(
      `Delete tenant \"${tenant.name}\"? This action cannot be undone.`,
    );
    if (!approved) {
      return;
    }

    setDeletingTenantId(tenant.id);
    setStatus(null);
    try {
      const response = await fetch(`/api/tenant-accounts/${tenant.id}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };

      if (!response.ok || !data.ok) {
        setStatus(data.error || data.message || "Unable to delete tenant account.");
        return;
      }

      const nextTenants = tenants.filter((item) => item.id !== tenant.id);
      setTenants(nextTenants);
      syncDrafts(nextTenants);
      if (editingTenantId === tenant.id) {
        setEditingTenantId(null);
      }
      setStatus("Tenant account deleted.");
    } catch {
      setStatus("Unable to delete tenant account.");
    } finally {
      setDeletingTenantId(null);
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header d-flex align-items-center justify-content-between flex-wrap gap-2">
        <h1 className="mb-0">Tenant Accounts</h1>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setCreateOpen((prev) => !prev);
            setStatus(null);
          }}
        >
          {createOpen ? "Close" : "Create New Tenant"}
        </button>
      </div>

      {status && <div className="alert alert-info mb-0">{status}</div>}

      {createOpen && (
        <div className="admin-card">
          <h2 className="h5 mb-3">Create Tenant Account</h2>
          <form onSubmit={handleCreate} className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label">Tenant Name *</label>
              <input
                className="form-control"
                value={createForm.name}
                onChange={(event) => updateCreateForm("name", event.target.value)}
                required
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">Subdomain</label>
              <input
                className="form-control"
                placeholder="restaurant1"
                value={createForm.subdomain}
                onChange={(event) => updateCreateForm("subdomain", event.target.value)}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">Admin Username</label>
              <input
                className="form-control"
                value={createForm.adminUsername}
                onChange={(event) => updateCreateForm("adminUsername", event.target.value)}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">Admin Password</label>
              <input
                className="form-control"
                type="password"
                value={createForm.adminPassword}
                onChange={(event) => updateCreateForm("adminPassword", event.target.value)}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">Owner Email</label>
              <input
                className="form-control"
                type="email"
                value={createForm.ownerEmail}
                onChange={(event) => updateCreateForm("ownerEmail", event.target.value)}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">Owner Name</label>
              <input
                className="form-control"
                value={createForm.ownerName}
                onChange={(event) => updateCreateForm("ownerName", event.target.value)}
              />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">Timezone</label>
              <select
                className="form-select"
                value={createForm.timezone}
                onChange={(event) => updateCreateForm("timezone", event.target.value)}
              >
                {timezoneOptions.map((timezone) => (
                  <option key={timezone} value={timezone}>
                    {timezone}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">Rounding Minutes</label>
              <input
                className="form-control"
                inputMode="numeric"
                value={createForm.roundingMinutes}
                onChange={(event) =>
                  updateCreateForm("roundingMinutes", event.target.value)
                }
              />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">Account Enabled</label>
              <select
                className="form-select"
                value={createForm.isActive ? "yes" : "no"}
                onChange={(event) =>
                  updateCreateForm("isActive", event.target.value === "yes")
                }
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">Reports Enabled</label>
              <select
                className="form-select"
                value={createForm.features.reportsEnabled ? "yes" : "no"}
                onChange={(event) =>
                  updateCreateFeatures("reportsEnabled", event.target.value === "yes")
                }
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">Require PIN</label>
              <select
                className="form-select"
                value={createForm.features.requirePin ? "yes" : "no"}
                onChange={(event) =>
                  updateCreateFeatures("requirePin", event.target.value === "yes")
                }
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">Manual Time Edits</label>
              <select
                className="form-select"
                value={createForm.features.allowManualTimeEdits ? "yes" : "no"}
                onChange={(event) =>
                  updateCreateFeatures(
                    "allowManualTimeEdits",
                    event.target.value === "yes",
                  )
                }
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div className="col-12">
              <button className="btn btn-primary" type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create Tenant"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="admin-card">
        <h2 className="h5 mb-3">Existing Tenant Accounts</h2>
        {loading ? (
          <p className="mb-0">Loading tenant accounts...</p>
        ) : tenants.length === 0 ? (
          <p className="mb-0">No tenant accounts yet.</p>
        ) : (
          <div className="d-flex flex-column gap-3">
            {tenants.map((tenant) => {
              const draft = drafts[tenant.id];
              const isEditing = editingTenantId === tenant.id;

              return (
                <div key={tenant.id} className="border rounded p-3">
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <div>
                      <div className="fw-semibold">{tenant.name}</div>
                      <div className="small text-muted">{tenant.subdomain || tenant.slug}</div>
                    </div>
                    <div className="d-flex gap-2 flex-wrap">
                      <span
                        className={`badge ${tenant.isActive ? "text-bg-success" : "text-bg-secondary"}`}
                      >
                        {tenant.isActive ? "Active" : "Inactive"}
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() =>
                          setEditingTenantId((prev) => (prev === tenant.id ? null : tenant.id))
                        }
                      >
                        {isEditing ? "Close" : "Edit"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        disabled={togglingTenantId === tenant.id}
                        onClick={() => void handleToggleActive(tenant)}
                      >
                        {tenant.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        disabled={deletingTenantId === tenant.id}
                        onClick={() => void handleDelete(tenant)}
                      >
                        {deletingTenantId === tenant.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>

                  {isEditing && draft && (
                    <div className="row g-3 mt-2">
                      <div className="col-12 col-md-6">
                        <label className="form-label">Tenant Name</label>
                        <input
                          className="form-control"
                          value={draft.name}
                          onChange={(event) =>
                            updateDraft(tenant.id, "name", event.target.value)
                          }
                        />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label">Subdomain</label>
                        <input
                          className="form-control"
                          value={draft.subdomain}
                          onChange={(event) =>
                            updateDraft(tenant.id, "subdomain", event.target.value)
                          }
                        />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label">Admin Username</label>
                        <input
                          className="form-control"
                          value={draft.adminUsername}
                          onChange={(event) =>
                            updateDraft(tenant.id, "adminUsername", event.target.value)
                          }
                        />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label">Admin Password</label>
                        <input
                          className="form-control"
                          type="password"
                          placeholder="Leave blank to keep current password"
                          value={draft.adminPassword}
                          onChange={(event) =>
                            updateDraft(tenant.id, "adminPassword", event.target.value)
                          }
                        />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label">Owner Email</label>
                        <input
                          className="form-control"
                          type="email"
                          value={draft.ownerEmail}
                          onChange={(event) =>
                            updateDraft(tenant.id, "ownerEmail", event.target.value)
                          }
                        />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label">Owner Name</label>
                        <input
                          className="form-control"
                          value={draft.ownerName}
                          onChange={(event) =>
                            updateDraft(tenant.id, "ownerName", event.target.value)
                          }
                        />
                      </div>
                      <div className="col-12 col-md-3">
                        <label className="form-label">Timezone</label>
                        <select
                          className="form-select"
                          value={draft.timezone}
                          onChange={(event) =>
                            updateDraft(tenant.id, "timezone", event.target.value)
                          }
                        >
                          {timezoneOptions.map((timezone) => (
                            <option key={timezone} value={timezone}>
                              {timezone}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-12 col-md-3">
                        <label className="form-label">Rounding Minutes</label>
                        <input
                          className="form-control"
                          inputMode="numeric"
                          value={draft.roundingMinutes}
                          onChange={(event) =>
                            updateDraft(tenant.id, "roundingMinutes", event.target.value)
                          }
                        />
                      </div>
                      <div className="col-12 col-md-3">
                        <label className="form-label">Account Enabled</label>
                        <select
                          className="form-select"
                          value={draft.isActive ? "yes" : "no"}
                          onChange={(event) =>
                            updateDraft(
                              tenant.id,
                              "isActive",
                              event.target.value === "yes",
                            )
                          }
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>
                      <div className="col-12 col-md-3">
                        <label className="form-label">Reports Enabled</label>
                        <select
                          className="form-select"
                          value={draft.features.reportsEnabled ? "yes" : "no"}
                          onChange={(event) =>
                            updateDraftFeatures(
                              tenant.id,
                              "reportsEnabled",
                              event.target.value === "yes",
                            )
                          }
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>
                      <div className="col-12 col-md-3">
                        <label className="form-label">Require PIN</label>
                        <select
                          className="form-select"
                          value={draft.features.requirePin ? "yes" : "no"}
                          onChange={(event) =>
                            updateDraftFeatures(
                              tenant.id,
                              "requirePin",
                              event.target.value === "yes",
                            )
                          }
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>
                      <div className="col-12 col-md-3">
                        <label className="form-label">Manual Time Edits</label>
                        <select
                          className="form-select"
                          value={draft.features.allowManualTimeEdits ? "yes" : "no"}
                          onChange={(event) =>
                            updateDraftFeatures(
                              tenant.id,
                              "allowManualTimeEdits",
                              event.target.value === "yes",
                            )
                          }
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>
                      <div className="col-12 d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={savingTenantId === tenant.id}
                          onClick={() => void handleSave(tenant.id)}
                        >
                          {savingTenantId === tenant.id ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setEditingTenantId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
