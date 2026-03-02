import type {
  LiquorCatalogItem,
  LiquorSheetDraft,
} from "./types";

type LiquorCatalogFormState = {
  supplierName: string;
  name: string;
  brand: string;
  upc: string;
  sizeMl: string;
  unitCost: string;
};

type ValidationResult<T> =
  | { ok: false; error: string }
  | { ok: true; payload: T };

export type LiquorCatalogUpdatePayload = {
  name: string;
  brand?: string;
  upc?: string;
  supplierName?: string;
  unitCost: number;
  sizeMl?: number;
};

export type LiquorCountRowPayload = {
  itemId: string;
  officeId: string;
  countDate: string;
  quantity: number;
  barQuantity: number;
  bodegaBottleCount: number;
};

export type LiquorCatalogCreatePayload = {
  name: string;
  brand?: string;
  upc?: string;
  supplierName?: string;
  sizeMl?: number;
  unitCost?: number;
};

export function buildLiquorCatalogUpdatePayload(
  draft: LiquorSheetDraft,
): ValidationResult<LiquorCatalogUpdatePayload> {
  const name = draft.name.trim();
  if (!name) {
    return { ok: false, error: "Liquor name is required." };
  }

  const unitCost = Number(draft.unitCost);
  const sizeMlRaw = draft.sizeMl.trim();
  const sizeMl = sizeMlRaw ? Number(sizeMlRaw) : undefined;

  if (!Number.isFinite(unitCost) || unitCost < 0) {
    return { ok: false, error: "Price must be zero or greater." };
  }

  if (sizeMlRaw && (sizeMl === undefined || !Number.isFinite(sizeMl) || sizeMl <= 0)) {
    return { ok: false, error: "Qty/ML must be greater than zero." };
  }

  return {
    ok: true,
    payload: {
      name,
      brand: draft.brand.trim() || undefined,
      upc: draft.upc.trim() || undefined,
      supplierName: draft.supplierName.trim() || undefined,
      unitCost,
      sizeMl,
    },
  };
}

export function buildLiquorCountRowPayload(params: {
  itemId: string;
  draft: LiquorSheetDraft;
  liquorCatalog: LiquorCatalogItem[];
  liquorCountDate: string;
  companyOrdersOfficeId: string;
}): ValidationResult<LiquorCountRowPayload> {
  const { itemId, draft, liquorCatalog, liquorCountDate, companyOrdersOfficeId } =
    params;

  if (!companyOrdersOfficeId) {
    return {
      ok: false,
      error: "Select a location before saving liquor inventory.",
    };
  }

  const barQuantity = draft.barQuantity.trim() ? Number(draft.barQuantity) : 0;
  const bodegaBottleCount = draft.bodegaBottleCount.trim()
    ? Number(draft.bodegaBottleCount)
    : 0;

  if (!Number.isFinite(barQuantity) || barQuantity < 0) {
    return { ok: false, error: "Bar quantity must be zero or greater." };
  }

  if (!Number.isFinite(bodegaBottleCount) || bodegaBottleCount < 0) {
    return { ok: false, error: "Bodega bottle count must be zero or greater." };
  }

  const item = liquorCatalog.find((candidate) => candidate.id === itemId);
  const sizeMl = item?.sizeMl ?? null;
  if (bodegaBottleCount > 0 && (!sizeMl || sizeMl <= 0)) {
    return {
      ok: false,
      error: "Qty/ML is required before entering bodega bottles.",
    };
  }

  const countDate = liquorCountDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(countDate)) {
    return { ok: false, error: "Count date must use YYYY-MM-DD format." };
  }

  const bodegaQuantity =
    bodegaBottleCount > 0 && sizeMl
      ? Number((bodegaBottleCount * sizeMl).toFixed(3))
      : 0;

  return {
    ok: true,
    payload: {
      itemId,
      officeId: companyOrdersOfficeId,
      countDate,
      quantity: Number((barQuantity + bodegaQuantity).toFixed(3)),
      barQuantity,
      bodegaBottleCount,
    },
  };
}

export function buildLiquorCatalogCreatePayload(
  form: LiquorCatalogFormState,
): ValidationResult<LiquorCatalogCreatePayload> {
  const name = form.name.trim();
  if (!name) {
    return { ok: false, error: "Liquor name is required." };
  }

  const sizeMl = form.sizeMl.trim() ? Number(form.sizeMl.trim()) : undefined;
  const unitCost = form.unitCost.trim() ? Number(form.unitCost.trim()) : undefined;

  if (sizeMl !== undefined && (!Number.isFinite(sizeMl) || sizeMl <= 0)) {
    return { ok: false, error: "Qty/ML must be greater than zero." };
  }

  if (unitCost !== undefined && (!Number.isFinite(unitCost) || unitCost < 0)) {
    return { ok: false, error: "Price must be zero or greater." };
  }

  return {
    ok: true,
    payload: {
      name,
      brand: form.brand.trim() || undefined,
      upc: form.upc.trim() || undefined,
      supplierName: form.supplierName.trim() || undefined,
      sizeMl,
      unitCost,
    },
  };
}
