"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";

type CompanySettings = {
  companyName: string;
  companyLegalName: string;
  companyAddressLine1: string;
  companyAddressLine2: string;
  companyCity: string;
  companyState: string;
  companyPostalCode: string;
  companyCountry: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  companyTaxId: string;
};

type Lang = "en" | "es";

const translations: Record<
  Lang,
  {
    title: string;
    saved: string;
    saveError: string;
    logoTitle: string;
    logoSubtitle: string;
    companyName: string;
    legalName: string;
    phone: string;
    email: string;
    website: string;
    taxId: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    companyNamePlaceholder: string;
    legalNamePlaceholder: string;
    phonePlaceholder: string;
    emailPlaceholder: string;
    websitePlaceholder: string;
    taxIdPlaceholder: string;
    addressLine1Placeholder: string;
    addressLine2Placeholder: string;
    save: string;
    saving: string;
  }
> = {
  en: {
    title: "Company Info",
    saved: "Company info saved.",
    saveError: "Unable to save company info.",
    logoTitle: "Auto Logo Preview",
    logoSubtitle: "Generated from your company name using pure CSS.",
    companyName: "Company Name",
    legalName: "Legal Name",
    phone: "Phone",
    email: "Email",
    website: "Website",
    taxId: "Tax ID",
    addressLine1: "Address Line 1",
    addressLine2: "Address Line 2",
    city: "City",
    state: "State / Province",
    postalCode: "Postal Code",
    country: "Country",
    companyNamePlaceholder: "Websys Workforce",
    legalNamePlaceholder: "Websys Workforce LLC",
    phonePlaceholder: "+1 (555) 000-0000",
    emailPlaceholder: "info@yourcompany.com",
    websitePlaceholder: "https://yourcompany.com",
    taxIdPlaceholder: "Tax / VAT Number",
    addressLine1Placeholder: "Street, number, suite",
    addressLine2Placeholder: "Building, floor, optional",
    save: "Save Company Info",
    saving: "Saving...",
  },
  es: {
    title: "Información de la Empresa",
    saved: "Información de empresa guardada.",
    saveError: "No se pudo guardar la información de la empresa.",
    logoTitle: "Vista Previa de Logo Automático",
    logoSubtitle: "Generado desde el nombre de tu empresa usando solo CSS.",
    companyName: "Nombre de Empresa",
    legalName: "Razón Social",
    phone: "Teléfono",
    email: "Correo",
    website: "Sitio Web",
    taxId: "ID Fiscal",
    addressLine1: "Dirección Línea 1",
    addressLine2: "Dirección Línea 2",
    city: "Ciudad",
    state: "Estado / Provincia",
    postalCode: "Código Postal",
    country: "País",
    companyNamePlaceholder: "Websys Workforce",
    legalNamePlaceholder: "Websys Workforce LLC",
    phonePlaceholder: "+1 (555) 000-0000",
    emailPlaceholder: "info@tuempresa.com",
    websitePlaceholder: "https://tuempresa.com",
    taxIdPlaceholder: "Número fiscal / VAT",
    addressLine1Placeholder: "Calle, número, suite",
    addressLine2Placeholder: "Edificio, piso, opcional",
    save: "Guardar Información",
    saving: "Guardando...",
  },
};

const defaults: CompanySettings = {
  companyName: "",
  companyLegalName: "",
  companyAddressLine1: "",
  companyAddressLine2: "",
  companyCity: "",
  companyState: "",
  companyPostalCode: "",
  companyCountry: "",
  companyPhone: "",
  companyEmail: "",
  companyWebsite: "",
  companyTaxId: "",
};

const getInitials = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "CO";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
};

const hashHue = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 360;
  }
  return hash;
};

export default function CompanyInfoPage() {
  const [form, setForm] = useState<CompanySettings>(defaults);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const t = useMemo(() => translations[lang] ?? translations.en, [lang]);

  useEffect(() => {
    const syncLang = () => {
      if (typeof window === "undefined") {
        return;
      }
      const stored = window.localStorage.getItem("clockin-lang");
      setLang(stored === "es" ? "es" : "en");
    };

    syncLang();
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "clockin-lang") {
        syncLang();
      }
    };
    const onLangChange = () => syncLang();
    window.addEventListener("storage", onStorage);
    window.addEventListener(
      "clockin-lang-change",
      onLangChange as EventListener,
    );
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        "clockin-lang-change",
        onLangChange as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/settings", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as Partial<CompanySettings>;
        setForm((prev) => ({ ...prev, ...data }));
      } catch {
        // ignore
      }
    };

    void load();
  }, []);

  const update = (key: keyof CompanySettings, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const logoName = useMemo(
    () => form.companyName.trim() || form.companyLegalName.trim() || "Company",
    [form.companyName, form.companyLegalName],
  );
  const logoInitials = useMemo(() => getInitials(logoName), [logoName]);
  const logoHue = useMemo(() => hashHue(logoName.toLowerCase()), [logoName]);
  const logoStyle = useMemo(
    () =>
      ({
        background: `linear-gradient(135deg, hsl(${logoHue}, 74%, 54%), hsl(${(logoHue + 42) % 360}, 76%, 42%))`,
      }) as CSSProperties,
    [logoHue],
  );

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        setStatus(t.saveError);
        return;
      }
      setStatus(t.saved);
    } catch {
      setStatus(t.saveError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="d-flex flex-column gap-4 company-info-page">
      <div className="admin-header">
        <h1>{t.title}</h1>
      </div>

      <div className="admin-card company-info-card">
        {status && <div className="alert alert-info">{status}</div>}

        <div className="company-logo-bar">
          <div className="company-logo-preview" style={logoStyle}>
            {logoInitials}
          </div>
          <div>
            <div className="company-logo-title">{t.logoTitle}</div>
            <div className="company-logo-subtitle">{t.logoSubtitle}</div>
          </div>
        </div>

        <form onSubmit={save} className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label">{t.companyName}</label>
            <input
              className="form-control"
              value={form.companyName}
              onChange={(event) => update("companyName", event.target.value)}
              maxLength={120}
              placeholder={t.companyNamePlaceholder}
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">{t.legalName}</label>
            <input
              className="form-control"
              value={form.companyLegalName}
              onChange={(event) =>
                update("companyLegalName", event.target.value)
              }
              maxLength={120}
              placeholder={t.legalNamePlaceholder}
            />
          </div>

          <div className="col-12 col-md-4">
            <label className="form-label">{t.phone}</label>
            <input
              className="form-control"
              value={form.companyPhone}
              onChange={(event) => update("companyPhone", event.target.value)}
              maxLength={40}
              placeholder={t.phonePlaceholder}
            />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">{t.email}</label>
            <input
              className="form-control"
              value={form.companyEmail}
              onChange={(event) => update("companyEmail", event.target.value)}
              maxLength={120}
              placeholder={t.emailPlaceholder}
            />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">{t.website}</label>
            <input
              className="form-control"
              value={form.companyWebsite}
              onChange={(event) => update("companyWebsite", event.target.value)}
              maxLength={180}
              placeholder={t.websitePlaceholder}
            />
          </div>

          <div className="col-12 col-md-4">
            <label className="form-label">{t.taxId}</label>
            <input
              className="form-control"
              value={form.companyTaxId}
              onChange={(event) => update("companyTaxId", event.target.value)}
              maxLength={60}
              placeholder={t.taxIdPlaceholder}
            />
          </div>

          <div className="col-12">
            <label className="form-label">{t.addressLine1}</label>
            <input
              className="form-control"
              value={form.companyAddressLine1}
              onChange={(event) =>
                update("companyAddressLine1", event.target.value)
              }
              maxLength={180}
              placeholder={t.addressLine1Placeholder}
            />
          </div>
          <div className="col-12">
            <label className="form-label">{t.addressLine2}</label>
            <input
              className="form-control"
              value={form.companyAddressLine2}
              onChange={(event) =>
                update("companyAddressLine2", event.target.value)
              }
              maxLength={180}
              placeholder={t.addressLine2Placeholder}
            />
          </div>

          <div className="col-12 col-md-3">
            <label className="form-label">{t.city}</label>
            <input
              className="form-control"
              value={form.companyCity}
              onChange={(event) => update("companyCity", event.target.value)}
              maxLength={80}
            />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">{t.state}</label>
            <input
              className="form-control"
              value={form.companyState}
              onChange={(event) => update("companyState", event.target.value)}
              maxLength={80}
            />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">{t.postalCode}</label>
            <input
              className="form-control"
              value={form.companyPostalCode}
              onChange={(event) =>
                update("companyPostalCode", event.target.value)
              }
              maxLength={30}
            />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">{t.country}</label>
            <input
              className="form-control"
              value={form.companyCountry}
              onChange={(event) => update("companyCountry", event.target.value)}
              maxLength={80}
            />
          </div>

          <div className="col-12 d-flex gap-2">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? t.saving : t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
