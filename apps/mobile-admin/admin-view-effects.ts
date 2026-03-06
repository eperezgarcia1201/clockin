import { useEffect } from "react";
import { resolveOfficeGeofenceDraftValues } from "./office-runtime";
import { syncLiquorSheetDrafts } from "./liquor-control-view-helpers";

export const useAdminViewEffects = (params: {
  loggedIn: boolean;
  screen: string;
  loadCompanyOrderCatalog: () => Promise<void>;
  loadCompanyOrders: () => Promise<void>;
  hasLiquorManagerAccess: boolean;
  loadLiquorControlData: () => Promise<void>;
  setLiquorCatalog: (value: any) => void;
  setLiquorCounts: (value: any) => void;
  setLiquorMovements: (value: any) => void;
  setLiquorMonthly: (value: any) => void;
  setLiquorMonthlyPrevious: (value: any) => void;
  setLiquorYearly: (value: any) => void;
  setLiquorBottleScans: (value: any) => void;
  setLiquorSheetDrafts: (value: any) => void;
  setLiquorInvoiceRows: (value: any) => void;
  setLiquorInvoiceImageDataUrl: (value: string) => void;
  setLiquorInvoiceImageName: (value: string) => void;
  setLiquorStatus: (value: string | null) => void;
  companyOrdersOfficeId: string;
  liquorMonth: string;
  liquorTargetCostPct: string;
  liquorYear: string;
  scopedLocationId: string;
  salesExpenseMethod: string;
  setSalesExpenseCheckNumber: (value: string) => void;
  setSalesExpensePayToCompany: (value: string) => void;
  officeGeoTarget: {
    id?: string;
    latitude?: number | null;
    longitude?: number | null;
    geofenceRadiusMeters?: number | null;
  } | null;
  setOfficeGeoLatitude: (value: string) => void;
  setOfficeGeoLongitude: (value: string) => void;
  setOfficeGeoRadius: (value: string) => void;
  setOfficeGeoStatus: (value: string | null) => void;
  liquorInventorySearch: string;
  setLiquorInventoryVisibleCount: (value: number) => void;
  liquorCatalogSearch: string;
  setLiquorCatalogVisibleCount: (value: number) => void;
  liquorSheetRows: any;
}) => {
  useEffect(() => {
    if (!params.loggedIn) return;
    if (params.screen === "companyOrders") {
      void params.loadCompanyOrderCatalog();
      void params.loadCompanyOrders();
      return;
    }
    if (params.screen === "liquorControl") {
      if (params.hasLiquorManagerAccess) {
        void params.loadLiquorControlData();
      } else {
        params.setLiquorCatalog([]);
        params.setLiquorCounts([]);
        params.setLiquorMovements([]);
        params.setLiquorMonthly(null);
        params.setLiquorMonthlyPrevious(null);
        params.setLiquorYearly(null);
        params.setLiquorBottleScans([]);
        params.setLiquorSheetDrafts({});
        params.setLiquorInvoiceRows([]);
        params.setLiquorInvoiceImageDataUrl("");
        params.setLiquorInvoiceImageName("");
        params.setLiquorStatus(null);
      }
    }
  }, [
    params.companyOrdersOfficeId,
    params.hasLiquorManagerAccess,
    params.liquorMonth,
    params.liquorTargetCostPct,
    params.liquorYear,
    params.loggedIn,
    params.scopedLocationId,
    params.screen,
  ]);

  useEffect(() => {
    if (params.salesExpenseMethod !== "CHECK") {
      params.setSalesExpenseCheckNumber("");
      params.setSalesExpensePayToCompany("");
    }
  }, [params.salesExpenseMethod]);

  useEffect(() => {
    const draft = resolveOfficeGeofenceDraftValues(params.officeGeoTarget);
    params.setOfficeGeoLatitude(draft.latitude);
    params.setOfficeGeoLongitude(draft.longitude);
    params.setOfficeGeoRadius(draft.radius);
    params.setOfficeGeoStatus(null);
  }, [
    params.officeGeoTarget?.id,
    params.officeGeoTarget?.latitude,
    params.officeGeoTarget?.longitude,
    params.officeGeoTarget?.geofenceRadiusMeters,
  ]);

  useEffect(() => {
    params.setLiquorInventoryVisibleCount(20);
  }, [params.liquorInventorySearch]);

  useEffect(() => {
    params.setLiquorCatalogVisibleCount(24);
  }, [params.liquorCatalogSearch]);

  useEffect(() => {
    params.setLiquorSheetDrafts((previous: any) =>
      syncLiquorSheetDrafts(previous, params.liquorSheetRows),
    );
  }, [params.liquorSheetRows]);
};
