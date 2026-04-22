import { useMemo } from "react";
import {
  companyOrderItemKey,
  formatMoney,
  normalizeCompanyOrderItemNames,
} from "./app-helpers";
import type { CompanyOrderInPersonDrafts } from "./company-order-in-person-runtime";
import type { CompanyOrderInPersonSupplier } from "./types";

export const useCompanyOrderInPersonViewState = (params: {
  suppliers: CompanyOrderInPersonSupplier[];
  supplierName: string;
  search: string;
  drafts: CompanyOrderInPersonDrafts;
}) => {
  const selectedSupplier = useMemo(
    () =>
      params.suppliers.find(
        (supplier) => supplier.supplierName === params.supplierName,
      ) || null,
    [params.suppliers, params.supplierName],
  );

  const normalizedSearch =
    typeof params.search === "string" ? params.search.trim().toLowerCase() : "";
  const visibleItems = useMemo(() => {
    const baseItems =
      normalizedSearch.length > 0
        ? params.suppliers.flatMap((supplier) =>
            supplier.items.map((item) => ({
              supplierName: supplier.supplierName || "Unknown Supplier",
              ...item,
              ...normalizeCompanyOrderItemNames(item.nameEs, item.nameEn),
            })),
          )
        : (selectedSupplier?.items || []).map((item) => ({
            supplierName: selectedSupplier?.supplierName || "",
            ...item,
            ...normalizeCompanyOrderItemNames(item.nameEs, item.nameEn),
          }));

    if (!normalizedSearch) {
      return baseItems;
    }

    return baseItems.filter((item) => {
      const supplierMatch = item.supplierName.toLowerCase().includes(normalizedSearch);
      const esMatch = item.nameEs.toLowerCase().includes(normalizedSearch);
      const enMatch = item.nameEn.toLowerCase().includes(normalizedSearch);
      return supplierMatch || esMatch || enMatch;
    });
  }, [normalizedSearch, params.suppliers, selectedSupplier]);

  const summaryLabel = useMemo(() => {
    const totals = params.suppliers.reduce(
      (acc, supplier) => ({
        ordered: acc.ordered + supplier.totalOrderedQuantity,
        purchased: acc.purchased + supplier.totalPurchasedQuantity,
        remaining: acc.remaining + supplier.totalRemainingQuantity,
      }),
      { ordered: 0, purchased: 0, remaining: 0 },
    );
    return `Ordered ${Number(totals.ordered.toFixed(2))} • Bought ${Number(
      totals.purchased.toFixed(2),
    )} • Remaining ${Number(totals.remaining.toFixed(2))}`;
  }, [params.suppliers]);

  const getDraftValue = (
    supplierName: string,
    nameEs: string,
    nameEn: string,
  ) => {
    const normalizedNames = normalizeCompanyOrderItemNames(nameEs, nameEn);
    return (
      params.drafts[supplierName]?.[
        companyOrderItemKey(normalizedNames.nameEs, normalizedNames.nameEn)
      ] || {
        purchasedQuantity: "",
        unitPrice: "",
      }
    );
  };

  const getItemMetaLine = (
    supplierName: string,
    item: {
      nameEs: string;
      nameEn: string;
      orderedQuantity: number;
      purchasedQuantity: number;
      remainingQuantity: number;
      unitPrice: number | null;
    },
  ) => {
    const normalizedNames = normalizeCompanyOrderItemNames(
      item.nameEs,
      item.nameEn,
    );
    const draft = getDraftValue(
      supplierName,
      normalizedNames.nameEs,
      normalizedNames.nameEn,
    );
    const priceLabel = draft.unitPrice
      ? formatMoney(Number(draft.unitPrice || "0"))
      : item.unitPrice !== null
        ? formatMoney(item.unitPrice)
        : "No price";
    return `Ordered ${item.orderedQuantity} • Remaining ${item.remainingQuantity} • ${priceLabel}`;
  };

  return {
    selectedSupplier,
    visibleItems,
    summaryLabel,
    getDraftValue,
    getItemMetaLine,
  };
};
