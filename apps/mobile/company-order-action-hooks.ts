import type { Dispatch, SetStateAction } from "react";
import { companyOrderItemKey, getCurrentWeekStartDateKey } from "./app-helpers";
import {
  buildCompanyOrderSupplierPayloads,
  type CompanyOrderCartItem,
  incrementCompanyOrderQuantity,
  stepCompanyOrderQuantity,
  type CompanyOrderDrafts,
  withCompanyOrderDraftQuantity,
} from "./company-order-draft-helpers";
import type { CompanyOrderCatalogItem, CompanyOrderCatalogSupplier } from "./types";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

type CopyText = {
  kitchenManagerOnly: string;
  noOrderItemsForSupplier: string;
  selectLocationBeforeClockIn: string;
  companyOrderSaved: string;
  unableToLoadCompanyOrders: string;
};

export const useCompanyOrderActions = (params: {
  hasCompanyOrdersAccess: boolean;
  companyOrdersActor: { id: string; name: string } | null;
  requiresLocationSelection: boolean;
  selectedOfficeId: string | null;
  selectedCompanyOrderSupplier: CompanyOrderCatalogSupplier | null;
  selectedCompanySupplierDraft: Record<string, string>;
  companyOrderCartItems: CompanyOrderCartItem[];
  companyOrderHeaders: Record<string, string> | undefined;
  companyOrderNotes: string;
  lastSubmittedCompanyOrderWeekStart: string;
  t: CopyText;
  fetchJson: FetchJson;
  fetchCompanyOrderExport: (
    format: "pdf" | "csv" | "excel",
    weekStartDate: string,
    headers: Record<string, string> | undefined,
  ) => Promise<boolean>;
  loadCompanyOrders: () => Promise<void>;
  setCompanyOrderDrafts: Dispatch<SetStateAction<CompanyOrderDrafts>>;
  setCompanyOrderStatus: Dispatch<SetStateAction<string | null>>;
  setCompanyOrderSaving: Dispatch<SetStateAction<boolean>>;
  setLastSubmittedCompanyOrderWeekStart: Dispatch<SetStateAction<string>>;
  setCompanyOrderNotes: Dispatch<SetStateAction<string>>;
  setCompanyOrderSearch: Dispatch<SetStateAction<string>>;
  setCompanyOrderExportingFormat: Dispatch<
    SetStateAction<"pdf" | "csv" | "excel" | null>
  >;
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
    if (!params.hasCompanyOrdersAccess || !params.companyOrdersActor) {
      params.setCompanyOrderStatus(params.t.kitchenManagerOnly);
      return;
    }
    const supplierPayloads = buildCompanyOrderSupplierPayloads(
      params.companyOrderCartItems,
    );

    if (supplierPayloads.length === 0) {
      params.setCompanyOrderStatus(params.t.noOrderItemsForSupplier);
      return;
    }

    if (params.requiresLocationSelection && !params.selectedOfficeId) {
      params.setCompanyOrderStatus(params.t.selectLocationBeforeClockIn);
      return;
    }

    params.setCompanyOrderSaving(true);
    params.setCompanyOrderStatus(null);
    try {
      let weekStartDate = params.lastSubmittedCompanyOrderWeekStart;
      for (const payload of supplierPayloads) {
        const createdOrder = (await params.fetchJson("/company-orders", {
          method: "POST",
          headers: params.companyOrderHeaders,
          body: JSON.stringify({
            supplierName: payload.supplierName,
            officeId: params.selectedOfficeId || undefined,
            notes: params.companyOrderNotes.trim() || undefined,
            items: payload.items,
          }),
        })) as { weekStartDate?: string };
        if (typeof createdOrder.weekStartDate === "string") {
          weekStartDate = createdOrder.weekStartDate;
        }
      }
      params.setLastSubmittedCompanyOrderWeekStart(weekStartDate);
      params.setCompanyOrderStatus(
        `${params.t.companyOrderSaved} (${supplierPayloads.length} suppliers)`,
      );
      params.setCompanyOrderDrafts({});
      params.setCompanyOrderNotes("");
      params.setCompanyOrderSearch("");
      await params.loadCompanyOrders();
    } catch (error) {
      params.setCompanyOrderStatus(
        error instanceof Error
          ? error.message
          : params.t.unableToLoadCompanyOrders,
      );
    } finally {
      params.setCompanyOrderSaving(false);
    }
  };

  const handleCompanyOrderExport = async (format: "pdf" | "csv" | "excel") => {
    if (!params.hasCompanyOrdersAccess || !params.companyOrdersActor) {
      params.setCompanyOrderStatus(params.t.kitchenManagerOnly);
      return;
    }
    params.setCompanyOrderExportingFormat(format);
    try {
      const weekStartDate =
        params.lastSubmittedCompanyOrderWeekStart || getCurrentWeekStartDateKey();
      const ok = await params.fetchCompanyOrderExport(
        format,
        weekStartDate,
        params.companyOrderHeaders,
      );
      if (ok) {
        params.setCompanyOrderStatus(
          `${params.t.companyOrderSaved} ${format.toUpperCase()} ready for week ${weekStartDate}.`,
        );
      } else {
        params.setCompanyOrderStatus(params.t.unableToLoadCompanyOrders);
      }
    } catch (error) {
      params.setCompanyOrderStatus(
        error instanceof Error
          ? error.message
          : params.t.unableToLoadCompanyOrders,
      );
    } finally {
      params.setCompanyOrderExportingFormat(null);
    }
  };

  return {
    handleCompanyOrderAddItem,
    handleCompanyOrderStepItem,
    handleCompanyOrderRemoveItem,
    submitCompanyOrder,
    handleCompanyOrderExport,
  };
};
