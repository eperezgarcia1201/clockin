import {
  companyOrderItemKey,
  normalizeCompanyOrderItemNames,
  parseMoneyInput,
} from "./app-helpers";
import type { CompanyOrderInPersonSupplier } from "./types";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export type CompanyOrderInPersonDraftValue = {
  purchasedQuantity: string;
  unitPrice: string;
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

const normalizeInPersonItem = (
  value: unknown,
):
  | {
      nameEs: string;
      nameEn: string;
      orderedQuantity: number;
      purchasedQuantity: number;
      remainingQuantity: number;
      unitPrice: number | null;
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
  return {
    nameEs: names.nameEs,
    nameEn: names.nameEn,
    orderedQuantity: normalizeQuantity(raw.orderedQuantity),
    purchasedQuantity: normalizeQuantity(raw.purchasedQuantity),
    remainingQuantity: normalizeQuantity(raw.remainingQuantity),
    unitPrice: raw.unitPrice === null ? null : normalizeUnitPrice(raw.unitPrice),
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
        unitPrice:
          item.unitPrice !== null && item.unitPrice !== undefined
            ? item.unitPrice.toFixed(2)
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
  try {
    const items = params.suppliers.flatMap((supplier) =>
      supplier.items.map((item) => {
        const draft =
          params.drafts[supplier.supplierName]?.[
            companyOrderItemKey(item.nameEs, item.nameEn)
          ] || {
            purchasedQuantity: "",
            unitPrice: "",
          };
        const purchasedQuantity = Number(draft.purchasedQuantity || "0");
        const safePurchasedQuantity = Number.isFinite(purchasedQuantity)
          ? Number(Math.max(0, purchasedQuantity).toFixed(2))
          : 0;
        return {
          supplierName: supplier.supplierName,
          nameEs: item.nameEs,
          nameEn: item.nameEn,
          purchasedQuantity: safePurchasedQuantity,
          unitPrice: parseMoneyInput(draft.unitPrice),
        };
      }),
    );

    const data = (await params.fetchJson("/company-orders/in-person", {
      method: "PUT",
      body: JSON.stringify({
        weekStart: params.weekStartDate,
        officeId: params.officeId || undefined,
        items,
      }),
    })) as {
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
      drafts: buildCompanyOrderInPersonDrafts(suppliers),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to save in person shopping.",
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
      unitPrice: previous[supplierName]?.[itemKey]?.unitPrice || "",
      ...patch,
    },
  },
});
