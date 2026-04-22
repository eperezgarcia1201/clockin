import { useMemo } from "react";
import {
  companyOrderItemKey,
  formatMoney,
  normalizeCompanyOrderItemNames,
} from "./app-helpers";
import type { CompanyOrderInPersonDrafts } from "./company-order-in-person-runtime";
import type { CompanyOrderInPersonSupplier } from "./types";

const parseDraftNumber = (value: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return Number(parsed.toFixed(2));
};

const formatSavingsLabel = (value: number | null) => {
  if (value === null || Math.abs(value) < 0.005) {
    return "Difference $0.00";
  }
  if (value > 0) {
    return `Saved ${formatMoney(value)}`;
  }
  return `Over ${formatMoney(Math.abs(value))}`;
};

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
      const supplierMatch = item.supplierName
        .toLowerCase()
        .includes(normalizedSearch);
      const esMatch = item.nameEs.toLowerCase().includes(normalizedSearch);
      const enMatch = item.nameEn.toLowerCase().includes(normalizedSearch);
      return supplierMatch || esMatch || enMatch;
    });
  }, [normalizedSearch, params.suppliers, selectedSupplier]);

  const summaryLabel = useMemo(() => {
    const totals = params.suppliers.reduce(
      (acc, supplier) => {
        supplier.items.forEach((item) => {
          const draft =
            params.drafts[supplier.supplierName]?.[
              companyOrderItemKey(item.nameEs, item.nameEn)
            ] || {
              purchasedQuantity: "",
              unitPrice: "",
              companyUnitPrice: "",
            };
          const purchasedQuantity =
            draft.purchasedQuantity.trim().length > 0
              ? parseDraftNumber(draft.purchasedQuantity) ?? 0
              : item.purchasedQuantity;
          const remainingQuantity = Number(
            Math.max(0, item.orderedQuantity - purchasedQuantity).toFixed(2),
          );
          const unitPrice =
            draft.unitPrice.trim().length > 0
              ? parseDraftNumber(draft.unitPrice)
              : item.unitPrice;
          const companyUnitPrice =
            draft.companyUnitPrice.trim().length > 0
              ? parseDraftNumber(draft.companyUnitPrice)
              : item.companyUnitPrice;
          const inPersonSpend =
            unitPrice !== null
              ? Number((purchasedQuantity * unitPrice).toFixed(2))
              : 0;
          const companySpend =
            companyUnitPrice !== null
              ? Number((purchasedQuantity * companyUnitPrice).toFixed(2))
              : 0;
          const savings =
            unitPrice !== null && companyUnitPrice !== null
              ? Number((companySpend - inPersonSpend).toFixed(2))
              : 0;

          acc.ordered += item.orderedQuantity;
          acc.purchased += purchasedQuantity;
          acc.remaining += remainingQuantity;
          acc.inPersonSpend += inPersonSpend;
          acc.companySpend += companySpend;
          acc.savings += savings;
        });
        return acc;
      },
      {
        ordered: 0,
        purchased: 0,
        remaining: 0,
        inPersonSpend: 0,
        companySpend: 0,
        savings: 0,
      },
    );

    return `Ordered ${Number(totals.ordered.toFixed(2))} • Bought ${Number(
      totals.purchased.toFixed(2),
    )} • Remaining ${Number(totals.remaining.toFixed(2))} • Spent ${formatMoney(
      Number(totals.inPersonSpend.toFixed(2)),
    )} • Company ${formatMoney(
      Number(totals.companySpend.toFixed(2)),
    )} • ${formatSavingsLabel(Number(totals.savings.toFixed(2)))}`;
  }, [params.drafts, params.suppliers]);

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
        companyUnitPrice: "",
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
      companyUnitPrice: number | null;
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
    const purchasedQuantity =
      draft.purchasedQuantity.trim().length > 0
        ? parseDraftNumber(draft.purchasedQuantity) ?? 0
        : item.purchasedQuantity;
    const remainingQuantity = Number(
      Math.max(0, item.orderedQuantity - purchasedQuantity).toFixed(2),
    );
    const unitPrice =
      draft.unitPrice.trim().length > 0
        ? parseDraftNumber(draft.unitPrice)
        : item.unitPrice;
    const companyUnitPrice =
      draft.companyUnitPrice.trim().length > 0
        ? parseDraftNumber(draft.companyUnitPrice)
        : item.companyUnitPrice;

    const parts = [
      `Ordered ${item.orderedQuantity}`,
      `Remaining ${remainingQuantity}`,
    ];

    if (unitPrice !== null) {
      const inPersonSpend = Number((purchasedQuantity * unitPrice).toFixed(2));
      parts.push(
        purchasedQuantity > 0
          ? `Spent ${formatMoney(inPersonSpend)}`
          : `Paid ${formatMoney(unitPrice)}`,
      );
    }

    if (companyUnitPrice !== null) {
      const companySpend = Number(
        (purchasedQuantity * companyUnitPrice).toFixed(2),
      );
      parts.push(
        purchasedQuantity > 0
          ? `Company ${formatMoney(companySpend)}`
          : `Company ${formatMoney(companyUnitPrice)}`,
      );
    }

    if (unitPrice !== null && companyUnitPrice !== null) {
      const savings = Number(
        ((companyUnitPrice - unitPrice) * purchasedQuantity).toFixed(2),
      );
      parts.push(formatSavingsLabel(savings));
    }

    return parts.join(" • ");
  };

  return {
    selectedSupplier,
    visibleItems,
    summaryLabel,
    getDraftValue,
    getItemMetaLine,
  };
};
