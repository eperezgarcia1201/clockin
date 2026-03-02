import type { LiquorCatalogItem, LiquorMovementType } from "./types";

type LiquorMovementFormState = {
  itemId: string;
  officeId: string;
  type: LiquorMovementType;
  quantity: string;
  occurredAt: string;
  notes: string;
};

type LiquorQuickCountFormState = {
  itemId: string;
  officeId: string;
  countDate: string;
  quantity: string;
  barQuantity: string;
  bodegaBottleCount: string;
  notes: string;
};

type ValidationResult<T> =
  | { ok: false; error: string }
  | { ok: true; payload: T };

type LiquorMovementPayload = {
  itemId: string;
  officeId: string;
  type: LiquorMovementType;
  quantity: number;
  occurredAt: string;
  notes?: string;
};

type LiquorQuickCountPayload = {
  itemId: string;
  officeId: string;
  countDate: string;
  quantity: number;
  barQuantity?: number;
  bodegaBottleCount?: number;
  notes?: string;
};

export function buildLiquorMovementPayload(
  form: LiquorMovementFormState,
  companyOrdersOfficeId: string,
): ValidationResult<LiquorMovementPayload> {
  const itemId = form.itemId.trim();
  if (!itemId) {
    return { ok: false, error: "Select an item for the movement." };
  }

  const officeId = form.officeId.trim() || companyOrdersOfficeId;
  if (!officeId) {
    return {
      ok: false,
      error: "Select a location before creating a liquor movement.",
    };
  }

  const quantity = Number(form.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, error: "Movement quantity must be greater than zero." };
  }

  const occurredAt = form.occurredAt ? new Date(form.occurredAt) : new Date();
  if (Number.isNaN(occurredAt.getTime())) {
    return { ok: false, error: "Movement date/time is invalid." };
  }

  return {
    ok: true,
    payload: {
      itemId,
      officeId,
      type: form.type,
      quantity,
      occurredAt: occurredAt.toISOString(),
      notes: form.notes.trim() || undefined,
    },
  };
}

export function buildLiquorQuickCountPayload(
  form: LiquorQuickCountFormState,
  companyOrdersOfficeId: string,
  liquorCatalog: LiquorCatalogItem[],
): ValidationResult<LiquorQuickCountPayload> {
  const itemId = form.itemId.trim();
  if (!itemId) {
    return { ok: false, error: "Select an item for the count." };
  }

  const officeId = form.officeId.trim() || companyOrdersOfficeId;
  if (!officeId) {
    return {
      ok: false,
      error: "Select a location before saving liquor inventory.",
    };
  }

  const countDate = form.countDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(countDate)) {
    return { ok: false, error: "Count date must use YYYY-MM-DD format." };
  }

  const quantityRaw = form.quantity.trim();
  const barRaw = form.barQuantity.trim();
  const bodegaRaw = form.bodegaBottleCount.trim();
  const quantity = quantityRaw ? Number(quantityRaw) : null;
  const barQuantity = barRaw ? Number(barRaw) : null;
  const bodegaBottleCount = bodegaRaw ? Number(bodegaRaw) : null;
  const hasSplit = barQuantity !== null || bodegaBottleCount !== null;

  const selectedItem = liquorCatalog.find((candidate) => candidate.id === itemId) || null;
  const itemSizeMl = selectedItem?.sizeMl ?? null;
  const bodegaQuantity =
    bodegaBottleCount === null
      ? null
      : itemSizeMl && itemSizeMl > 0
        ? Number((bodegaBottleCount * itemSizeMl).toFixed(3))
        : null;

  const resolvedQuantity = hasSplit
    ? (barQuantity || 0) + (bodegaQuantity || 0)
    : quantity;

  if (
    resolvedQuantity === null ||
    !Number.isFinite(resolvedQuantity) ||
    resolvedQuantity < 0
  ) {
    return { ok: false, error: "Count quantity must be zero or greater." };
  }

  if (barQuantity !== null && (!Number.isFinite(barQuantity) || barQuantity < 0)) {
    return { ok: false, error: "Bar quantity must be zero or greater." };
  }

  if (
    bodegaBottleCount !== null &&
    (!Number.isFinite(bodegaBottleCount) || bodegaBottleCount < 0)
  ) {
    return { ok: false, error: "Bodega bottle count must be zero or greater." };
  }

  if (
    bodegaBottleCount !== null &&
    bodegaBottleCount > 0 &&
    (!itemSizeMl || itemSizeMl <= 0)
  ) {
    return {
      ok: false,
      error: "Qty/ML is required before entering bodega bottles.",
    };
  }

  return {
    ok: true,
    payload: {
      itemId,
      officeId,
      countDate,
      quantity: Number(resolvedQuantity.toFixed(3)),
      barQuantity: barQuantity === null ? undefined : barQuantity,
      bodegaBottleCount: bodegaBottleCount === null ? undefined : bodegaBottleCount,
      notes: form.notes.trim() || undefined,
    },
  };
}
