import type {
  CompanyOrderCatalogItem,
  CompanyOrderCatalogSupplier,
} from "./types";

export const normalizeCompanyOrderCatalogSuppliers = (payload: {
  suppliers?: Array<{ supplierName?: string; items?: unknown[] }>;
}): CompanyOrderCatalogSupplier[] =>
  (payload.suppliers || [])
    .map((entry) => {
      const supplierName =
        typeof entry?.supplierName === "string" ? entry.supplierName.trim() : "";
      if (!supplierName) {
        return null;
      }
      const items = Array.isArray(entry.items)
        ? entry.items
            .map((item) => {
              const candidate = item as Record<string, unknown>;
              const nameEs =
                typeof candidate.nameEs === "string"
                  ? candidate.nameEs.trim()
                  : "";
              const nameEn =
                typeof candidate.nameEn === "string"
                  ? candidate.nameEn.trim()
                  : "";
              if (!nameEs && !nameEn) {
                return null;
              }
              return {
                nameEs: nameEs || nameEn,
                nameEn: nameEn || nameEs,
              } satisfies CompanyOrderCatalogItem;
            })
            .filter((item): item is CompanyOrderCatalogItem => Boolean(item))
        : [];
      return {
        supplierName,
        items,
      } satisfies CompanyOrderCatalogSupplier;
    })
    .filter((supplier): supplier is CompanyOrderCatalogSupplier =>
      Boolean(supplier),
    );
