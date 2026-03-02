import { normalizeOrderQuantityInput } from "./app-helpers";

export type CompanyOrderDrafts = Record<string, Record<string, string>>;
export type CompanyOrderCartItem = {
  supplierName: string;
  key: string;
  nameEs: string;
  nameEn: string;
  quantity: number;
};

export const withCompanyOrderDraftQuantity = (
  prev: CompanyOrderDrafts,
  supplierName: string,
  key: string,
  rawValue: string,
): CompanyOrderDrafts => {
  const normalized = normalizeOrderQuantityInput(rawValue);
  const supplierDraft = prev[supplierName] || {};

  if (!normalized) {
    if (!(key in supplierDraft)) {
      return prev;
    }
    const nextSupplierDraft = { ...supplierDraft };
    delete nextSupplierDraft[key];
    const next = { ...prev };
    if (Object.keys(nextSupplierDraft).length === 0) {
      delete next[supplierName];
    } else {
      next[supplierName] = nextSupplierDraft;
    }
    return next;
  }

  if (supplierDraft[key] === normalized) {
    return prev;
  }

  return {
    ...prev,
    [supplierName]: {
      ...supplierDraft,
      [key]: normalized,
    },
  };
};

export const incrementCompanyOrderQuantity = (currentRaw: string): string => {
  const current = Number(currentRaw || "0");
  const next = Number.isFinite(current) && current > 0 ? current + 1 : 1;
  return String(next);
};

export const stepCompanyOrderQuantity = (
  currentRaw: string,
  delta: number,
): string => {
  const current = Number(currentRaw || "0");
  const next = Number((current + delta).toFixed(2));
  if (!Number.isFinite(next) || next <= 0) {
    return "";
  }
  return String(next);
};

export const buildCompanyOrderSupplierPayloads = (
  cartItems: CompanyOrderCartItem[],
): Array<{
  supplierName: string;
  items: Array<{ nameEs: string; nameEn: string; quantity: number }>;
}> => {
  const payloadBySupplier = new Map<
    string,
    Array<{ nameEs: string; nameEn: string; quantity: number }>
  >();
  cartItems.forEach((item) => {
    const supplierItems = payloadBySupplier.get(item.supplierName) || [];
    supplierItems.push({
      nameEs: item.nameEs,
      nameEn: item.nameEn,
      quantity: item.quantity,
    });
    payloadBySupplier.set(item.supplierName, supplierItems);
  });
  return Array.from(payloadBySupplier.entries()).map(
    ([supplierName, items]) => ({
      supplierName,
      items,
    }),
  );
};
