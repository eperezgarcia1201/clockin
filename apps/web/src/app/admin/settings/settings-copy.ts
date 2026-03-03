export type SettingsLang = "en" | "es";

export type SettingsTranslation = {
  title: string;
  mainAdminTitle: string;
  mainAdminDescription: string;
  tenantLabel: string;
  mainUsernameLabel: string;
  ownerEmailLabel: string;
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
};

export const settingsTranslations: Record<
  SettingsLang,
  SettingsTranslation
> = {
  en: {
    title: "System Settings",
    mainAdminTitle: "Main Admin",
    mainAdminDescription: "Primary tenant-level admin account details.",
    tenantLabel: "Tenant",
    mainUsernameLabel: "Main username",
    ownerEmailLabel: "Owner email",
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
    mainAdminTitle: "Administrador Principal",
    mainAdminDescription: "Datos de la cuenta principal del tenant.",
    tenantLabel: "Tenant",
    mainUsernameLabel: "Usuario principal",
    ownerEmailLabel: "Correo owner",
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
