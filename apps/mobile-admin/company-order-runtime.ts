import type {
  CompanyOrderCatalogItem,
  CompanyOrderCatalogSupplier,
  CompanyOrderComparisonUnit,
  CompanyOrderRow,
} from "./types";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

const normalizeComparisonUnit = (
  value: unknown,
): CompanyOrderComparisonUnit => (value === "lb" ? "lb" : "each");

const normalizeCatalogItem = (
  item: CompanyOrderCatalogItem | Record<string, unknown>,
): CompanyOrderCatalogItem | null => {
  const nameEs =
    typeof item.nameEs === "string" ? item.nameEs.trim() : "";
  const nameEn =
    typeof item.nameEn === "string" ? item.nameEn.trim() : "";
  if (!nameEs || !nameEn) {
    return null;
  }
  return {
    nameEs,
    nameEn,
    comparisonUnit: normalizeComparisonUnit(
      (item as Record<string, unknown>).comparisonUnit,
    ),
  };
};

export const normalizeCompanyOrderSuppliers = (payload: {
  suppliers?: CompanyOrderCatalogSupplier[];
}): CompanyOrderCatalogSupplier[] =>
  Array.isArray(payload.suppliers)
    ? payload.suppliers
        .map((supplier) => {
          const supplierName =
            typeof supplier?.supplierName === "string"
              ? supplier.supplierName.trim()
              : "";
          const items = Array.isArray(supplier?.items)
            ? supplier.items
                .map((item) =>
                  normalizeCatalogItem(item as CompanyOrderCatalogItem),
                )
                .filter(
                  (item): item is CompanyOrderCatalogItem => item !== null,
                )
            : [];
          if (!supplierName || !items.length) {
            return null;
          }
          return {
            supplierName,
            items,
          };
        })
        .filter(
          (supplier): supplier is CompanyOrderCatalogSupplier =>
            supplier !== null,
        )
    : [];

export const pickCompanyOrderSupplier = (
  previousSupplierName: string,
  suppliers: CompanyOrderCatalogSupplier[],
): string => {
  if (
    previousSupplierName &&
    suppliers.some((supplier) => supplier.supplierName === previousSupplierName)
  ) {
    return previousSupplierName;
  }
  return suppliers[0]?.supplierName || "";
};

export const buildCompanyOrdersQueryString = (
  officeId: string,
  limit: number,
): string => {
  const query = new URLSearchParams();
  query.set("limit", String(limit));
  if (officeId) {
    query.set("officeId", officeId);
  }
  return query.toString();
};

export const normalizeCompanyOrderRows = (payload: {
  orders?: CompanyOrderRow[];
}): CompanyOrderRow[] => (Array.isArray(payload.orders) ? payload.orders : []);

export const resolveCompanyOrderCatalogLoad = (
  payload: { suppliers?: CompanyOrderCatalogSupplier[] },
  previousSupplierName: string,
): {
  suppliers: CompanyOrderCatalogSupplier[];
  selectedSupplierName: string;
} => {
  const suppliers = normalizeCompanyOrderSuppliers(payload);
  return {
    suppliers,
    selectedSupplierName: pickCompanyOrderSupplier(previousSupplierName, suppliers),
  };
};

export const resolveCompanyOrderRowsLoad = (payload: {
  orders?: CompanyOrderRow[];
}): {
  orders: CompanyOrderRow[];
  lastSubmittedWeekStart: string | null;
} => {
  const orders = normalizeCompanyOrderRows(payload);
  return {
    orders,
    lastSubmittedWeekStart: orders[0]?.weekStartDate || null,
  };
};

export const loadCompanyOrderCatalogData = async (params: {
  fetchJson: FetchJson;
  previousSupplierName: string;
}): Promise<
  | {
      ok: true;
      suppliers: CompanyOrderCatalogSupplier[];
      selectedSupplierName: string;
    }
  | { ok: false; error: string }
> => {
  try {
    const data = (await params.fetchJson("/company-orders/catalog")) as {
      suppliers?: CompanyOrderCatalogSupplier[];
    };
    const resolved = resolveCompanyOrderCatalogLoad(
      data,
      params.previousSupplierName,
    );
    return {
      ok: true,
      suppliers: resolved.suppliers,
      selectedSupplierName: resolved.selectedSupplierName,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load company catalog.",
    };
  }
};

export const loadCompanyOrdersData = async (params: {
  fetchJson: FetchJson;
  officeId: string;
  limit: number;
}): Promise<
  | {
      ok: true;
      orders: CompanyOrderRow[];
      lastSubmittedWeekStart: string | null;
    }
  | { ok: false; error: string }
> => {
  try {
    const query = buildCompanyOrdersQueryString(params.officeId, params.limit);
    const data = (await params.fetchJson(`/company-orders?${query}`)) as {
      orders?: CompanyOrderRow[];
    };
    const resolved = resolveCompanyOrderRowsLoad(data);
    return {
      ok: true,
      orders: resolved.orders,
      lastSubmittedWeekStart: resolved.lastSubmittedWeekStart,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unable to load company orders.",
    };
  }
};
