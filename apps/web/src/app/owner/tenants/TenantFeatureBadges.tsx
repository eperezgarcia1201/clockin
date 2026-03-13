"use client";

type TenantFeatures = {
  requirePin: boolean;
  reportsEnabled: boolean;
  allowManualTimeEdits: boolean;
  dailySalesReportingEnabled: boolean;
  companyOrdersEnabled: boolean;
  multiLocationEnabled: boolean;
  websysPosEnabled: boolean;
  liquorInventoryEnabled: boolean;
  premiumFeaturesEnabled: boolean;
};

type TenantFeatureBadgesProps = {
  features: TenantFeatures;
  tr: (en: string, es: string) => string;
};

export default function TenantFeatureBadges({
  features,
  tr,
}: TenantFeatureBadgesProps) {
  return (
    <div className="d-flex flex-wrap gap-2 mt-2">
      <span
        className={`badge ${features.websysPosEnabled ? "text-bg-primary" : "text-bg-secondary"}`}
      >
        {tr("Websys POS", "Websys POS")}{" "}
        {features.websysPosEnabled ? tr("On", "On") : tr("Off", "Off")}
      </span>
      <span
        className={`badge ${features.dailySalesReportingEnabled ? "text-bg-success" : "text-bg-secondary"}`}
      >
        {tr("Daily Sales", "Ventas Diarias")}{" "}
        {features.dailySalesReportingEnabled ? tr("On", "On") : tr("Off", "Off")}
      </span>
      <span
        className={`badge ${features.reportsEnabled ? "text-bg-success" : "text-bg-secondary"}`}
      >
        {tr("Reports", "Reportes")}{" "}
        {features.reportsEnabled ? tr("On", "On") : tr("Off", "Off")}
      </span>
      <span
        className={`badge ${features.requirePin ? "text-bg-success" : "text-bg-secondary"}`}
      >
        {tr("Require PIN", "Requiere PIN")}{" "}
        {features.requirePin ? tr("On", "On") : tr("Off", "Off")}
      </span>
      <span
        className={`badge ${features.allowManualTimeEdits ? "text-bg-success" : "text-bg-secondary"}`}
      >
        {tr("Manual Edits", "Ediciones Manuales")}{" "}
        {features.allowManualTimeEdits ? tr("On", "On") : tr("Off", "Off")}
      </span>
      <span
        className={`badge ${features.companyOrdersEnabled ? "text-bg-success" : "text-bg-secondary"}`}
      >
        {tr("Company Orders", "Ordenes de Compania")}{" "}
        {features.companyOrdersEnabled ? tr("On", "On") : tr("Off", "Off")}
      </span>
      <span
        className={`badge ${features.multiLocationEnabled ? "text-bg-success" : "text-bg-secondary"}`}
      >
        {tr("Multi-Location", "Multi-Ubicacion")}{" "}
        {features.multiLocationEnabled ? tr("On", "On") : tr("Off", "Off")}
      </span>
      <span
        className={`badge ${features.liquorInventoryEnabled ? "text-bg-success" : "text-bg-secondary"}`}
      >
        {tr("Liquor Inventory", "Inventario de Licor")}{" "}
        {features.liquorInventoryEnabled ? tr("On", "On") : tr("Off", "Off")}
      </span>
      <span
        className={`badge ${features.premiumFeaturesEnabled ? "text-bg-success" : "text-bg-secondary"}`}
      >
        {tr("Premium", "Premium")}{" "}
        {features.premiumFeaturesEnabled ? tr("On", "On") : tr("Off", "Off")}
      </span>
    </div>
  );
}
