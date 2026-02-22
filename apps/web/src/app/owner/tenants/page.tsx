"use client";

import { useCallback, useEffect, useState } from "react";
import { useUiLanguage } from "../../../lib/ui-language";

type TenantFeatures = {
  requirePin: boolean;
  reportsEnabled: boolean;
  allowManualTimeEdits: boolean;
  dailySalesReportingEnabled: boolean;
  companyOrdersEnabled: boolean;
  multiLocationEnabled: boolean;
  liquorInventoryEnabled: boolean;
  premiumFeaturesEnabled: boolean;
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
type TenantDeleteDataItem = {
  key: string;
  label: string;
  count: number;
};
type TenantDeletionReport = {
  tenantId: string;
  tenantName: string;
  hasData: boolean;
  totalRecords: number;
  blockers: TenantDeleteDataItem[];
  generatedAt: string;
};
type TenantExportFormat = "summary" | "excel" | "sql";
type TenantDeleteDownloads = Record<TenantExportFormat, boolean>;
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
  companyOrdersEnabled: false,
  multiLocationEnabled: false,
  liquorInventoryEnabled: false,
  premiumFeaturesEnabled: false,
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

const isLegacyFeatureValidationError = (payload: ApiErrorPayload) => {
  const message = resolveApiError(payload, "");
  return (
    message.includes("features.property multiLocationEnabled should not exist") ||
    message.includes("features.property liquorInventoryEnabled should not exist") ||
    message.includes("features.property premiumFeaturesEnabled should not exist")
  );
};

const buildTenantPayload = (
  source: TenantPayloadSource,
  roundingMinutes: number,
  options?: {
    includeMultiLocation?: boolean;
    includeLiquorInventory?: boolean;
    includePremiumFeatures?: boolean;
  },
) => {
  const includeMultiLocation = options?.includeMultiLocation ?? true;
  const includeLiquorInventory = options?.includeLiquorInventory ?? true;
  const includePremiumFeatures = options?.includePremiumFeatures ?? true;
  const features: Record<string, boolean> = {
    requirePin: source.features.requirePin,
    reportsEnabled: source.features.reportsEnabled,
    allowManualTimeEdits: source.features.allowManualTimeEdits,
    dailySalesReportingEnabled: source.features.dailySalesReportingEnabled,
    companyOrdersEnabled: source.features.companyOrdersEnabled,
  };

  if (includeMultiLocation) {
    features.multiLocationEnabled = source.features.multiLocationEnabled;
  }
  if (includeLiquorInventory) {
    features.liquorInventoryEnabled = source.features.liquorInventoryEnabled;
  }
  if (includePremiumFeatures) {
    features.premiumFeaturesEnabled = source.features.premiumFeaturesEnabled;
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

const emptyDeleteDownloads = (): TenantDeleteDownloads => ({
  summary: false,
  excel: false,
  sql: false,
});

export default function TenantAccountsPage() {
  const lang = useUiLanguage();
  const tr = (en: string, es: string) => (lang === "es" ? es : en);
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
  const [pendingDeleteReport, setPendingDeleteReport] =
    useState<TenantDeletionReport | null>(null);
  const [pendingDeleteLoading, setPendingDeleteLoading] = useState(false);
  const [pendingDeleteDownloads, setPendingDeleteDownloads] =
    useState<TenantDeleteDownloads>(emptyDeleteDownloads);
  const [pendingDeleteExporting, setPendingDeleteExporting] =
    useState<TenantExportFormat | null>(null);
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
          resolveApiError(
            data,
            tr(
              "Unable to load tenant accounts.",
              "No se pudieron cargar las cuentas de tenant.",
            ),
          ),
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
      setStatus(
        tr(
          "Unable to load tenant accounts.",
          "No se pudieron cargar las cuentas de tenant.",
        ),
      );
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
      setStatus(tr("Tenant name is required.", "El nombre del tenant es requerido."));
      return;
    }

    const roundingMinutes = parseRounding(createForm.roundingMinutes);
    if (roundingMinutes === null) {
      setStatus(
        tr(
          "Rounding minutes must be a non-negative number.",
          "Los minutos de redondeo deben ser un numero no negativo.",
        ),
      );
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

      if (!response.ok && isLegacyFeatureValidationError(data)) {
        usedLegacyFallback = true;
        response = await fetch("/api/tenant-accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            buildTenantPayload(createForm, roundingMinutes, {
              includeMultiLocation: false,
              includeLiquorInventory: false,
            }),
          ),
        });
        data = (await response.json()) as TenantAccount & ApiErrorPayload;
      }

      if (!response.ok) {
        setStatus(
          resolveApiError(
            data,
            tr(
              "Unable to create tenant account.",
              "No se pudo crear la cuenta del tenant.",
            ),
          ),
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
          ? tr(
              "Tenant account created. Some new tenant feature toggles need API restart/update to be saved.",
              "Cuenta de tenant creada. Algunos nuevos interruptores de funciones necesitan reinicio/actualizacion del API para guardarse.",
            )
          : tr("Tenant account created.", "Cuenta de tenant creada."),
      );
    } catch {
      setStatus(
        tr(
          "Unable to create tenant account.",
          "No se pudo crear la cuenta del tenant.",
        ),
      );
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
      setStatus(tr("Tenant name is required.", "El nombre del tenant es requerido."));
      return;
    }

    const roundingMinutes = parseRounding(draft.roundingMinutes);
    if (roundingMinutes === null) {
      setStatus(
        tr(
          "Rounding minutes must be a non-negative number.",
          "Los minutos de redondeo deben ser un numero no negativo.",
        ),
      );
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

      if (!response.ok && isLegacyFeatureValidationError(data)) {
        usedLegacyFallback = true;
        response = await fetch(`/api/tenant-accounts/${tenantId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            buildTenantPayload(draft, roundingMinutes, {
              includeMultiLocation: false,
              includeLiquorInventory: false,
            }),
          ),
        });
        data = (await response.json()) as TenantAccount & ApiErrorPayload;
      }

      if (!response.ok) {
        setStatus(
          resolveApiError(
            data,
            tr(
              "Unable to update tenant account.",
              "No se pudo actualizar la cuenta del tenant.",
            ),
          ),
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
          ? tr(
              "Tenant account updated. Some new tenant feature toggles need API restart/update to be saved.",
              "Cuenta de tenant actualizada. Algunos nuevos interruptores de funciones necesitan reinicio/actualizacion del API para guardarse.",
            )
          : tr("Tenant account updated.", "Cuenta de tenant actualizada."),
      );
    } catch {
      setStatus(
        tr(
          "Unable to update tenant account.",
          "No se pudo actualizar la cuenta del tenant.",
        ),
      );
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
          resolveApiError(
            data,
            tr(
              "Unable to change tenant status.",
              "No se pudo cambiar el estado del tenant.",
            ),
          ),
        );
        return;
      }

      const nextTenants = tenants.map((item) =>
        item.id === tenant.id ? data : item,
      );
      setTenants(nextTenants);
      syncDrafts(nextTenants);
      setStatus(
        data.isActive
          ? tr("Tenant account activated.", "Cuenta de tenant activada.")
          : tr("Tenant account deactivated.", "Cuenta de tenant desactivada."),
      );
    } catch {
      setStatus(
        tr(
          "Unable to change tenant status.",
          "No se pudo cambiar el estado del tenant.",
        ),
      );
    } finally {
      setTogglingTenantId(null);
    }
  };

  const handleDelete = async (
    tenant: TenantAccount,
    options?: { force?: boolean },
  ) => {
    setDeletingTenantId(tenant.id);
    setStatus(null);
    try {
      const query = options?.force ? "?force=true" : "";
      const response = await fetch(`/api/tenant-accounts/${tenant.id}${query}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
        summary?: TenantDeletionReport;
      };

      if (!response.ok || !data.ok) {
        if (data.summary) {
          setPendingDeleteReport(data.summary);
        }
        setStatus(
          resolveApiError(
            data,
            tr(
              "Unable to delete tenant account.",
              "No se pudo eliminar la cuenta del tenant.",
            ),
          ),
        );
        return false;
      }

      const nextTenants = tenants.filter((item) => item.id !== tenant.id);
      setTenants(nextTenants);
      syncDrafts(nextTenants);
      if (editingTenantId === tenant.id) {
        setEditingTenantId(null);
      }
      setStatus(tr("Tenant account deleted.", "Cuenta de tenant eliminada."));
      return true;
    } catch {
      setStatus(
        tr(
          "Unable to delete tenant account.",
          "No se pudo eliminar la cuenta del tenant.",
        ),
      );
      return false;
    } finally {
      setDeletingTenantId(null);
    }
  };

  const closePendingDeleteDialog = () => {
    if (pendingDeleteBusy || pendingDeleteLoading || pendingDeleteExporting) {
      return;
    }
    setPendingDeleteTenant(null);
    setPendingDeleteReport(null);
    setPendingDeleteDownloads(emptyDeleteDownloads);
    setPendingDeleteLoading(false);
    setPendingDeleteExporting(null);
  };

  const openPendingDeleteDialog = async (tenant: TenantAccount) => {
    setPendingDeleteTenant(tenant);
    setPendingDeleteReport(null);
    setPendingDeleteDownloads(emptyDeleteDownloads);
    setPendingDeleteLoading(true);
    setStatus(null);
    try {
      const response = await fetch(
        `/api/tenant-accounts/${tenant.id}/deletion-report`,
        { cache: "no-store" },
      );
      const data = (await response.json().catch(() => ({}))) as
        | TenantDeletionReport
        | ApiErrorPayload;
      if (!response.ok) {
        setStatus(
          resolveApiError(
            data as ApiErrorPayload,
            tr(
              "Unable to inspect tenant data.",
              "No se pudieron inspeccionar los datos del tenant.",
            ),
          ),
        );
        return;
      }
      setPendingDeleteReport(data as TenantDeletionReport);
    } catch {
      setStatus(
        tr(
          "Unable to inspect tenant data.",
          "No se pudieron inspeccionar los datos del tenant.",
        ),
      );
    } finally {
      setPendingDeleteLoading(false);
    }
  };

  const downloadPendingDeleteExport = async (format: TenantExportFormat) => {
    if (!pendingDeleteTenant) {
      return;
    }

    setPendingDeleteExporting(format);
    setStatus(null);
    try {
      const response = await fetch(
        `/api/tenant-accounts/${pendingDeleteTenant.id}/deletion-export?format=${format}`,
      );
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as ApiErrorPayload;
        setStatus(
          resolveApiError(
            data,
            tr(
              "Unable to export tenant data.",
              "No se pudieron exportar los datos del tenant.",
            ),
          ),
        );
        return;
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("content-disposition") || "";
      const filenameMatch = /filename="?([^";]+)"?/i.exec(contentDisposition);
      const fallbackExtension =
        format === "excel" ? "xls" : format === "sql" ? "sql" : "txt";
      const filename =
        filenameMatch?.[1] || `tenant-data-${pendingDeleteTenant.id}.${fallbackExtension}`;

      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = filename;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
      }, 1200);

      setPendingDeleteDownloads((prev) => ({ ...prev, [format]: true }));
    } catch {
      setStatus(
        tr(
          "Unable to export tenant data.",
          "No se pudieron exportar los datos del tenant.",
        ),
      );
    } finally {
      setPendingDeleteExporting(null);
    }
  };

  const onConfirmPendingDelete = async () => {
    if (!pendingDeleteTenant) {
      return;
    }
    const deleted = await handleDelete(pendingDeleteTenant, {
      force: Boolean(pendingDeleteReport?.hasData),
    });
    if (deleted) {
      closePendingDeleteDialog();
    }
  };

  const pendingDeleteBusy =
    pendingDeleteTenant !== null &&
    deletingTenantId === pendingDeleteTenant.id;
  const pendingDeleteRequiresExports = Boolean(pendingDeleteReport?.hasData);
  const pendingDeleteReadyToDelete =
    pendingDeleteReport !== null &&
    (!pendingDeleteRequiresExports ||
      (pendingDeleteDownloads.summary &&
        pendingDeleteDownloads.excel &&
        pendingDeleteDownloads.sql));

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header d-flex align-items-center justify-content-between flex-wrap gap-2">
        <h1 className="mb-0">{tr("Tenant Accounts", "Cuentas de Tenant")}</h1>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setCreateOpen((prev) => !prev);
            setStatus(null);
          }}
        >
          {createOpen
            ? tr("Close", "Cerrar")
            : tr("Create New Tenant", "Crear Nuevo Tenant")}
        </button>
      </div>

      {status && <div className="alert alert-info mb-0">{status}</div>}

      {createOpen && (
        <div className="admin-card">
          <h2 className="h5 mb-3">
            {tr("Create Tenant Account", "Crear Cuenta de Tenant")}
          </h2>
          <form onSubmit={handleCreate} className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label">
                {tr("Tenant Name *", "Nombre del Tenant *")}
              </label>
              <input
                className="form-control"
                value={createForm.name}
                onChange={(event) => updateCreateForm("name", event.target.value)}
                required
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">{tr("Subdomain", "Subdominio")}</label>
              <input
                className="form-control"
                placeholder={tr("restaurant1", "restaurante1")}
                value={createForm.subdomain}
                onChange={(event) => updateCreateForm("subdomain", event.target.value)}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">
                {tr("Admin Username", "Usuario Admin")}
              </label>
              <input
                className="form-control"
                value={createForm.adminUsername}
                onChange={(event) => updateCreateForm("adminUsername", event.target.value)}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">
                {tr("Admin Password", "Contrasena Admin")}
              </label>
              <input
                className="form-control"
                type="password"
                value={createForm.adminPassword}
                onChange={(event) => updateCreateForm("adminPassword", event.target.value)}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">{tr("Owner Email", "Correo Owner")}</label>
              <input
                className="form-control"
                type="email"
                value={createForm.ownerEmail}
                onChange={(event) => updateCreateForm("ownerEmail", event.target.value)}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">{tr("Owner Name", "Nombre Owner")}</label>
              <input
                className="form-control"
                value={createForm.ownerName}
                onChange={(event) => updateCreateForm("ownerName", event.target.value)}
              />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">{tr("Timezone", "Zona Horaria")}</label>
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
              <label className="form-label">
                {tr("Rounding Minutes", "Minutos de Redondeo")}
              </label>
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
              <label className="form-label">
                {tr("Account Enabled", "Cuenta Habilitada")}
              </label>
              <select
                className="form-select"
                value={createForm.isActive ? "yes" : "no"}
                onChange={(event) =>
                  updateCreateForm("isActive", event.target.value === "yes")
                }
              >
                <option value="yes">{tr("Yes", "Si")}</option>
                <option value="no">{tr("No", "No")}</option>
              </select>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">
                {tr("Reports Enabled", "Reportes Habilitados")}
              </label>
              <select
                className="form-select"
                value={createForm.features.reportsEnabled ? "yes" : "no"}
                onChange={(event) =>
                  updateCreateFeatures("reportsEnabled", event.target.value === "yes")
                }
              >
                <option value="yes">{tr("Yes", "Si")}</option>
                <option value="no">{tr("No", "No")}</option>
              </select>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">{tr("Require PIN", "Requiere PIN")}</label>
              <select
                className="form-select"
                value={createForm.features.requirePin ? "yes" : "no"}
                onChange={(event) =>
                  updateCreateFeatures("requirePin", event.target.value === "yes")
                }
              >
                <option value="yes">{tr("Yes", "Si")}</option>
                <option value="no">{tr("No", "No")}</option>
              </select>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">
                {tr("Manual Time Edits", "Ediciones Manuales de Tiempo")}
              </label>
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
                <option value="yes">{tr("Yes", "Si")}</option>
                <option value="no">{tr("No", "No")}</option>
              </select>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">
                {tr("Daily Sales Reporting", "Reporte Diario de Ventas")}
              </label>
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
                <option value="yes">{tr("Yes", "Si")}</option>
                <option value="no">{tr("No", "No")}</option>
              </select>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">
                {tr("Company Orders", "Ordenes de Compania")}
              </label>
              <select
                className="form-select"
                value={createForm.features.companyOrdersEnabled ? "yes" : "no"}
                onChange={(event) =>
                  updateCreateFeatures(
                    "companyOrdersEnabled",
                    event.target.value === "yes",
                  )
                }
              >
                <option value="yes">{tr("Yes", "Si")}</option>
                <option value="no">{tr("No", "No")}</option>
              </select>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">
                {tr("Multi-Location", "Multi-Ubicacion")}
              </label>
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
                <option value="yes">{tr("Yes", "Si")}</option>
                <option value="no">{tr("No", "No")}</option>
              </select>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">
                {tr("Liquor Inventory", "Inventario de Licor")}
              </label>
              <select
                className="form-select"
                value={createForm.features.liquorInventoryEnabled ? "yes" : "no"}
                onChange={(event) =>
                  updateCreateFeatures(
                    "liquorInventoryEnabled",
                    event.target.value === "yes",
                  )
                }
              >
                <option value="yes">{tr("Yes", "Si")}</option>
                <option value="no">{tr("No", "No")}</option>
              </select>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">
                {tr("Premium Features", "Funciones Premium")}
              </label>
              <select
                className="form-select"
                value={createForm.features.premiumFeaturesEnabled ? "yes" : "no"}
                onChange={(event) =>
                  updateCreateFeatures(
                    "premiumFeaturesEnabled",
                    event.target.value === "yes",
                  )
                }
              >
                <option value="yes">{tr("Yes", "Si")}</option>
                <option value="no">{tr("No", "No")}</option>
              </select>
            </div>
            <div className="col-12">
              <button className="btn btn-primary" type="submit" disabled={creating}>
                {creating
                  ? tr("Creating...", "Creando...")
                  : tr("Create Tenant", "Crear Tenant")}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="admin-card">
        <h2 className="h5 mb-3">
          {tr("Existing Tenant Accounts", "Cuentas de Tenant Existentes")}
        </h2>
        {loading ? (
          <p className="mb-0">
            {tr("Loading tenant accounts...", "Cargando cuentas de tenant...")}
          </p>
        ) : tenants.length === 0 ? (
          <p className="mb-0">
            {tr("No tenant accounts yet.", "Aun no hay cuentas de tenant.")}
          </p>
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
                          {tr("Daily Sales", "Ventas Diarias")}{" "}
                          {featureState.dailySalesReportingEnabled
                            ? tr("On", "On")
                            : tr("Off", "Off")}
                        </span>
                        <span
                          className={`badge ${featureState.reportsEnabled ? "text-bg-success" : "text-bg-secondary"}`}
                        >
                          {tr("Reports", "Reportes")}{" "}
                          {featureState.reportsEnabled
                            ? tr("On", "On")
                            : tr("Off", "Off")}
                        </span>
                        <span
                          className={`badge ${featureState.requirePin ? "text-bg-success" : "text-bg-secondary"}`}
                        >
                          {tr("Require PIN", "Requiere PIN")}{" "}
                          {featureState.requirePin ? tr("On", "On") : tr("Off", "Off")}
                        </span>
                        <span
                          className={`badge ${featureState.allowManualTimeEdits ? "text-bg-success" : "text-bg-secondary"}`}
                        >
                          {tr("Manual Edits", "Ediciones Manuales")}{" "}
                          {featureState.allowManualTimeEdits
                            ? tr("On", "On")
                            : tr("Off", "Off")}
                        </span>
                        <span
                          className={`badge ${featureState.companyOrdersEnabled ? "text-bg-success" : "text-bg-secondary"}`}
                        >
                          {tr("Company Orders", "Ordenes de Compania")}{" "}
                          {featureState.companyOrdersEnabled
                            ? tr("On", "On")
                            : tr("Off", "Off")}
                        </span>
                        <span
                          className={`badge ${featureState.multiLocationEnabled ? "text-bg-success" : "text-bg-secondary"}`}
                        >
                          {tr("Multi-Location", "Multi-Ubicacion")}{" "}
                          {featureState.multiLocationEnabled
                            ? tr("On", "On")
                            : tr("Off", "Off")}
                        </span>
                        <span
                          className={`badge ${featureState.liquorInventoryEnabled ? "text-bg-success" : "text-bg-secondary"}`}
                        >
                          {tr("Liquor Inventory", "Inventario de Licor")}{" "}
                          {featureState.liquorInventoryEnabled
                            ? tr("On", "On")
                            : tr("Off", "Off")}
                        </span>
                        <span
                          className={`badge ${featureState.premiumFeaturesEnabled ? "text-bg-success" : "text-bg-secondary"}`}
                        >
                          {tr("Premium", "Premium")}{" "}
                          {featureState.premiumFeaturesEnabled
                            ? tr("On", "On")
                            : tr("Off", "Off")}
                        </span>
                      </div>
                    </div>
                    <div className="d-flex gap-2 flex-wrap">
                      <span
                        className={`badge ${tenant.isActive ? "text-bg-success" : "text-bg-secondary"}`}
                      >
                        {tenant.isActive
                          ? tr("Active", "Activo")
                          : tr("Inactive", "Inactivo")}
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() =>
                          setEditingTenantId((prev) => (prev === tenant.id ? null : tenant.id))
                        }
                      >
                        {isEditing ? tr("Close", "Cerrar") : tr("Edit", "Editar")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-info"
                        onClick={() =>
                          setFeaturesTenantId((prev) => (prev === tenant.id ? null : tenant.id))
                        }
                      >
                        {isFeatureOpen
                          ? tr("Close Features", "Cerrar Funciones")
                          : tr("Features", "Funciones")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        disabled={togglingTenantId === tenant.id}
                        onClick={() => void handleToggleActive(tenant)}
                      >
                        {tenant.isActive
                          ? tr("Deactivate", "Desactivar")
                          : tr("Activate", "Activar")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        disabled={deletingTenantId === tenant.id}
                        onClick={() => {
                          void openPendingDeleteDialog(tenant);
                        }}
                      >
                        {deletingTenantId === tenant.id
                          ? tr("Deleting...", "Eliminando...")
                          : tr("Delete", "Eliminar")}
                      </button>
                    </div>
                  </div>

                  {isFeatureOpen && draft && (
                    <div className="row g-3 mt-2 border rounded p-3 bg-body-tertiary">
                      <div className="col-12">
                        <div className="fw-semibold">
                          {tr("Tenant Feature Controls", "Controles de Funciones del Tenant")}
                        </div>
                        <div className="small text-muted">
                          {tr(
                            "Enable or disable features for this tenant.",
                            "Habilita o deshabilita funciones para este tenant.",
                          )}
                        </div>
                      </div>
                      <div className="col-12 col-md-3">
                        <label className="form-label">
                          {tr("Daily Sales Reporting", "Reporte Diario de Ventas")}
                        </label>
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
                          <option value="yes">{tr("Yes", "Si")}</option>
                          <option value="no">{tr("No", "No")}</option>
                        </select>
                      </div>
                      <div className="col-12 col-md-3">
                        <label className="form-label">
                          {tr("Reports Enabled", "Reportes Habilitados")}
                        </label>
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
                          <option value="yes">{tr("Yes", "Si")}</option>
                          <option value="no">{tr("No", "No")}</option>
                        </select>
                      </div>
                      <div className="col-12 col-md-3">
                        <label className="form-label">
                          {tr("Require PIN", "Requiere PIN")}
                        </label>
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
                          <option value="yes">{tr("Yes", "Si")}</option>
                          <option value="no">{tr("No", "No")}</option>
                        </select>
                      </div>
                      <div className="col-12 col-md-3">
                        <label className="form-label">
                          {tr("Manual Time Edits", "Ediciones Manuales de Tiempo")}
                        </label>
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
                          <option value="yes">{tr("Yes", "Si")}</option>
                          <option value="no">{tr("No", "No")}</option>
                        </select>
                      </div>
                      <div className="col-12 col-md-3">
                        <label className="form-label">
                          {tr("Multi-Location", "Multi-Ubicacion")}
                        </label>
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
                          <option value="yes">{tr("Yes", "Si")}</option>
                          <option value="no">{tr("No", "No")}</option>
                        </select>
                      </div>
                      <div className="col-12 col-md-3">
                        <label className="form-label">
                          {tr("Company Orders", "Ordenes de Compania")}
                        </label>
                        <select
                          className="form-select"
                          value={draft.features.companyOrdersEnabled ? "yes" : "no"}
                          onChange={(event) =>
                            updateDraftFeatures(
                              tenant.id,
                              "companyOrdersEnabled",
                              event.target.value === "yes",
                            )
                          }
                        >
                          <option value="yes">{tr("Yes", "Si")}</option>
                          <option value="no">{tr("No", "No")}</option>
                        </select>
                      </div>
                      <div className="col-12 col-md-3">
                        <label className="form-label">
                          {tr("Liquor Inventory", "Inventario de Licor")}
                        </label>
                        <select
                          className="form-select"
                          value={draft.features.liquorInventoryEnabled ? "yes" : "no"}
                          onChange={(event) =>
                            updateDraftFeatures(
                              tenant.id,
                              "liquorInventoryEnabled",
                              event.target.value === "yes",
                            )
                          }
                        >
                          <option value="yes">{tr("Yes", "Si")}</option>
                          <option value="no">{tr("No", "No")}</option>
                        </select>
                      </div>
                      <div className="col-12 col-md-3">
                        <label className="form-label">
                          {tr("Premium Features", "Funciones Premium")}
                        </label>
                        <select
                          className="form-select"
                          value={draft.features.premiumFeaturesEnabled ? "yes" : "no"}
                          onChange={(event) =>
                            updateDraftFeatures(
                              tenant.id,
                              "premiumFeaturesEnabled",
                              event.target.value === "yes",
                            )
                          }
                        >
                          <option value="yes">{tr("Yes", "Si")}</option>
                          <option value="no">{tr("No", "No")}</option>
                        </select>
                      </div>
                      <div className="col-12 d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={savingTenantId === tenant.id}
                          onClick={() => void handleSave(tenant.id)}
                        >
                          {savingTenantId === tenant.id
                            ? tr("Saving...", "Guardando...")
                            : tr("Save Features", "Guardar Funciones")}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setFeaturesTenantId(null)}
                        >
                          {tr("Close", "Cerrar")}
                        </button>
                      </div>
                    </div>
                  )}

                  {isEditing && draft && (
                    <div className="row g-3 mt-2">
                      <div className="col-12 col-md-6">
                        <label className="form-label">
                          {tr("Tenant Name", "Nombre del Tenant")}
                        </label>
                        <input
                          className="form-control"
                          value={draft.name}
                          onChange={(event) =>
                            updateDraft(tenant.id, "name", event.target.value)
                          }
                        />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label">{tr("Subdomain", "Subdominio")}</label>
                        <input
                          className="form-control"
                          value={draft.subdomain}
                          onChange={(event) =>
                            updateDraft(tenant.id, "subdomain", event.target.value)
                          }
                        />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label">
                          {tr("Admin Username", "Usuario Admin")}
                        </label>
                        <input
                          className="form-control"
                          value={draft.adminUsername}
                          onChange={(event) =>
                            updateDraft(tenant.id, "adminUsername", event.target.value)
                          }
                        />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label">
                          {tr("Admin Password", "Contrasena Admin")}
                        </label>
                        <input
                          className="form-control"
                          type="password"
                          placeholder={tr(
                            "Leave blank to keep current password",
                            "Deja en blanco para conservar la contrasena actual",
                          )}
                          value={draft.adminPassword}
                          onChange={(event) =>
                            updateDraft(tenant.id, "adminPassword", event.target.value)
                          }
                        />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label">{tr("Owner Email", "Correo Owner")}</label>
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
                        <label className="form-label">{tr("Owner Name", "Nombre Owner")}</label>
                        <input
                          className="form-control"
                          value={draft.ownerName}
                          onChange={(event) =>
                            updateDraft(tenant.id, "ownerName", event.target.value)
                          }
                        />
                      </div>
                      <div className="col-12 col-md-3">
                        <label className="form-label">{tr("Timezone", "Zona Horaria")}</label>
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
                        <label className="form-label">
                          {tr("Rounding Minutes", "Minutos de Redondeo")}
                        </label>
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
                        <label className="form-label">
                          {tr("Account Enabled", "Cuenta Habilitada")}
                        </label>
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
                          <option value="yes">{tr("Yes", "Si")}</option>
                          <option value="no">{tr("No", "No")}</option>
                        </select>
                      </div>
                      <div className="col-12 col-md-3">
                        <label className="form-label">
                          {tr("Reports Enabled", "Reportes Habilitados")}
                        </label>
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
                          <option value="yes">{tr("Yes", "Si")}</option>
                          <option value="no">{tr("No", "No")}</option>
                        </select>
                      </div>
                      <div className="col-12 col-md-3">
                        <label className="form-label">{tr("Require PIN", "Requiere PIN")}</label>
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
                          <option value="yes">{tr("Yes", "Si")}</option>
                          <option value="no">{tr("No", "No")}</option>
                        </select>
                      </div>
                      <div className="col-12 col-md-3">
                        <label className="form-label">
                          {tr("Manual Time Edits", "Ediciones Manuales de Tiempo")}
                        </label>
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
                          <option value="yes">{tr("Yes", "Si")}</option>
                          <option value="no">{tr("No", "No")}</option>
                        </select>
                      </div>
                      <div className="col-12 col-md-3">
                        <label className="form-label">
                          {tr("Daily Sales Reporting", "Reporte Diario de Ventas")}
                        </label>
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
                          <option value="yes">{tr("Yes", "Si")}</option>
                          <option value="no">{tr("No", "No")}</option>
                        </select>
                      </div>
                      <div className="col-12 col-md-3">
                        <label className="form-label">
                          {tr("Company Orders", "Ordenes de Compania")}
                        </label>
                        <select
                          className="form-select"
                          value={draft.features.companyOrdersEnabled ? "yes" : "no"}
                          onChange={(event) =>
                            updateDraftFeatures(
                              tenant.id,
                              "companyOrdersEnabled",
                              event.target.value === "yes",
                            )
                          }
                        >
                          <option value="yes">{tr("Yes", "Si")}</option>
                          <option value="no">{tr("No", "No")}</option>
                        </select>
                      </div>
                      <div className="col-12 col-md-3">
                        <label className="form-label">
                          {tr("Multi-Location", "Multi-Ubicacion")}
                        </label>
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
                          <option value="yes">{tr("Yes", "Si")}</option>
                          <option value="no">{tr("No", "No")}</option>
                        </select>
                      </div>
                      <div className="col-12 col-md-3">
                        <label className="form-label">
                          {tr("Liquor Inventory", "Inventario de Licor")}
                        </label>
                        <select
                          className="form-select"
                          value={draft.features.liquorInventoryEnabled ? "yes" : "no"}
                          onChange={(event) =>
                            updateDraftFeatures(
                              tenant.id,
                              "liquorInventoryEnabled",
                              event.target.value === "yes",
                            )
                          }
                        >
                          <option value="yes">{tr("Yes", "Si")}</option>
                          <option value="no">{tr("No", "No")}</option>
                        </select>
                      </div>
                      <div className="col-12 col-md-3">
                        <label className="form-label">
                          {tr("Premium Features", "Funciones Premium")}
                        </label>
                        <select
                          className="form-select"
                          value={draft.features.premiumFeaturesEnabled ? "yes" : "no"}
                          onChange={(event) =>
                            updateDraftFeatures(
                              tenant.id,
                              "premiumFeaturesEnabled",
                              event.target.value === "yes",
                            )
                          }
                        >
                          <option value="yes">{tr("Yes", "Si")}</option>
                          <option value="no">{tr("No", "No")}</option>
                        </select>
                      </div>
                      <div className="col-12 d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={savingTenantId === tenant.id}
                          onClick={() => void handleSave(tenant.id)}
                        >
                          {savingTenantId === tenant.id
                            ? tr("Saving...", "Guardando...")
                            : tr("Save", "Guardar")}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setEditingTenantId(null)}
                        >
                          {tr("Cancel", "Cancelar")}
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
          onClick={closePendingDeleteDialog}
        >
          <div
            className="embedded-confirm-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="embedded-confirm-title">
              {tr("Delete Tenant", "Eliminar Tenant")}
            </h2>
            <p className="embedded-confirm-message">
              {tr(
                `Review tenant "${pendingDeleteTenant.name}" data before deleting. This action is permanent.`,
                `Revisa los datos del tenant "${pendingDeleteTenant.name}" antes de eliminar. Esta accion es permanente.`,
              )}
            </p>

            {pendingDeleteLoading ? (
              <div className="text-muted small mb-3">
                {tr("Inspecting tenant data...", "Inspeccionando datos del tenant...")}
              </div>
            ) : pendingDeleteReport ? (
              <>
                {pendingDeleteReport.hasData ? (
                  <div className="alert alert-warning py-2 mb-3">
                    <div className="fw-semibold">{tr("Data detected", "Datos detectados")}</div>
                    <div className="small">
                      {pendingDeleteReport.totalRecords}{" "}
                      {tr(
                        "records found. Download all exports below before permanent delete.",
                        "registros encontrados. Descarga todas las exportaciones de abajo antes de la eliminacion permanente.",
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="alert alert-success py-2 mb-3">
                    <div className="small">
                      {tr(
                        "No related tenant data found. This tenant can be deleted now.",
                        "No se encontraron datos relacionados del tenant. Este tenant se puede eliminar ahora.",
                      )}
                    </div>
                  </div>
                )}

                {pendingDeleteReport.blockers.length > 0 ? (
                  <div className="mb-3">
                    <div className="fw-semibold small mb-1">
                      {tr("Data present", "Datos presentes")}
                    </div>
                    <ul className="mb-0 small">
                      {pendingDeleteReport.blockers.map((item) => (
                        <li key={`delete-data-${item.key}`}>
                          {item.label}: {item.count}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="small text-muted mb-2">
                  {tr("Snapshot generated", "Corte generado")}{" "}
                  {new Date(pendingDeleteReport.generatedAt).toLocaleString()}.
                </div>

                {pendingDeleteReport.hasData ? (
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      disabled={pendingDeleteExporting !== null}
                      onClick={() => void downloadPendingDeleteExport("summary")}
                    >
                      {pendingDeleteExporting === "summary"
                        ? tr("Downloading...", "Descargando...")
                        : pendingDeleteDownloads.summary
                          ? tr("Summary Downloaded", "Resumen Descargado")
                          : tr("Download Friendly Report", "Descargar Reporte Amigable")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      disabled={pendingDeleteExporting !== null}
                      onClick={() => void downloadPendingDeleteExport("excel")}
                    >
                      {pendingDeleteExporting === "excel"
                        ? tr("Downloading...", "Descargando...")
                        : pendingDeleteDownloads.excel
                          ? tr("Excel Downloaded", "Excel Descargado")
                          : tr("Download Excel", "Descargar Excel")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      disabled={pendingDeleteExporting !== null}
                      onClick={() => void downloadPendingDeleteExport("sql")}
                    >
                      {pendingDeleteExporting === "sql"
                        ? tr("Downloading...", "Descargando...")
                        : pendingDeleteDownloads.sql
                          ? tr("SQL Downloaded", "SQL Descargado")
                          : tr("Download SQL", "Descargar SQL")}
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="text-muted small mb-3">
                {tr(
                  "Unable to load tenant data summary.",
                  "No se pudo cargar el resumen de datos del tenant.",
                )}
              </div>
            )}

            <div className="embedded-confirm-actions">
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={pendingDeleteBusy || pendingDeleteLoading}
                onClick={closePendingDeleteDialog}
              >
                {tr("Cancel", "Cancelar")}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={
                  pendingDeleteBusy ||
                  pendingDeleteLoading ||
                  pendingDeleteExporting !== null ||
                  !pendingDeleteReadyToDelete
                }
                onClick={() => void onConfirmPendingDelete()}
              >
                {pendingDeleteBusy
                  ? tr("Deleting...", "Eliminando...")
                  : pendingDeleteRequiresExports && !pendingDeleteReadyToDelete
                    ? tr("Download All Files First", "Primero Descarga Todos los Archivos")
                    : tr("Confirm Delete", "Confirmar Eliminacion")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
