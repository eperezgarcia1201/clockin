import { companyOrderItemKey } from "./app-helpers";
import type { CompanyOrderDrafts } from "./company-order-draft-helpers";
import type {
  CompanyOrderCatalogItem,
  CompanyOrderComparisonUnit,
  CompanyOrderCatalogSupplier,
  CompanyOrderOrderUnit,
} from "./types";

export type CompanyOrderCartItem = {
  supplierName: string;
  key: string;
  nameEs: string;
  nameEn: string;
  quantity: number;
  comparisonUnit: CompanyOrderComparisonUnit;
  caseSizeLb: number | null | undefined;
};

export type CompanyOrderSupplierPayload = {
  supplierName: string;
  items: Array<{ nameEs: string; nameEn: string; quantity: number }>;
};

export const selectCompanyOrderSupplier = (
  catalog: CompanyOrderCatalogSupplier[],
  supplierName: string,
): CompanyOrderCatalogSupplier | null =>
  catalog.find((supplier) => supplier.supplierName === supplierName) || null;

export const filterCompanyOrderItemsBySearch = (
  supplier: CompanyOrderCatalogSupplier | null,
  search: string,
): CompanyOrderCatalogItem[] => {
  const source = supplier?.items || [];
  const lookup = search.trim().toLowerCase();
  if (!lookup) {
    return source;
  }
  return source.filter((item) => {
    const es = item.nameEs.toLowerCase();
    const en = item.nameEn.toLowerCase();
    return es.includes(lookup) || en.includes(lookup);
  });
};

export const filterCompanyOrderItemsInCart = (
  items: CompanyOrderCatalogItem[],
  supplierName: string,
  drafts: CompanyOrderDrafts,
): CompanyOrderCatalogItem[] => {
  const supplierDraft = drafts[supplierName] || {};
  return items.filter((item) => {
    const key = companyOrderItemKey(item.nameEs, item.nameEn);
    return Number(supplierDraft[key] || "0") > 0;
  });
};

export const selectVisibleCompanyOrderItems = (
  items: CompanyOrderCatalogItem[],
  hasSearch: boolean,
  showOnlyAdded: boolean,
  visibleCount: number,
): CompanyOrderCatalogItem[] => {
  if (hasSearch || showOnlyAdded) {
    return items;
  }
  return items.slice(0, visibleCount);
};

export const hasMoreCompanyOrderItemsToShow = (
  items: CompanyOrderCatalogItem[],
  visibleItems: CompanyOrderCatalogItem[],
  hasSearch: boolean,
  showOnlyAdded: boolean,
): boolean => {
  if (hasSearch || showOnlyAdded) {
    return false;
  }
  return items.length > visibleItems.length;
};

export const buildCompanyOrderCartItems = (
  catalog: CompanyOrderCatalogSupplier[],
  drafts: CompanyOrderDrafts,
): CompanyOrderCartItem[] =>
  catalog.flatMap((supplier) => {
    const supplierDraft = drafts[supplier.supplierName] || {};
    return supplier.items
      .map((item) => {
        const key = companyOrderItemKey(item.nameEs, item.nameEn);
        const quantity = Number(supplierDraft[key] || "");
        if (!Number.isFinite(quantity) || quantity <= 0) {
          return null;
        }
        return {
          supplierName: supplier.supplierName,
          key,
          nameEs: item.nameEs,
          nameEn: item.nameEn,
          quantity,
          comparisonUnit: item.comparisonUnit === "lb" ? "lb" : "each",
          caseSizeLb: item.caseSizeLb,
        };
      })
      .filter((entry): entry is CompanyOrderCartItem => Boolean(entry));
  });

export const countSelectedCompanyOrderDraftItems = (
  drafts: CompanyOrderDrafts,
): number =>
  Object.values(drafts)
    .flatMap((draft) => Object.values(draft))
    .filter((value) => Number(value) > 0).length;

type OrderQuantitySummary = Record<CompanyOrderOrderUnit, number>;

const createOrderQuantitySummary = (): OrderQuantitySummary => ({
  each: 0,
  case: 0,
  lb: 0,
});

export const resolveCompanyOrderOrderUnit = (
  comparisonUnit: CompanyOrderComparisonUnit | undefined,
): CompanyOrderOrderUnit => (comparisonUnit === "lb" ? "case" : "each");

export const formatOrderQuantitySummary = (totals: OrderQuantitySummary) => {
  const parts: string[] = [];
  if (totals.each > 0) {
    parts.push(`${Number(totals.each.toFixed(2))} each`);
  }
  if (totals.case > 0) {
    const value = Number(totals.case.toFixed(2));
    parts.push(`${value} ${Math.abs(value - 1) < 0.005 ? "case" : "cases"}`);
  }
  if (totals.lb > 0) {
    parts.push(`${Number(totals.lb.toFixed(2))} lb`);
  }
  return parts.length ? parts.join(" + ") : "0";
};

export const sumCompanyOrderCartUnits = (
  cartItems: CompanyOrderCartItem[],
): string => {
  const totals = createOrderQuantitySummary();
  cartItems.forEach((item) => {
    const unit = resolveCompanyOrderOrderUnit(item.comparisonUnit);
    totals[unit] = Number((totals[unit] + item.quantity).toFixed(2));
  });
  return formatOrderQuantitySummary(totals);
};

export const countSuppliersWithDraftItems = (
  drafts: CompanyOrderDrafts,
): number =>
  Object.values(drafts).filter((draft) =>
    Object.values(draft).some((value) => Number(value) > 0),
  ).length;

export const buildCompanyOrderSupplierPayloads = (
  cartItems: CompanyOrderCartItem[],
): CompanyOrderSupplierPayload[] => {
  const payloadBySupplier = new Map<
    string,
    Array<{ nameEs: string; nameEn: string; quantity: number }>
  >();

  cartItems.forEach((item) => {
    const supplierItems = payloadBySupplier.get(item.supplierName) || [];
    supplierItems.push({
      nameEs: item.nameEs,
      nameEn: item.nameEn,
      quantity: item.quantity,
    });
    payloadBySupplier.set(item.supplierName, supplierItems);
  });

  return Array.from(payloadBySupplier.entries()).map(
    ([supplierName, items]) => ({
      supplierName,
      items,
    }),
  );
};
