import { useMemo } from "react";
import {
  companyOrderItemKey,
  formatMoney,
  normalizeCompanyOrderItemNames,
} from "./app-helpers";
import type { CompanyOrderInPersonDrafts } from "./company-order-in-person-runtime";
import type {
  CompanyOrderComparisonUnit,
  CompanyOrderInPersonSupplier,
} from "./types";

type QuantityByUnit = Record<CompanyOrderComparisonUnit, number>;

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

const createQuantityByUnit = (): QuantityByUnit => ({
  each: 0,
  lb: 0,
});

const addQuantityByUnit = (
  totals: QuantityByUnit,
  comparisonUnit: CompanyOrderComparisonUnit,
  quantity: number,
) => {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return totals;
  }
  totals[comparisonUnit] = Number((totals[comparisonUnit] + quantity).toFixed(2));
  return totals;
};

const formatQuantityWithUnit = (
  quantity: number,
  comparisonUnit: CompanyOrderComparisonUnit,
) => `${Number(quantity.toFixed(2))} ${comparisonUnit === "lb" ? "lb" : "each"}`;

const formatQuantitySummaryByUnit = (totals: QuantityByUnit) => {
  const parts: string[] = [];
  if (totals.each > 0) {
    parts.push(`${Number(totals.each.toFixed(2))} each`);
  }
  if (totals.lb > 0) {
    parts.push(`${Number(totals.lb.toFixed(2))} lb`);
  }
  return parts.length ? parts.join(" + ") : "0";
};

const formatPriceWithUnit = (
  value: number,
  comparisonUnit: CompanyOrderComparisonUnit,
) => (comparisonUnit === "lb" ? `${formatMoney(value)}/lb` : `${formatMoney(value)} each`);

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
          const comparisonUnit = item.comparisonUnit || "each";
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

          addQuantityByUnit(acc.ordered, comparisonUnit, item.orderedQuantity);
          addQuantityByUnit(acc.purchased, comparisonUnit, purchasedQuantity);
          addQuantityByUnit(acc.remaining, comparisonUnit, remainingQuantity);
          acc.inPersonSpend = Number((acc.inPersonSpend + inPersonSpend).toFixed(2));
          acc.companySpend = Number((acc.companySpend + companySpend).toFixed(2));
          acc.savings = Number((acc.savings + savings).toFixed(2));
        });
        return acc;
      },
      {
        ordered: createQuantityByUnit(),
        purchased: createQuantityByUnit(),
        remaining: createQuantityByUnit(),
        inPersonSpend: 0,
        companySpend: 0,
        savings: 0,
      },
    );

    return `Ordered ${formatQuantitySummaryByUnit(
      totals.ordered,
    )} • Bought ${formatQuantitySummaryByUnit(
      totals.purchased,
    )} • Remaining ${formatQuantitySummaryByUnit(
      totals.remaining,
    )} • Spent ${formatMoney(totals.inPersonSpend)} • Company ${formatMoney(
      totals.companySpend,
    )} • ${formatSavingsLabel(totals.savings)}`;
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
      comparisonUnit: CompanyOrderComparisonUnit;
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
    const comparisonUnit = item.comparisonUnit || "each";
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
      purchasedQuantity > 0 && unitPrice !== null
        ? Number((purchasedQuantity * unitPrice).toFixed(2))
        : null;
    const companySpend =
      purchasedQuantity > 0 && companyUnitPrice !== null
        ? Number((purchasedQuantity * companyUnitPrice).toFixed(2))
        : null;
    const savings =
      inPersonSpend !== null && companySpend !== null
        ? Number((companySpend - inPersonSpend).toFixed(2))
        : null;

    const parts = [
      `Ordered ${formatQuantityWithUnit(item.orderedQuantity, comparisonUnit)}`,
      `Remaining ${formatQuantityWithUnit(remainingQuantity, comparisonUnit)}`,
    ];

    if (unitPrice !== null) {
      parts.push(`Paid ${formatPriceWithUnit(unitPrice, comparisonUnit)}`);
      if (inPersonSpend !== null) {
        parts.push(`Spent ${formatMoney(inPersonSpend)}`);
      }
    }

    if (companyUnitPrice !== null) {
      parts.push(`Company ${formatPriceWithUnit(companyUnitPrice, comparisonUnit)}`);
      if (companySpend !== null) {
        parts.push(`Equivalent ${formatMoney(companySpend)}`);
      }
    }

    if (savings !== null) {
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
