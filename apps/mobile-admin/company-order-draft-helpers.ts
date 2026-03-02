import { normalizeCompanyOrderQuantityInput } from "./app-helpers";

export type CompanyOrderDrafts = Record<string, Record<string, string>>;

export const withCompanyOrderDraftQuantity = (
  prev: CompanyOrderDrafts,
  supplierName: string,
  key: string,
  rawValue: string,
): CompanyOrderDrafts => {
  const value = normalizeCompanyOrderQuantityInput(rawValue);
  const supplierDraft = prev[supplierName] || {};

  if (!value) {
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

  if (supplierDraft[key] === value) {
    return prev;
  }

  return {
    ...prev,
    [supplierName]: {
      ...supplierDraft,
      [key]: value,
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
