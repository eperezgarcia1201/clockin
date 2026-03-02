import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { CompanyOrderDrafts } from "./company-order-draft-helpers";
import type {
  CompanyOrderCatalogSupplier,
  CompanyOrderRow,
  EmployeeViewTab,
  LiquorBottleScanRow,
  LiquorCatalogItem,
  LiquorCountRow,
  LiquorInvoiceExtractedRow,
  LiquorSheetDraft,
} from "./types";

export const useWorkspaceRefreshEffects = (params: {
  tenantHydrated: boolean;
  hasCompanyOrdersAccess: boolean;
  hasLiquorAccess: boolean;
  loadEmployees: () => Promise<void>;
  loadTodaySchedule: () => Promise<void>;
  loadWorkingNow: () => Promise<void>;
  loadCompanyOrderCatalog: () => Promise<void>;
  loadCompanyOrders: () => Promise<void>;
  loadLiquorControlData: () => Promise<void>;
  setActiveViewTab: Dispatch<SetStateAction<EmployeeViewTab>>;
  setCompanyOrderCatalog: Dispatch<SetStateAction<CompanyOrderCatalogSupplier[]>>;
  setCompanyOrderSupplier: Dispatch<SetStateAction<string>>;
  setCompanyOrderSearch: Dispatch<SetStateAction<string>>;
  setCompanyOrderNotes: Dispatch<SetStateAction<string>>;
  setCompanyOrderDrafts: Dispatch<SetStateAction<CompanyOrderDrafts>>;
  setCompanyOrderRows: Dispatch<SetStateAction<CompanyOrderRow[]>>;
  setCompanyOrderStatus: Dispatch<SetStateAction<string | null>>;
  setLiquorCatalog: Dispatch<SetStateAction<LiquorCatalogItem[]>>;
  setLiquorCounts: Dispatch<SetStateAction<LiquorCountRow[]>>;
  setLiquorBottleScans: Dispatch<SetStateAction<LiquorBottleScanRow[]>>;
  setLiquorSheetDrafts: Dispatch<SetStateAction<Record<string, LiquorSheetDraft>>>;
  setLiquorInvoiceRows: Dispatch<SetStateAction<LiquorInvoiceExtractedRow[]>>;
  setLiquorInvoiceImageDataUrl: Dispatch<SetStateAction<string>>;
  setLiquorInvoiceImageName: Dispatch<SetStateAction<string>>;
  setLiquorStatus: Dispatch<SetStateAction<string | null>>;
}) => {
  useEffect(() => {
    if (!params.tenantHydrated) {
      return;
    }
    void params.loadEmployees();
    void params.loadTodaySchedule();
    void params.loadWorkingNow();
  }, [
    params.loadEmployees,
    params.loadTodaySchedule,
    params.loadWorkingNow,
    params.tenantHydrated,
  ]);

  useEffect(() => {
    if (!params.tenantHydrated) {
      return;
    }
    if (!params.hasCompanyOrdersAccess) {
      params.setActiveViewTab((currentTab) =>
        currentTab === "companyOrders" ? "clock" : currentTab,
      );
      params.setCompanyOrderCatalog([]);
      params.setCompanyOrderSupplier("");
      params.setCompanyOrderSearch("");
      params.setCompanyOrderNotes("");
      params.setCompanyOrderDrafts({});
      params.setCompanyOrderRows([]);
      params.setCompanyOrderStatus(null);
      return;
    }
    void params.loadCompanyOrderCatalog();
    void params.loadCompanyOrders();
  }, [
    params.hasCompanyOrdersAccess,
    params.loadCompanyOrderCatalog,
    params.loadCompanyOrders,
    params.tenantHydrated,
    params.setActiveViewTab,
    params.setCompanyOrderCatalog,
    params.setCompanyOrderDrafts,
    params.setCompanyOrderNotes,
    params.setCompanyOrderRows,
    params.setCompanyOrderSearch,
    params.setCompanyOrderStatus,
    params.setCompanyOrderSupplier,
  ]);

  useEffect(() => {
    if (!params.tenantHydrated) {
      return;
    }
    if (!params.hasLiquorAccess) {
      params.setLiquorCatalog([]);
      params.setLiquorCounts([]);
      params.setLiquorBottleScans([]);
      params.setLiquorSheetDrafts({});
      params.setLiquorInvoiceRows([]);
      params.setLiquorInvoiceImageDataUrl("");
      params.setLiquorInvoiceImageName("");
      params.setLiquorStatus(null);
      return;
    }
    void params.loadLiquorControlData();
  }, [
    params.hasLiquorAccess,
    params.loadLiquorControlData,
    params.tenantHydrated,
    params.setLiquorBottleScans,
    params.setLiquorCatalog,
    params.setLiquorCounts,
    params.setLiquorInvoiceImageDataUrl,
    params.setLiquorInvoiceImageName,
    params.setLiquorInvoiceRows,
    params.setLiquorSheetDrafts,
    params.setLiquorStatus,
  ]);
};
