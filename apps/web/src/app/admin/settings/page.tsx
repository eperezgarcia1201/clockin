"use client";

import { useEffect, useMemo, useState } from "react";

type Settings = {
  timezone: string;
  roundingMinutes: number;
  requirePin: boolean;
  ipRestrictions: string;
  reportsEnabled: boolean;
  allowManualTimeEdits: boolean;
  dailySalesReportingEnabled: boolean;
  multiLocationEnabled: boolean;
};

type Lang = "en" | "es";

const translations: Record<
  Lang,
  {
    title: string;
    saved: string;
    saveError: string;
    timezone: string;
    roundingMinutes: string;
    noRounding: string;
    minutes: string;
    ipRestrictions: string;
    ipRestrictionsPlaceholder: string;
    requirePin: string;
    reportsEnabled: string;
    allowManualTimeEdits: string;
    dailySalesReporting: string;
    multiLocation: string;
    enabled: string;
    disabled: string;
    dailySalesReportingHint: string;
    multiLocationHint: string;
    yes: string;
    no: string;
    saveSettings: string;
  }
> = {
  en: {
    title: "System Settings",
    saved: "Settings saved.",
    saveError: "Unable to save settings.",
    timezone: "Timezone",
    roundingMinutes: "Rounding Minutes",
    noRounding: "No rounding",
    minutes: "minutes",
    ipRestrictions: "IP Restrictions",
    ipRestrictionsPlaceholder: "Comma-separated IPs or CIDR ranges",
    requirePin: "Require PIN",
    reportsEnabled: "Reports Enabled",
    allowManualTimeEdits: "Allow Manual Time Edits",
    dailySalesReporting: "Daily Sales Reporting",
    multiLocation: "Multi-Location",
    enabled: "Enabled",
    disabled: "Disabled",
    dailySalesReportingHint:
      "Controlled by owner in the tenant feature toggles.",
    multiLocationHint:
      "Enable this from the owner tenant feature toggles for chain restaurants.",
    yes: "Yes",
    no: "No",
    saveSettings: "Save Settings",
  },
  es: {
    title: "Configuración del Sistema",
    saved: "Configuración guardada.",
    saveError: "No se pudo guardar la configuración.",
    timezone: "Zona Horaria",
    roundingMinutes: "Minutos de Redondeo",
    noRounding: "Sin redondeo",
    minutes: "minutos",
    ipRestrictions: "Restricciones IP",
    ipRestrictionsPlaceholder: "IPs o rangos CIDR separados por comas",
    requirePin: "Requerir PIN",
    reportsEnabled: "Reportes Habilitados",
    allowManualTimeEdits: "Permitir Edición Manual de Tiempo",
    dailySalesReporting: "Reporte Diario de Ventas",
    multiLocation: "Multi-Ubicación",
    enabled: "Habilitado",
    disabled: "Deshabilitado",
    dailySalesReportingHint:
      "Controlado por el owner en los toggles de funciones del tenant.",
    multiLocationHint:
      "Habilitar desde los toggles del owner para cadenas de restaurantes.",
    yes: "Sí",
    no: "No",
    saveSettings: "Guardar Configuración",
  },
};

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "UTC",
];

const roundingOptions = [0, 5, 10, 15, 30];

const defaults: Settings = {
  timezone: "America/New_York",
  roundingMinutes: 15,
  requirePin: true,
  ipRestrictions: "",
  reportsEnabled: true,
  allowManualTimeEdits: true,
  dailySalesReportingEnabled: false,
  multiLocationEnabled: false,
};

export default function SystemSettings() {
  const [form, setForm] = useState<Settings>(defaults);
  const [status, setStatus] = useState<string | null>(null);
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
        const response = await fetch("/api/settings", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = (await response.json()) as Partial<Settings>;
        setForm((prev) => ({ ...prev, ...data }));
      } catch {
        // ignore
      }
    };
    void load();
  }, []);

  const update = (key: keyof Settings, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (response.ok) {
      setStatus(t.saved);
    } else {
      setStatus(t.saveError);
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>{t.title}</h1>
      </div>
      <div className="admin-card">
        {status && <div className="alert alert-info">{status}</div>}
        <form onSubmit={save} className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label">{t.timezone}</label>
            <select
              className="form-select"
              value={form.timezone}
              onChange={(event) => update("timezone", event.target.value)}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">{t.roundingMinutes}</label>
            <select
              className="form-select"
              value={form.roundingMinutes}
              onChange={(event) =>
                update("roundingMinutes", Number(event.target.value))
              }
            >
              {roundingOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 0 ? t.noRounding : `${opt} ${t.minutes}`}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12">
            <label className="form-label">{t.ipRestrictions}</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder={t.ipRestrictionsPlaceholder}
              value={form.ipRestrictions}
              onChange={(event) => update("ipRestrictions", event.target.value)}
            />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">{t.requirePin}</label>
            <select
              className="form-select"
              value={form.requirePin ? "yes" : "no"}
              onChange={(event) =>
                update("requirePin", event.target.value === "yes")
              }
            >
              <option value="yes">{t.yes}</option>
              <option value="no">{t.no}</option>
            </select>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">{t.reportsEnabled}</label>
            <select
              className="form-select"
              value={form.reportsEnabled ? "yes" : "no"}
              onChange={(event) =>
                update("reportsEnabled", event.target.value === "yes")
              }
            >
              <option value="yes">{t.yes}</option>
              <option value="no">{t.no}</option>
            </select>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">{t.allowManualTimeEdits}</label>
            <select
              className="form-select"
              value={form.allowManualTimeEdits ? "yes" : "no"}
              onChange={(event) =>
                update("allowManualTimeEdits", event.target.value === "yes")
              }
            >
              <option value="yes">{t.yes}</option>
              <option value="no">{t.no}</option>
            </select>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">{t.dailySalesReporting}</label>
            <input
              className="form-control"
              value={form.dailySalesReportingEnabled ? t.enabled : t.disabled}
              readOnly
            />
            <small className="text-muted">{t.dailySalesReportingHint}</small>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">{t.multiLocation}</label>
            <input
              className="form-control"
              value={form.multiLocationEnabled ? t.enabled : t.disabled}
              readOnly
            />
            <small className="text-muted">{t.multiLocationHint}</small>
          </div>
          <div className="col-12 d-flex gap-2">
            <button className="btn btn-primary" type="submit">
              {t.saveSettings}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
