import type { Dispatch, SetStateAction } from "react";
import { companyOrderItemKey } from "./app-helpers";
import {
  incrementCompanyOrderQuantity,
  stepCompanyOrderQuantity,
  type CompanyOrderDrafts,
  withCompanyOrderDraftQuantity,
} from "./company-order-draft-helpers";
import {
  buildCompanyOrderSupplierPayloads,
  type CompanyOrderCartItem,
} from "./company-order-view-helpers";
import {
  buildCompanyOrderExportStatus,
  buildCompanyOrderSubmittedStatus,
  resolveCompanyOrderExportWeekStart,
  submitCompanyOrdersRequest,
  validateCompanyOrderSubmission,
} from "./company-order-actions-runtime";
import type { CompanyOrderCatalogItem, CompanyOrderCatalogSupplier } from "./types";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export const useCompanyOrderActions = (params: {
  setCompanyOrderDrafts: Dispatch<SetStateAction<CompanyOrderDrafts>>;
  setCompanyOrderStatus: Dispatch<SetStateAction<string | null>>;
  setCompanyOrderSaving: Dispatch<SetStateAction<boolean>>;
  setLastSubmittedCompanyOrderWeekStart: Dispatch<SetStateAction<string>>;
  setCompanyOrderNotes: Dispatch<SetStateAction<string>>;
  setCompanyOrderSearch: Dispatch<SetStateAction<string>>;
  setCompanyOrderExportingFormat: Dispatch<
    SetStateAction<"pdf" | "csv" | "excel" | null>
  >;
  selectedCompanyOrderSupplier: CompanyOrderCatalogSupplier | null;
  selectedCompanySupplierDraft: Record<string, string>;
  companyOrderCartItems: CompanyOrderCartItem[];
  fetchJson: FetchJson;
  companyOrdersOfficeId: string;
  companyOrderNotes: string;
  lastSubmittedCompanyOrderWeekStart: string;
  loadCompanyOrders: () => Promise<void>;
  fetchCompanyOrderExport: (
    format: "pdf" | "csv" | "excel",
    weekStartDate: string,
  ) => Promise<boolean>;
}) => {
  const setCompanyOrderDraftQuantity = (
    supplierName: string,
    key: string,
    rawValue: string,
  ) => {
    params.setCompanyOrderDrafts((previous) =>
      withCompanyOrderDraftQuantity(previous, supplierName, key, rawValue),
    );
  };

  const handleCompanyOrderAddItem = (item: CompanyOrderCatalogItem) => {
    if (!params.selectedCompanyOrderSupplier) {
      return;
    }
    const supplierName = params.selectedCompanyOrderSupplier.supplierName;
    const key = companyOrderItemKey(item.nameEs, item.nameEn);
    const next = incrementCompanyOrderQuantity(
      params.selectedCompanySupplierDraft[key] || "0",
    );
    setCompanyOrderDraftQuantity(supplierName, key, next);
  };

  const handleCompanyOrderStepItem = (
    supplierName: string,
    key: string,
    delta: number,
  ) => {
    params.setCompanyOrderDrafts((previous) => {
      const currentRaw = (previous[supplierName] || {})[key] || "0";
      const next = stepCompanyOrderQuantity(currentRaw, delta);
      return withCompanyOrderDraftQuantity(previous, supplierName, key, next);
    });
  };

  const handleCompanyOrderRemoveItem = (supplierName: string, key: string) => {
    setCompanyOrderDraftQuantity(supplierName, key, "");
  };

  const submitCompanyOrder = async () => {
    params.setCompanyOrderStatus(null);
    const supplierPayloads = buildCompanyOrderSupplierPayloads(
      params.companyOrderCartItems,
    );

    const validation = validateCompanyOrderSubmission(supplierPayloads);
    if (validation.ok === false) {
      params.setCompanyOrderStatus(validation.error);
      return;
    }

    params.setCompanyOrderSaving(true);
    const result = await submitCompanyOrdersRequest({
      fetchJson: params.fetchJson,
      supplierPayloads,
      officeId: params.companyOrdersOfficeId,
      notes: params.companyOrderNotes,
      initialWeekStartDate: params.lastSubmittedCompanyOrderWeekStart,
    });
    if (result.ok === false) {
      params.setCompanyOrderStatus(result.error);
      params.setCompanyOrderSaving(false);
      return;
    }
    params.setLastSubmittedCompanyOrderWeekStart(result.weekStartDate);
    params.setCompanyOrderStatus(
      buildCompanyOrderSubmittedStatus(result.supplierCount),
    );
    params.setCompanyOrderDrafts({});
    params.setCompanyOrderNotes("");
    params.setCompanyOrderSearch("");
    await params.loadCompanyOrders();
    params.setCompanyOrderSaving(false);
  };

  const handleCompanyOrderExport = async (format: "pdf" | "csv" | "excel") => {
    params.setCompanyOrderExportingFormat(format);
    try {
      const weekStartDate = resolveCompanyOrderExportWeekStart(
        params.lastSubmittedCompanyOrderWeekStart,
      );
      const ok = await params.fetchCompanyOrderExport(format, weekStartDate);
      params.setCompanyOrderStatus(
        buildCompanyOrderExportStatus(format, weekStartDate, ok),
      );
    } catch (error) {
      params.setCompanyOrderStatus(
        error instanceof Error
          ? error.message
          : "Unable to export company order.",
      );
    } finally {
      params.setCompanyOrderExportingFormat(null);
    }
  };

  return {
    setCompanyOrderDraftQuantity,
    handleCompanyOrderAddItem,
    handleCompanyOrderStepItem,
    handleCompanyOrderRemoveItem,
    submitCompanyOrder,
    handleCompanyOrderExport,
  };
};
