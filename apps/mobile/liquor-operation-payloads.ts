import type { LiquorSheetDraft } from "./types";

export type LiquorCatalogUpdateValidation =
  | {
      ok: true;
      payload: { supplierName?: string; unitCost: number; sizeMl?: number };
    }
  | { ok: false; error: "invalid_unit_cost" | "invalid_size_ml" };

export const buildLiquorCatalogUpdatePayload = (
  draft: LiquorSheetDraft,
): LiquorCatalogUpdateValidation => {
  const unitCost = Number(draft.unitCost);
  const sizeMlRaw = draft.sizeMl.trim();
  const sizeMl = sizeMlRaw ? Number(sizeMlRaw) : undefined;
  if (!Number.isFinite(unitCost) || unitCost < 0) {
    return { ok: false, error: "invalid_unit_cost" };
  }
  if (
    sizeMlRaw &&
    (sizeMl === undefined || !Number.isFinite(sizeMl) || sizeMl <= 0)
  ) {
    return { ok: false, error: "invalid_size_ml" };
  }
  return {
    ok: true,
    payload: {
      supplierName: draft.supplierName.trim() || undefined,
      unitCost,
      sizeMl,
    },
  };
};

export type LiquorCountValidation =
  | {
      ok: true;
      payload: {
        itemId: string;
        officeId: string;
        countDate: string;
        quantity: number;
        barQuantity: number;
        bodegaQuantity: number;
      };
    }
  | {
      ok: false;
      error:
        | "invalid_bar_quantity"
        | "invalid_bodega_quantity"
        | "invalid_count_date";
    };

export const buildLiquorCountPayload = ({
  itemId,
  officeId,
  countDate,
  draft,
}: {
  itemId: string;
  officeId: string;
  countDate: string;
  draft: LiquorSheetDraft;
}): LiquorCountValidation => {
  const barQuantity = draft.barQuantity.trim() ? Number(draft.barQuantity) : 0;
  const bodegaQuantity = draft.bodegaQuantity.trim()
    ? Number(draft.bodegaQuantity)
    : 0;

  if (!Number.isFinite(barQuantity) || barQuantity < 0) {
    return { ok: false, error: "invalid_bar_quantity" };
  }
  if (!Number.isFinite(bodegaQuantity) || bodegaQuantity < 0) {
    return { ok: false, error: "invalid_bodega_quantity" };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(countDate.trim())) {
    return { ok: false, error: "invalid_count_date" };
  }

  return {
    ok: true,
    payload: {
      itemId,
      officeId,
      countDate: countDate.trim(),
      quantity: Number((barQuantity + bodegaQuantity).toFixed(3)),
      barQuantity,
      bodegaQuantity,
    },
  };
};
