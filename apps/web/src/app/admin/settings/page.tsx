"use client";

import { useEffect, useMemo, useState } from "react";
import { getSettings, updateSettings } from "../../../lib/api/settings-admin";
import { getAccessMe, type AccessMe } from "../../../lib/api/access";
import {
  settingsTranslations,
  type SettingsLang as Lang,
} from "./settings-copy";

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

const pickSystemSettings = (value: unknown): Settings => {
  const source =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : ({} as Record<string, unknown>);

  return {
    timezone:
      typeof source.timezone === "string" && source.timezone.trim()
        ? source.timezone
        : defaults.timezone,
    roundingMinutes:
      typeof source.roundingMinutes === "number" &&
      Number.isFinite(source.roundingMinutes)
        ? source.roundingMinutes
        : defaults.roundingMinutes,
    requirePin:
      typeof source.requirePin === "boolean"
        ? source.requirePin
        : defaults.requirePin,
    ipRestrictions:
      typeof source.ipRestrictions === "string"
        ? source.ipRestrictions
        : defaults.ipRestrictions,
    reportsEnabled:
      typeof source.reportsEnabled === "boolean"
        ? source.reportsEnabled
        : defaults.reportsEnabled,
    allowManualTimeEdits:
      typeof source.allowManualTimeEdits === "boolean"
        ? source.allowManualTimeEdits
        : defaults.allowManualTimeEdits,
    dailySalesReportingEnabled:
      typeof source.dailySalesReportingEnabled === "boolean"
        ? source.dailySalesReportingEnabled
        : defaults.dailySalesReportingEnabled,
    multiLocationEnabled:
      typeof source.multiLocationEnabled === "boolean"
        ? source.multiLocationEnabled
        : defaults.multiLocationEnabled,
  };
};

export default function SystemSettings() {
  const [form, setForm] = useState<Settings>(defaults);
  const [status, setStatus] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("en");
  const [accessInfo, setAccessInfo] = useState<AccessMe | null>(null);
  const t = useMemo(
    () => settingsTranslations[lang] ?? settingsTranslations.en,
    [lang],
  );

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
        const data = await getSettings<Record<string, unknown>>();
        setForm((prev) => ({ ...prev, ...pickSystemSettings(data) }));
      } catch {
        // ignore
      }
    };
    void load();
  }, []);

  useEffect(() => {
    const loadAccess = async () => {
      try {
        const data = await getAccessMe();
        setAccessInfo(data);
      } catch {
        setAccessInfo(null);
      }
    };
    void loadAccess();
  }, []);

  const update = (key: keyof Settings, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    try {
      await updateSettings(pickSystemSettings(form));
      setStatus(t.saved);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t.saveError);
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>{t.title}</h1>
      </div>
      <div className="admin-card">
        <div className="row g-3 mb-2">
          <div className="col-12">
            <h5 className="mb-1">{t.mainAdminTitle}</h5>
            <p className="text-muted mb-0">{t.mainAdminDescription}</p>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">{t.tenantLabel}</label>
            <input
              className="form-control"
              value={String(accessInfo?.tenantName || "")}
              readOnly
            />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">{t.mainUsernameLabel}</label>
            <input
              className="form-control"
              value={String(
                accessInfo?.mainAdminUsername || accessInfo?.adminUsername || "",
              )}
              readOnly
            />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">{t.ownerEmailLabel}</label>
            <input
              className="form-control"
              value={String(accessInfo?.tenantOwnerEmail || "")}
              readOnly
            />
          </div>
        </div>
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
