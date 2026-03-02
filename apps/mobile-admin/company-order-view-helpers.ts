import { companyOrderItemKey } from "./app-helpers";
import type { CompanyOrderDrafts } from "./company-order-draft-helpers";
import type {
  CompanyOrderCatalogItem,
  CompanyOrderCatalogSupplier,
} from "./types";

export type CompanyOrderCartItem = {
  supplierName: string;
  key: string;
  nameEs: string;
  nameEn: string;
  quantity: number;
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

export const sumCompanyOrderCartUnits = (
  cartItems: CompanyOrderCartItem[],
): number =>
  Number(cartItems.reduce((sum, item) => sum + item.quantity, 0).toFixed(2));

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
