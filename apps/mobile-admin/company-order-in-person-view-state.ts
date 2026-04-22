import { useMemo } from "react";
import { companyOrderItemKey, formatMoney } from "./app-helpers";
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

  const normalizedSearch = params.search.trim().toLowerCase();
  const visibleItems = useMemo(() => {
    const baseItems =
      normalizedSearch.length > 0
        ? params.suppliers.flatMap((supplier) =>
            supplier.items.map((item) => ({
              supplierName: supplier.supplierName,
              ...item,
            })),
          )
        : (selectedSupplier?.items || []).map((item) => ({
            supplierName: selectedSupplier?.supplierName || "",
            ...item,
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
  ) =>
    params.drafts[supplierName]?.[companyOrderItemKey(nameEs, nameEn)] || {
      purchasedQuantity: "",
      unitPrice: "",
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
    const draft = getDraftValue(supplierName, item.nameEs, item.nameEn);
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
