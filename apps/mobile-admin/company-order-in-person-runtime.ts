import {
  companyOrderItemKey,
  normalizeCompanyOrderItemNames,
  parseMoneyInput,
} from "./app-helpers";
import type {
  CompanyOrderComparisonUnit,
  CompanyOrderInPersonSupplier,
  CompanyOrderOrderUnit,
} from "./types";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export type CompanyOrderInPersonDraftValue = {
  purchasedQuantity: string;
  purchasedWeightLb: string;
  unitPrice: string;
  companyUnitPrice: string;
};

export type CompanyOrderInPersonDrafts = Record<
  string,
  Record<string, CompanyOrderInPersonDraftValue>
>;

const normalizeSupplierName = (value: unknown, index: number) => {
  const normalized =
    typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  return normalized || `Supplier ${index + 1}`;
};

const normalizeQuantity = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Number(parsed.toFixed(2));
};

const normalizeUnitPrice = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return Number(parsed.toFixed(2));
};

const normalizeComparisonUnit = (
  value: unknown,
): CompanyOrderComparisonUnit => (value === "lb" ? "lb" : "each");

const normalizeOrderQuantityUnit = (
  value: unknown,
): CompanyOrderOrderUnit =>
  value === "case" ? "case" : value === "lb" ? "lb" : "each";

const normalizeInPersonItem = (
  value: unknown,
):
  | {
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
    }
  | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const raw = value as Record<string, unknown>;
  const names = normalizeCompanyOrderItemNames(
    typeof raw.nameEs === "string" ? raw.nameEs : "",
    typeof raw.nameEn === "string" ? raw.nameEn : "",
  );
  const rawUnitPrice =
    raw.unitPrice !== undefined
      ? raw.unitPrice
      : raw.price !== undefined
        ? raw.price
        : null;
  const rawCompanyUnitPrice =
    raw.companyUnitPrice !== undefined
      ? raw.companyUnitPrice
      : raw.companyPrice !== undefined
        ? raw.companyPrice
        : null;
  const comparisonUnit = normalizeComparisonUnit(raw.comparisonUnit);
  const rawCaseSizeLb =
    raw.caseSizeLb !== undefined ? raw.caseSizeLb : null;
  const rawPurchasedWeightLb =
    raw.purchasedWeightLb !== undefined ? raw.purchasedWeightLb : null;
  return {
    nameEs: names.nameEs,
    nameEn: names.nameEn,
    orderedQuantity: normalizeQuantity(raw.orderedQuantity),
    purchasedQuantity: normalizeQuantity(raw.purchasedQuantity),
    remainingQuantity: normalizeQuantity(raw.remainingQuantity),
    orderQuantityUnit: normalizeOrderQuantityUnit(
      raw.orderQuantityUnit !== undefined
        ? raw.orderQuantityUnit
        : comparisonUnit === "lb"
          ? "case"
          : "each",
    ),
    comparisonUnit,
    caseSizeLb:
      rawCaseSizeLb === null ? null : normalizeQuantity(rawCaseSizeLb),
    purchasedWeightLb:
      rawPurchasedWeightLb === null
        ? null
        : normalizeQuantity(rawPurchasedWeightLb),
    unitPrice:
      rawUnitPrice === null ? null : normalizeUnitPrice(rawUnitPrice),
    companyUnitPrice:
      rawCompanyUnitPrice === null
        ? null
        : normalizeUnitPrice(rawCompanyUnitPrice),
  };
};

const normalizeSupplierList = (payload: {
  suppliers?: unknown[];
}): CompanyOrderInPersonSupplier[] =>
  Array.isArray(payload.suppliers)
    ? payload.suppliers
        .map((supplier, index) => {
          if (!supplier || typeof supplier !== "object" || Array.isArray(supplier)) {
            return null;
          }
          const raw = supplier as Record<string, unknown>;
          const items = Array.isArray(raw.items)
            ? raw.items
                .map((item) => normalizeInPersonItem(item))
                .filter(
                  (
                    item,
                  ): item is CompanyOrderInPersonSupplier["items"][number] =>
                    item !== null,
                )
            : [];
          return {
            supplierName: normalizeSupplierName(raw.supplierName, index),
            itemCount: items.length,
            totalOrderedQuantity: Number(
              items.reduce((total, item) => total + item.orderedQuantity, 0).toFixed(2),
            ),
            totalPurchasedQuantity: Number(
              items
                .reduce((total, item) => total + item.purchasedQuantity, 0)
                .toFixed(2),
            ),
            totalRemainingQuantity: Number(
              items
                .reduce((total, item) => total + item.remainingQuantity, 0)
                .toFixed(2),
            ),
            totalPurchasedWeightLb: Number(
              items
                .reduce(
                  (total, item) => total + (item.purchasedWeightLb || 0),
                  0,
                )
                .toFixed(2),
            ),
            items,
          };
        })
        .filter((supplier): supplier is CompanyOrderInPersonSupplier => supplier !== null)
    : [];

export const pickCompanyOrderInPersonSupplier = (
  previousSupplierName: string,
  suppliers: CompanyOrderInPersonSupplier[],
) => {
  if (
    previousSupplierName &&
    suppliers.some((supplier) => supplier.supplierName === previousSupplierName)
  ) {
    return previousSupplierName;
  }
  return suppliers[0]?.supplierName || "";
};

export const buildCompanyOrderInPersonDrafts = (
  suppliers: CompanyOrderInPersonSupplier[],
): CompanyOrderInPersonDrafts => {
  const drafts: CompanyOrderInPersonDrafts = {};
  suppliers.forEach((supplier) => {
    drafts[supplier.supplierName] = {};
    supplier.items.forEach((item) => {
      drafts[supplier.supplierName][
        companyOrderItemKey(item.nameEs, item.nameEn)
      ] = {
        purchasedQuantity:
          item.purchasedQuantity > 0 ? String(item.purchasedQuantity) : "",
        purchasedWeightLb:
          item.purchasedWeightLb !== null &&
          item.purchasedWeightLb !== undefined &&
          item.purchasedWeightLb > 0
            ? String(item.purchasedWeightLb)
            : "",
        unitPrice:
          item.unitPrice !== null &&
          item.unitPrice !== undefined &&
          item.unitPrice > 0
            ? item.unitPrice.toFixed(2)
            : "",
        companyUnitPrice:
          item.companyUnitPrice !== null &&
          item.companyUnitPrice !== undefined &&
          item.companyUnitPrice > 0
            ? item.companyUnitPrice.toFixed(2)
            : "",
      };
    });
  });
  return drafts;
};

export const loadCompanyOrderInPersonData = async (params: {
  fetchJson: FetchJson;
  weekStartDate: string;
  officeId: string;
  previousSupplierName: string;
}): Promise<
  | {
      ok: true;
      weekStartDate: string;
      weekEndDate: string;
      suppliers: CompanyOrderInPersonSupplier[];
      selectedSupplierName: string;
      drafts: CompanyOrderInPersonDrafts;
    }
  | { ok: false; error: string }
> => {
  try {
    const query = new URLSearchParams();
    query.set("weekStart", params.weekStartDate);
    if (params.officeId) {
      query.set("officeId", params.officeId);
    }
    const data = (await params.fetchJson(
      `/company-orders/in-person?${query.toString()}`,
    )) as {
      weekStartDate?: string;
      weekEndDate?: string;
      suppliers?: CompanyOrderInPersonSupplier[];
    };
    const suppliers = normalizeSupplierList(data);
    return {
      ok: true,
      weekStartDate:
        typeof data.weekStartDate === "string"
          ? data.weekStartDate
          : params.weekStartDate,
      weekEndDate:
        typeof data.weekEndDate === "string" ? data.weekEndDate : "",
      suppliers,
      selectedSupplierName: pickCompanyOrderInPersonSupplier(
        params.previousSupplierName,
        suppliers,
      ),
      drafts: buildCompanyOrderInPersonDrafts(suppliers),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load in person shopping.",
    };
  }
};

export const saveCompanyOrderInPersonData = async (params: {
  fetchJson: FetchJson;
  weekStartDate: string;
  officeId: string;
  suppliers: CompanyOrderInPersonSupplier[];
  drafts: CompanyOrderInPersonDrafts;
}): Promise<
  | {
      ok: true;
      weekStartDate: string;
      weekEndDate: string;
      suppliers: CompanyOrderInPersonSupplier[];
      drafts: CompanyOrderInPersonDrafts;
    }
  | { ok: false; error: string }
> => {
  const items = params.suppliers.flatMap((supplier) =>
    supplier.items.map((item) => {
      const draft =
        params.drafts[supplier.supplierName]?.[
          companyOrderItemKey(item.nameEs, item.nameEn)
        ] || {
          purchasedQuantity: "",
          purchasedWeightLb: "",
          unitPrice: "",
          companyUnitPrice: "",
        };
      const purchasedQuantity = Number(draft.purchasedQuantity || "0");
      const safePurchasedQuantity = Number.isFinite(purchasedQuantity)
        ? Number(Math.max(0, purchasedQuantity).toFixed(2))
        : 0;
      const purchasedWeightLb = Number(draft.purchasedWeightLb || "0");
      const safePurchasedWeightLb = Number.isFinite(purchasedWeightLb)
        ? Number(Math.max(0, purchasedWeightLb).toFixed(2))
        : 0;
      return {
        supplierName: supplier.supplierName,
        nameEs: item.nameEs,
        nameEn: item.nameEn,
        purchasedQuantity: safePurchasedQuantity,
        purchasedWeightLb: safePurchasedWeightLb,
        unitPrice: parseMoneyInput(draft.unitPrice),
        companyUnitPrice: parseMoneyInput(draft.companyUnitPrice),
        currentPurchasedQuantity: item.purchasedQuantity,
        currentPurchasedWeightLb: item.purchasedWeightLb,
        currentUnitPrice: item.unitPrice,
        currentCompanyUnitPrice: item.companyUnitPrice,
      };
    }),
  );

  const changedItems = items.filter((item) => {
    const currentUnitPrice =
      item.currentUnitPrice !== null && item.currentUnitPrice !== undefined
        ? Number(item.currentUnitPrice.toFixed(2))
        : null;
    const nextUnitPrice =
      item.unitPrice !== null && item.unitPrice !== undefined
        ? Number(item.unitPrice.toFixed(2))
        : null;
    const currentCompanyUnitPrice =
      item.currentCompanyUnitPrice !== null &&
      item.currentCompanyUnitPrice !== undefined
        ? Number(item.currentCompanyUnitPrice.toFixed(2))
        : null;
    const nextCompanyUnitPrice =
      item.companyUnitPrice !== null && item.companyUnitPrice !== undefined
        ? Number(item.companyUnitPrice.toFixed(2))
        : null;
    const currentPurchasedWeightLb =
      item.currentPurchasedWeightLb !== null &&
      item.currentPurchasedWeightLb !== undefined
        ? Number(item.currentPurchasedWeightLb.toFixed(2))
        : 0;
    return (
      item.purchasedQuantity !== item.currentPurchasedQuantity ||
      item.purchasedWeightLb !== currentPurchasedWeightLb ||
      nextUnitPrice !== currentUnitPrice ||
      nextCompanyUnitPrice !== currentCompanyUnitPrice
    );
  });

  const loadLatestInPersonData = async () => {
    const reloaded = await loadCompanyOrderInPersonData({
      fetchJson: params.fetchJson,
      weekStartDate: params.weekStartDate,
      officeId: params.officeId,
      previousSupplierName: params.suppliers[0]?.supplierName || "",
    });
    if (reloaded.ok === false) {
      return reloaded;
    }
    return {
      ok: true as const,
      weekStartDate: reloaded.weekStartDate,
      weekEndDate: reloaded.weekEndDate,
      suppliers: reloaded.suppliers,
      drafts: reloaded.drafts,
    };
  };

  const saveLegacySingleItemPayloads = async () => {
    for (const item of changedItems) {
      await params.fetchJson("/company-orders/in-person", {
        method: "PUT",
        body: JSON.stringify({
          weekStart: params.weekStartDate,
          officeId: params.officeId || undefined,
          supplierName: item.supplierName,
          nameEs: item.nameEs,
          nameEn: item.nameEn,
          purchasedQuantity: item.purchasedQuantity,
          purchasedWeightLb: item.purchasedWeightLb || undefined,
          price: item.unitPrice ?? undefined,
          companyUnitPrice: item.companyUnitPrice ?? undefined,
        }),
      });
    }
    return loadLatestInPersonData();
  };

  const shouldRetryLegacySave = (error: unknown) => {
    if (!(error instanceof Error)) {
      return false;
    }
    const message = error.message.toLowerCase();
    return (
      message.includes("property items should not exist") &&
      message.includes("suppliername must be a string")
    );
  };

  try {
    const data = (await params.fetchJson("/company-orders/in-person", {
      method: "PUT",
      body: JSON.stringify({
        weekStart: params.weekStartDate,
        officeId: params.officeId || undefined,
        items: items.map((item) => ({
          supplierName: item.supplierName,
          nameEs: item.nameEs,
          nameEn: item.nameEn,
          purchasedQuantity: item.purchasedQuantity,
          purchasedWeightLb: item.purchasedWeightLb,
          unitPrice: item.unitPrice,
          companyUnitPrice: item.companyUnitPrice,
        })),
      }),
    })) as {
      weekStartDate?: string;
      weekEndDate?: string;
      suppliers?: CompanyOrderInPersonSupplier[];
    };

    if (!Array.isArray(data.suppliers)) {
      return loadLatestInPersonData();
    }

    const suppliers = normalizeSupplierList(data);
    return {
      ok: true,
      weekStartDate:
        typeof data.weekStartDate === "string"
          ? data.weekStartDate
          : params.weekStartDate,
      weekEndDate:
        typeof data.weekEndDate === "string" ? data.weekEndDate : "",
      suppliers,
      drafts: buildCompanyOrderInPersonDrafts(suppliers),
    };
  } catch (error) {
    if (shouldRetryLegacySave(error)) {
      try {
        const legacyResult = await saveLegacySingleItemPayloads();
        if (legacyResult.ok === false) {
          return legacyResult;
        }
        return legacyResult;
      } catch (legacyError) {
        return {
          ok: false,
          error:
            legacyError instanceof Error
              ? legacyError.message
              : "Unable to save in person shopping.",
        };
      }
    }
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to save in person shopping.",
    };
  }
};

export const clearCompanyOrderInPersonData = async (params: {
  fetchJson: FetchJson;
  weekStartDate: string;
  officeId: string;
  supplierName: string;
}): Promise<
  | {
      ok: true;
      weekStartDate: string;
      weekEndDate: string;
      suppliers: CompanyOrderInPersonSupplier[];
      selectedSupplierName: string;
      drafts: CompanyOrderInPersonDrafts;
      clearedSupplierName: string;
      clearedItemCount: number;
    }
  | { ok: false; error: string }
> => {
  try {
    const query = new URLSearchParams();
    query.set("weekStart", params.weekStartDate);
    query.set("supplierName", params.supplierName);
    if (params.officeId) {
      query.set("officeId", params.officeId);
    }

    const data = (await params.fetchJson(
      `/company-orders/in-person?${query.toString()}`,
      {
        method: "DELETE",
      },
    )) as {
      weekStartDate?: string;
      weekEndDate?: string;
      suppliers?: CompanyOrderInPersonSupplier[];
      clearedSupplierName?: string;
      clearedItemCount?: number;
    };

    const suppliers = normalizeSupplierList(data);
    return {
      ok: true,
      weekStartDate:
        typeof data.weekStartDate === "string"
          ? data.weekStartDate
          : params.weekStartDate,
      weekEndDate:
        typeof data.weekEndDate === "string" ? data.weekEndDate : "",
      suppliers,
      selectedSupplierName: pickCompanyOrderInPersonSupplier(
        params.supplierName,
        suppliers,
      ),
      drafts: buildCompanyOrderInPersonDrafts(suppliers),
      clearedSupplierName:
        typeof data.clearedSupplierName === "string" &&
        data.clearedSupplierName.trim()
          ? data.clearedSupplierName
          : params.supplierName,
      clearedItemCount:
        typeof data.clearedItemCount === "number" &&
        Number.isFinite(data.clearedItemCount)
          ? Number(data.clearedItemCount.toFixed(2))
          : 0,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to clear in person shopping.",
    };
  }
};

export const updateCompanyOrderInPersonDraftValue = (
  previous: CompanyOrderInPersonDrafts,
  supplierName: string,
  itemKey: string,
  patch: Partial<CompanyOrderInPersonDraftValue>,
): CompanyOrderInPersonDrafts => ({
  ...previous,
  [supplierName]: {
    ...(previous[supplierName] || {}),
    [itemKey]: {
      purchasedQuantity:
        previous[supplierName]?.[itemKey]?.purchasedQuantity || "",
      purchasedWeightLb:
        previous[supplierName]?.[itemKey]?.purchasedWeightLb || "",
      unitPrice: previous[supplierName]?.[itemKey]?.unitPrice || "",
      companyUnitPrice:
        previous[supplierName]?.[itemKey]?.companyUnitPrice || "",
      ...patch,
    },
  },
});
