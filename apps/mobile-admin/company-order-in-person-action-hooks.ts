import { useCallback } from "react";
import {
  companyOrderItemKey,
  normalizeCompanyOrderQuantityInput,
  normalizeExpenseAmountInput,
  shiftWeekStartDateKey,
} from "./app-helpers";
import {
  saveCompanyOrderInPersonData,
  updateCompanyOrderInPersonDraftValue,
  type CompanyOrderInPersonDrafts,
} from "./company-order-in-person-runtime";
import type { CompanyOrderInPersonSupplier } from "./types";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export const useCompanyOrderInPersonActions = (params: {
  fetchJson: FetchJson;
  officeId: string;
  weekStartDate: string;
  suppliers: CompanyOrderInPersonSupplier[];
  drafts: CompanyOrderInPersonDrafts;
  setDrafts: (value: CompanyOrderInPersonDrafts | ((previous: CompanyOrderInPersonDrafts) => CompanyOrderInPersonDrafts)) => void;
  setStatus: (value: string | null) => void;
  setSaving: (value: boolean) => void;
  setWeekStartDate: (value: string) => void;
  setSuppliers: (value: CompanyOrderInPersonSupplier[]) => void;
  setWeekEndDate: (value: string) => void;
  setSelectedSupplierName: (value: string) => void;
}) => {
  const setPurchasedQuantity = useCallback(
    (
      supplierName: string,
      nameEs: string,
      nameEn: string,
      value: string,
    ) => {
      const itemKey = companyOrderItemKey(nameEs, nameEn);
      const normalized = normalizeCompanyOrderQuantityInput(value);
      params.setDrafts((previous) =>
        updateCompanyOrderInPersonDraftValue(previous, supplierName, itemKey, {
          purchasedQuantity: normalized,
        }),
      );
    },
    [],
  );

  const setUnitPrice = useCallback(
    (
      supplierName: string,
      nameEs: string,
      nameEn: string,
      value: string,
    ) => {
      const itemKey = companyOrderItemKey(nameEs, nameEn);
      const normalized = normalizeExpenseAmountInput(value);
      params.setDrafts((previous) =>
        updateCompanyOrderInPersonDraftValue(previous, supplierName, itemKey, {
          unitPrice: normalized,
        }),
      );
    },
    [],
  );

  const setCompanyUnitPrice = useCallback(
    (
      supplierName: string,
      nameEs: string,
      nameEn: string,
      value: string,
    ) => {
      const itemKey = companyOrderItemKey(nameEs, nameEn);
      const normalized = normalizeExpenseAmountInput(value);
      params.setDrafts((previous) =>
        updateCompanyOrderInPersonDraftValue(previous, supplierName, itemKey, {
          companyUnitPrice: normalized,
        }),
      );
    },
    [],
  );

  const saveInPersonShopping = useCallback(async () => {
    params.setSaving(true);
    params.setStatus(null);
    const result = await saveCompanyOrderInPersonData({
      fetchJson: params.fetchJson,
      weekStartDate: params.weekStartDate,
      officeId: params.officeId,
      suppliers: params.suppliers,
      drafts: params.drafts,
    });
    if (result.ok === false) {
      params.setStatus(result.error);
      params.setSaving(false);
      return;
    }
    params.setWeekStartDate(result.weekStartDate);
    params.setWeekEndDate(result.weekEndDate);
    params.setSuppliers(result.suppliers);
    params.setDrafts(result.drafts);
    params.setSelectedSupplierName(result.suppliers[0]?.supplierName || "");
    params.setStatus("In person shopping saved.");
    params.setSaving(false);
  }, [
    params.drafts,
    params.fetchJson,
    params.officeId,
    params.suppliers,
    params.weekStartDate,
  ]);

  const shiftWeek = useCallback(
    (deltaWeeks: number) => {
      params.setWeekStartDate(
        shiftWeekStartDateKey(params.weekStartDate, deltaWeeks),
      );
    },
    [params.weekStartDate],
  );

  return {
    setPurchasedQuantity,
    setUnitPrice,
    setCompanyUnitPrice,
    saveInPersonShopping,
    goToPreviousWeek: () => shiftWeek(-1),
    goToNextWeek: () => shiftWeek(1),
  };
};
