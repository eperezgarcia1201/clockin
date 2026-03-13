type TenantListFilter = "all" | "websys-pos" | "standard";

type TenantListFilterTabsProps = {
  tenantFilter: TenantListFilter;
  onChange: (filter: TenantListFilter) => void;
  tr: (english: string, spanish: string) => string;
};

export const resolveTenantFilterEmptyMessage = (
  tenantFilter: TenantListFilter,
  tr: TenantListFilterTabsProps["tr"],
) => {
  if (tenantFilter === "websys-pos") {
    return tr("No Websys POS tenants yet.", "Aun no hay tenants Websys POS.");
  }
  if (tenantFilter === "standard") {
    return tr("No standard tenants yet.", "Aun no hay tenants estandar.");
  }
  return tr("No tenant accounts yet.", "Aun no hay cuentas de tenant.");
};

export default function TenantListFilterTabs({
  tenantFilter,
  onChange,
  tr,
}: TenantListFilterTabsProps) {
  return (
    <div className="d-flex gap-2 flex-wrap">
      <button
        type="button"
        className={`btn btn-sm ${tenantFilter === "all" ? "btn-primary" : "btn-outline-primary"}`}
        onClick={() => onChange("all")}
      >
        {tr("All", "Todos")}
      </button>
      <button
        type="button"
        className={`btn btn-sm ${tenantFilter === "websys-pos" ? "btn-primary" : "btn-outline-primary"}`}
        onClick={() => onChange("websys-pos")}
      >
        {tr("Websys POS Only", "Solo Websys POS")}
      </button>
      <button
        type="button"
        className={`btn btn-sm ${tenantFilter === "standard" ? "btn-primary" : "btn-outline-primary"}`}
        onClick={() => onChange("standard")}
      >
        {tr("Standard Only", "Solo Estandar")}
      </button>
    </div>
  );
}
