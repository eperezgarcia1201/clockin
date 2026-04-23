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
  CompanyOrderOrderUnit,
} from "./types";

type OrderQuantityByUnit = Record<CompanyOrderOrderUnit, number>;

const parseDraftNumber = (value: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return Number(parsed.toFixed(2));
};

const normalizeSupplierUnitPrice = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Number(value.toFixed(2));
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

const createOrderQuantityByUnit = (): OrderQuantityByUnit => ({
  each: 0,
  case: 0,
  lb: 0,
});

const addOrderQuantityByUnit = (
  totals: OrderQuantityByUnit,
  orderUnit: CompanyOrderOrderUnit,
  quantity: number,
) => {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return totals;
  }
  totals[orderUnit] = Number((totals[orderUnit] + quantity).toFixed(2));
  return totals;
};

const formatOrderQuantityWithUnit = (
  quantity: number,
  orderUnit: CompanyOrderOrderUnit,
) => {
  const value = Number(quantity.toFixed(2));
  if (orderUnit === "case") {
    return `${value} ${Math.abs(value - 1) < 0.005 ? "case" : "cases"}`;
  }
  return `${value} ${orderUnit}`;
};

const formatOrderQuantitySummaryByUnit = (totals: OrderQuantityByUnit) => {
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

const formatPriceWithUnit = (
  value: number,
  comparisonUnit: CompanyOrderComparisonUnit,
) => (comparisonUnit === "lb" ? `${formatMoney(value)}/lb` : `${formatMoney(value)} each`);

const getComparisonQuantity = (
  item: {
    comparisonUnit: CompanyOrderComparisonUnit;
    purchasedQuantity: number;
    purchasedWeightLb: number | null;
  },
  draft: {
    purchasedQuantity: string;
    purchasedWeightLb: string;
  },
) => {
  if (item.comparisonUnit !== "lb") {
    return draft.purchasedQuantity.trim().length > 0
      ? parseDraftNumber(draft.purchasedQuantity) ?? 0
      : item.purchasedQuantity;
  }
  return draft.purchasedWeightLb.trim().length > 0
    ? parseDraftNumber(draft.purchasedWeightLb) ?? 0
    : item.purchasedWeightLb || 0;
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
        purchasedWeightLb: "",
        unitPrice: "",
        companyUnitPrice: "",
      }
    );
  };

  const summaryLabel = useMemo(() => {
    const totals = params.suppliers.reduce(
      (acc, supplier) => {
        supplier.items.forEach((item) => {
          const draft = getDraftValue(
            supplier.supplierName,
            item.nameEs,
            item.nameEn,
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
          const companyUnitPrice = normalizeSupplierUnitPrice(
            item.companyUnitPrice,
          );
          const comparisonQuantity = getComparisonQuantity(item, draft);
          const inPersonSpend =
            unitPrice !== null
              ? Number((comparisonQuantity * unitPrice).toFixed(2))
              : 0;
          const companySpend =
            companyUnitPrice !== null
              ? Number((comparisonQuantity * companyUnitPrice).toFixed(2))
              : 0;
          const savings =
            unitPrice !== null && companyUnitPrice !== null
              ? Number((companySpend - inPersonSpend).toFixed(2))
              : 0;

          addOrderQuantityByUnit(
            acc.ordered,
            item.orderQuantityUnit || "each",
            item.orderedQuantity,
          );
          addOrderQuantityByUnit(
            acc.purchased,
            item.orderQuantityUnit || "each",
            purchasedQuantity,
          );
          addOrderQuantityByUnit(
            acc.remaining,
            item.orderQuantityUnit || "each",
            remainingQuantity,
          );
          if (item.comparisonUnit === "lb") {
            acc.weightLb = Number((acc.weightLb + comparisonQuantity).toFixed(2));
          }
          acc.inPersonSpend = Number((acc.inPersonSpend + inPersonSpend).toFixed(2));
          acc.companySpend = Number((acc.companySpend + companySpend).toFixed(2));
          acc.savings = Number((acc.savings + savings).toFixed(2));
        });
        return acc;
      },
      {
        ordered: createOrderQuantityByUnit(),
        purchased: createOrderQuantityByUnit(),
        remaining: createOrderQuantityByUnit(),
        weightLb: 0,
        inPersonSpend: 0,
        companySpend: 0,
        savings: 0,
      },
    );

    const parts = [
      `Ordered ${formatOrderQuantitySummaryByUnit(totals.ordered)}`,
      `Bought ${formatOrderQuantitySummaryByUnit(totals.purchased)}`,
      `Remaining ${formatOrderQuantitySummaryByUnit(totals.remaining)}`,
    ];
    if (totals.weightLb > 0) {
      parts.push(`Total Weight ${Number(totals.weightLb.toFixed(2))} lb`);
    }
    parts.push(`In-Person Total ${formatMoney(totals.inPersonSpend)}`);
    parts.push(`Supplier Total ${formatMoney(totals.companySpend)}`);
    parts.push(formatSavingsLabel(totals.savings));
    return parts.join(" • ");
  }, [params.drafts, params.suppliers]);

  const getItemMetaLine = (
    supplierName: string,
    item: {
      nameEs: string;
      nameEn: string;
      orderedQuantity: number;
      purchasedQuantity: number;
      remainingQuantity: number;
      orderQuantityUnit: CompanyOrderOrderUnit;
      comparisonUnit: CompanyOrderComparisonUnit;
      caseSizeLb: number | null;
      purchasedWeightLb: number | null;
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
    const companyUnitPrice = normalizeSupplierUnitPrice(item.companyUnitPrice);
    const comparisonQuantity = getComparisonQuantity(item, draft);
    const inPersonSpend =
      comparisonQuantity > 0 && unitPrice !== null
        ? Number((comparisonQuantity * unitPrice).toFixed(2))
        : null;
    const companySpend =
      comparisonQuantity > 0 && companyUnitPrice !== null
        ? Number((comparisonQuantity * companyUnitPrice).toFixed(2))
        : null;
    const savings =
      inPersonSpend !== null && companySpend !== null
        ? Number((companySpend - inPersonSpend).toFixed(2))
        : null;

    const parts = [
      `Ordered ${formatOrderQuantityWithUnit(
        item.orderedQuantity,
        item.orderQuantityUnit || "each",
      )}`,
      `Remaining ${formatOrderQuantityWithUnit(
        remainingQuantity,
        item.orderQuantityUnit || "each",
      )}`,
    ];

    if (item.caseSizeLb) {
      parts.push(`1 case = ${Number(item.caseSizeLb.toFixed(2))} lb`);
    }
    if (item.comparisonUnit === "lb" && comparisonQuantity > 0) {
      parts.push(`Total Weight ${Number(comparisonQuantity.toFixed(2))} lb`);
    }

    if (unitPrice !== null) {
      parts.push(
        `In-Person ${formatPriceWithUnit(unitPrice, item.comparisonUnit)}`,
      );
      if (inPersonSpend !== null) {
        parts.push(`In-Person Total ${formatMoney(inPersonSpend)}`);
      }
    }

    if (companyUnitPrice !== null) {
      parts.push(
        `Supplier ${formatPriceWithUnit(companyUnitPrice, item.comparisonUnit)}`,
      );
      if (companySpend !== null) {
        parts.push(`Supplier Total ${formatMoney(companySpend)}`);
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
