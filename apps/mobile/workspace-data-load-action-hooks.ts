import { useCallback, type Dispatch, type SetStateAction } from "react";
import { loadCompanyOrderCatalogSuppliers, loadCompanyOrderRows } from "./company-order-load-runtime";
import { loadLiquorControlSnapshot } from "./liquor-control-runtime";
import type {
  CompanyOrderCatalogSupplier,
  CompanyOrderRow,
  LiquorBottleScanRow,
  LiquorCatalogItem,
  LiquorCountRow,
  LiquorInvoiceExtractedRow,
  TenantContext,
} from "./types";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

type WorkspaceDataLoadText = {
  unableToLoadCompanyOrders: string;
};

export const useWorkspaceDataLoadActions = (params: {
  tenant: TenantContext | null;
  canUseClockScreen: boolean;
  hasCompanyOrdersAccess: boolean;
  hasLiquorAccess: boolean;
  hasLiquorPremiumAccess: boolean;
  selectedOfficeId: string | null;
  companyOrderHeaders: Record<string, string> | undefined;
  liquorHeaders: Record<string, string> | undefined;
  fetchJson: FetchJson;
  t: WorkspaceDataLoadText;
  setCompanyOrderCatalog: Dispatch<SetStateAction<CompanyOrderCatalogSupplier[]>>;
  setCompanyOrderSupplier: Dispatch<SetStateAction<string>>;
  setCompanyOrderStatus: Dispatch<SetStateAction<string | null>>;
  setCompanyOrderRows: Dispatch<SetStateAction<CompanyOrderRow[]>>;
  setCompanyOrderLoading: Dispatch<SetStateAction<boolean>>;
  setLastSubmittedCompanyOrderWeekStart: Dispatch<SetStateAction<string>>;
  setLiquorCatalog: Dispatch<SetStateAction<LiquorCatalogItem[]>>;
  setLiquorCounts: Dispatch<SetStateAction<LiquorCountRow[]>>;
  setLiquorBottleScans: Dispatch<SetStateAction<LiquorBottleScanRow[]>>;
  setLiquorInvoiceRows: Dispatch<SetStateAction<LiquorInvoiceExtractedRow[]>>;
  setLiquorInvoiceImageDataUrl: Dispatch<SetStateAction<string>>;
  setLiquorInvoiceImageName: Dispatch<SetStateAction<string>>;
  setLiquorLoading: Dispatch<SetStateAction<boolean>>;
  setLiquorStatus: Dispatch<SetStateAction<string | null>>;
}) => {
  const loadCompanyOrderCatalog = useCallback(async () => {
    if (!params.tenant || !params.canUseClockScreen || !params.hasCompanyOrdersAccess) {
      params.setCompanyOrderCatalog([]);
      params.setCompanyOrderSupplier("");
      return;
    }

    try {
      const suppliers = await loadCompanyOrderCatalogSuppliers({
        fetchJson: params.fetchJson,
        companyOrderHeaders: params.companyOrderHeaders,
      });

      params.setCompanyOrderCatalog(suppliers);
      params.setCompanyOrderSupplier((previous) => {
        if (
          previous &&
          suppliers.some((supplier) => supplier.supplierName === previous)
        ) {
          return previous;
        }
        return suppliers[0]?.supplierName || "";
      });
    } catch (error) {
      params.setCompanyOrderStatus(
        error instanceof Error ? error.message : params.t.unableToLoadCompanyOrders,
      );
    }
  }, [
    params.canUseClockScreen,
    params.companyOrderHeaders,
    params.fetchJson,
    params.hasCompanyOrdersAccess,
    params.t.unableToLoadCompanyOrders,
    params.tenant,
    params.setCompanyOrderCatalog,
    params.setCompanyOrderStatus,
    params.setCompanyOrderSupplier,
  ]);

  const loadCompanyOrders = useCallback(async () => {
    if (!params.tenant || !params.canUseClockScreen || !params.hasCompanyOrdersAccess) {
      params.setCompanyOrderRows([]);
      return;
    }

    params.setCompanyOrderLoading(true);
    try {
      const orders = await loadCompanyOrderRows({
        fetchJson: params.fetchJson,
        selectedOfficeId: params.selectedOfficeId,
        companyOrderHeaders: params.companyOrderHeaders,
        limit: 20,
      });
      params.setCompanyOrderRows(orders);
      if (typeof orders[0]?.weekStartDate === "string") {
        params.setLastSubmittedCompanyOrderWeekStart(orders[0].weekStartDate);
      }
      params.setCompanyOrderStatus(null);
    } catch (error) {
      params.setCompanyOrderRows([]);
      params.setCompanyOrderStatus(
        error instanceof Error ? error.message : params.t.unableToLoadCompanyOrders,
      );
    } finally {
      params.setCompanyOrderLoading(false);
    }
  }, [
    params.canUseClockScreen,
    params.companyOrderHeaders,
    params.fetchJson,
    params.hasCompanyOrdersAccess,
    params.selectedOfficeId,
    params.t.unableToLoadCompanyOrders,
    params.tenant,
    params.setCompanyOrderLoading,
    params.setCompanyOrderRows,
    params.setCompanyOrderStatus,
    params.setLastSubmittedCompanyOrderWeekStart,
  ]);

  const loadLiquorControlData = useCallback(async () => {
    if (
      !params.tenant ||
      !params.canUseClockScreen ||
      !params.hasLiquorAccess ||
      !params.selectedOfficeId
    ) {
      params.setLiquorCatalog([]);
      params.setLiquorCounts([]);
      params.setLiquorBottleScans([]);
      params.setLiquorInvoiceRows([]);
      params.setLiquorInvoiceImageDataUrl("");
      params.setLiquorInvoiceImageName("");
      return;
    }

    params.setLiquorLoading(true);
    params.setLiquorStatus(null);
    try {
      const { items, counts, scans } = await loadLiquorControlSnapshot({
        fetchJson: params.fetchJson,
        hasLiquorPremiumAccess: params.hasLiquorPremiumAccess,
        selectedOfficeId: params.selectedOfficeId,
        liquorHeaders: params.liquorHeaders,
      });
      params.setLiquorCatalog(items);
      params.setLiquorCounts(counts);
      params.setLiquorBottleScans(scans);
    } catch (error) {
      params.setLiquorStatus(
        error instanceof Error
          ? error.message
          : "Unable to load liquor control right now.",
      );
    } finally {
      params.setLiquorLoading(false);
    }
  }, [
    params.canUseClockScreen,
    params.fetchJson,
    params.hasLiquorAccess,
    params.hasLiquorPremiumAccess,
    params.liquorHeaders,
    params.selectedOfficeId,
    params.tenant,
    params.setLiquorBottleScans,
    params.setLiquorCatalog,
    params.setLiquorCounts,
    params.setLiquorInvoiceImageDataUrl,
    params.setLiquorInvoiceImageName,
    params.setLiquorInvoiceRows,
    params.setLiquorLoading,
    params.setLiquorStatus,
  ]);

  return {
    loadCompanyOrderCatalog,
    loadCompanyOrders,
    loadLiquorControlData,
  };
};
