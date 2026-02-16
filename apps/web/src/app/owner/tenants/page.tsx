"use client";

import { useCallback, useEffect, useState } from "react";

type TenantFeatures = {
  requirePin: boolean;
  reportsEnabled: boolean;
  allowManualTimeEdits: boolean;
  dailySalesReportingEnabled: boolean;
  multiLocationEnabled: boolean;
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
type PendingTenantDelete = TenantAccount | null;
type ApiErrorPayload = {
  error?: unknown;
  message?: unknown;
};
type TenantPayloadSource = {
  name: string;
  subdomain: string;
  adminUsername: string;
  adminPassword: string;
  ownerEmail: string;
  ownerName: string;
  isActive: boolean;
  timezone: string;
  features: TenantFeatures;
};

const defaultFeatures: TenantFeatures = {
  requirePin: true,
  reportsEnabled: true,
  allowManualTimeEdits: true,
  dailySalesReportingEnabled: false,
  multiLocationEnabled: false,
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

const resolveApiError = (payload: ApiErrorPayload, fallback: string) => {
  const errorText =
    typeof payload.error === "string" ? payload.error.trim() : "";
  const messageValue = payload.message;
  const messageText =
    typeof messageValue === "string"
      ? messageValue.trim()
      : Array.isArray(messageValue)
        ? (messageValue.find(
            (entry) => typeof entry === "string" && entry.trim().length > 0,
          ) as string | undefined)
        : "";

  if (messageText) {
    return messageText;
  }

  if (errorText && errorText.toLowerCase() !== "bad request") {
    return errorText;
  }

  if (errorText) {
    return errorText;
  }

  return fallback;
};

const isLegacyMultiLocationError = (payload: ApiErrorPayload) => {
  const message = resolveApiError(payload, "");
  return message.includes("features.property multiLocationEnabled should not exist");
};

const buildTenantPayload = (
  source: TenantPayloadSource,
  roundingMinutes: number,
  options?: { includeMultiLocation?: boolean },
) => {
  const includeMultiLocation = options?.includeMultiLocation ?? true;
  const features: Record<string, boolean> = {
    requirePin: source.features.requirePin,
    reportsEnabled: source.features.reportsEnabled,
    allowManualTimeEdits: source.features.allowManualTimeEdits,
    dailySalesReportingEnabled: source.features.dailySalesReportingEnabled,
  };

  if (includeMultiLocation) {
    features.multiLocationEnabled = source.features.multiLocationEnabled;
  }

  return {
    name: source.name.trim(),
    subdomain: source.subdomain.trim() || undefined,
    adminUsername: source.adminUsername.trim() || undefined,
    adminPassword: source.adminPassword.trim() || undefined,
    ownerEmail: source.ownerEmail.trim() || undefined,
    ownerName: source.ownerName.trim() || undefined,
    isActive: source.isActive,
    timezone: source.timezone,
    roundingMinutes,
    features,
  };
};

export default function TenantAccountsPage() {
  const [tenants, setTenants] = useState<TenantAccount[]>([]);
  const [drafts, setDrafts] = useState<Record<string, TenantDraft>>({});
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingTenantId, setSavingTenantId] = useState<string | null>(null);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [featuresTenantId, setFeaturesTenantId] = useState<string | null>(null);
  const [togglingTenantId, setTogglingTenantId] = useState<string | null>(null);
  const [deletingTenantId, setDeletingTenantId] = useState<string | null>(null);
  const [pendingDeleteTenant, setPendingDeleteTenant] =
    useState<PendingTenantDelete>(null);
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
        setStatus(
          resolveApiError(data, "Unable to load tenant accounts."),
        );
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
      let usedLegacyFallback = false;
      let response = await fetch("/api/tenant-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildTenantPayload(createForm, roundingMinutes)),
      });

      let data = (await response.json()) as TenantAccount & ApiErrorPayload;

      if (!response.ok && isLegacyMultiLocationError(data)) {
        usedLegacyFallback = true;
        response = await fetch("/api/tenant-accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            buildTenantPayload(createForm, roundingMinutes, {
              includeMultiLocation: false,
            }),
          ),
        });
        data = (await response.json()) as TenantAccount & ApiErrorPayload;
      }

      if (!response.ok) {
        setStatus(
          resolveApiError(data, "Unable to create tenant account."),
        );
        return;
      }

      const nextTenants = [data, ...tenants];
      setTenants(nextTenants);
      syncDrafts(nextTenants);
      setCreateForm(emptyCreateForm());
      setCreateOpen(false);
      setStatus(
        usedLegacyFallback
          ? "Tenant account created. Multi-location toggle needs API restart/update to be saved."
          : "Tenant account created.",
      );
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
      let usedLegacyFallback = false;
      let response = await fetch(`/api/tenant-accounts/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildTenantPayload(draft, roundingMinutes)),
      });

      let data = (await response.json()) as TenantAccount & ApiErrorPayload;

      if (!response.ok && isLegacyMultiLocationError(data)) {
        usedLegacyFallback = true;
        response = await fetch(`/api/tenant-accounts/${tenantId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            buildTenantPayload(draft, roundingMinutes, {
              includeMultiLocation: false,
            }),
          ),
        });
        data = (await response.json()) as TenantAccount & ApiErrorPayload;
      }

      if (!response.ok) {
        setStatus(
          resolveApiError(data, "Unable to update tenant account."),
        );
        return;
      }

      const nextTenants = tenants.map((tenant) =>
        tenant.id === tenantId ? data : tenant,
      );
      setTenants(nextTenants);
      syncDrafts(nextTenants);
      setEditingTenantId(null);
      setStatus(
        usedLegacyFallback
          ? "Tenant account updated. Multi-location toggle needs API restart/update to be saved."
          : "Tenant account updated.",
      );
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
        setStatus(
          resolveApiError(data, "Unable to change tenant status."),
        );
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
        setStatus(
          resolveApiError(data, "Unable to delete tenant account."),
        );
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

  const onConfirmPendingDelete = async () => {
    if (!pendingDeleteTenant) {
      return;
    }
    await handleDelete(pendingDeleteTenant);
    setPendingDeleteTenant(null);
  };

  const pendingDeleteBusy =
    pendingDeleteTenant !== null &&
    deletingTenantId === pendingDeleteTenant.id;

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
            <div className="col-12 col-md-3">
              <label className="form-label">Daily Sales Reporting</label>
              <select
                className="form-select"
                value={createForm.features.dailySalesReportingEnabled ? "yes" : "no"}
                onChange={(event) =>
                  updateCreateFeatures(
                    "dailySalesReportingEnabled",
                    event.target.value === "yes",
                  )
                }
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">Multi-Location</label>
              <select
                className="form-select"
                value={createForm.features.multiLocationEnabled ? "yes" : "no"}
                onChange={(event) =>
                  updateCreateFeatures(
                    "multiLocationEnabled",
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
              const isFeatureOpen = featuresTenantId === tenant.id;
              const featureState = draft?.features || tenant.features;

              return (
                <div key={tenant.id} className="border rounded p-3">
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <div>
                      <div className="fw-semibold">{tenant.name}</div>
                      <div className="small text-muted">{tenant.subdomain || tenant.slug}</div>
                      <div className="d-flex flex-wrap gap-2 mt-2">
                        <span
                          className={`badge ${featureState.dailySalesReportingEnabled ? "text-bg-success" : "text-bg-secondary"}`}
                        >
                          Daily Sales {featureState.dailySalesReportingEnabled ? "On" : "Off"}
                        </span>
                        <span
                          className={`badge ${featureState.reportsEnabled ? "text-bg-success" : "text-bg-secondary"}`}
                        >
                          Reports {featureState.reportsEnabled ? "On" : "Off"}
                        </span>
                        <span
                          className={`badge ${featureState.requirePin ? "text-bg-success" : "text-bg-secondary"}`}
                        >
                          Require PIN {featureState.requirePin ? "On" : "Off"}
                        </span>
                        <span
                          className={`badge ${featureState.allowManualTimeEdits ? "text-bg-success" : "text-bg-secondary"}`}
                        >
                          Manual Edits {featureState.allowManualTimeEdits ? "On" : "Off"}
                        </span>
                        <span
                          className={`badge ${featureState.multiLocationEnabled ? "text-bg-success" : "text-bg-secondary"}`}
                        >
                          Multi-Location {featureState.multiLocationEnabled ? "On" : "Off"}
                        </span>
                      </div>
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
                        className="btn btn-sm btn-outline-info"
                        onClick={() =>
                          setFeaturesTenantId((prev) => (prev === tenant.id ? null : tenant.id))
                        }
                      >
                        {isFeatureOpen ? "Close Features" : "Features"}
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
                        onClick={() => setPendingDeleteTenant(tenant)}
                      >
                        {deletingTenantId === tenant.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>

                  {isFeatureOpen && draft && (
                    <div className="row g-3 mt-2 border rounded p-3 bg-body-tertiary">
                      <div className="col-12">
                        <div className="fw-semibold">Tenant Feature Controls</div>
                        <div className="small text-muted">
                          Enable or disable features for this tenant.
                        </div>
                      </div>
                      <div className="col-12 col-md-3">
                        <label className="form-label">Daily Sales Reporting</label>
                        <select
                          className="form-select"
                          value={draft.features.dailySalesReportingEnabled ? "yes" : "no"}
                          onChange={(event) =>
                            updateDraftFeatures(
                              tenant.id,
                              "dailySalesReportingEnabled",
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
                      <div className="col-12 col-md-3">
                        <label className="form-label">Multi-Location</label>
                        <select
                          className="form-select"
                          value={draft.features.multiLocationEnabled ? "yes" : "no"}
                          onChange={(event) =>
                            updateDraftFeatures(
                              tenant.id,
                              "multiLocationEnabled",
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
                          {savingTenantId === tenant.id ? "Saving..." : "Save Features"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setFeaturesTenantId(null)}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}

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
                      <div className="col-12 col-md-3">
                        <label className="form-label">Daily Sales Reporting</label>
                        <select
                          className="form-select"
                          value={draft.features.dailySalesReportingEnabled ? "yes" : "no"}
                          onChange={(event) =>
                            updateDraftFeatures(
                              tenant.id,
                              "dailySalesReportingEnabled",
                              event.target.value === "yes",
                            )
                          }
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>
                      <div className="col-12 col-md-3">
                        <label className="form-label">Multi-Location</label>
                        <select
                          className="form-select"
                          value={draft.features.multiLocationEnabled ? "yes" : "no"}
                          onChange={(event) =>
                            updateDraftFeatures(
                              tenant.id,
                              "multiLocationEnabled",
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

      {pendingDeleteTenant && (
        <div
          className="embedded-confirm-backdrop"
          onClick={() => {
            if (!pendingDeleteBusy) {
              setPendingDeleteTenant(null);
            }
          }}
        >
          <div
            className="embedded-confirm-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="embedded-confirm-title">Delete Tenant</h2>
            <p className="embedded-confirm-message">
              Delete tenant "{pendingDeleteTenant.name}"? This action cannot be
              undone.
            </p>
            <div className="embedded-confirm-actions">
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={pendingDeleteBusy}
                onClick={() => setPendingDeleteTenant(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={pendingDeleteBusy}
                onClick={() => void onConfirmPendingDelete()}
              >
                {pendingDeleteBusy ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
