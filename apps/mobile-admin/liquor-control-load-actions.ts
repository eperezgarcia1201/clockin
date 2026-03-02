import { liquorMovementTypes } from "./app-helpers";
import type { LiquorControlActionsParams } from "./liquor-control-action-hooks.types";
import { loadLiquorControlSnapshot } from "./liquor-control-runtime";
import type { LiquorSheetDraft } from "./types";

export const createLiquorControlLoadActions = (params: LiquorControlActionsParams) => {
  const loadLiquorControlData = async () => {
    if (!params.loggedIn || !params.hasLiquorManagerAccess) {
      params.setLiquorKinds([]);
      params.setLiquorCatalog([]);
      params.setLiquorCounts([]);
      params.setLiquorMovements([]);
      params.setLiquorMonthly(null);
      params.setLiquorMonthlyPrevious(null);
      params.setLiquorYearly(null);
      params.setLiquorBottleScans([]);
      params.setLiquorInvoiceRows([]);
      params.setLiquorInvoiceImageDataUrl("");
      params.setLiquorInvoiceImageName("");
      return;
    }

    params.setLiquorLoading(true);
    params.setLiquorStatus(null);
    try {
      const snapshot = await loadLiquorControlSnapshot({
        fetchJson: params.fetchJson,
        hasLiquorPremiumAccess: params.hasLiquorPremiumAccess,
        officeId: params.companyOrdersOfficeId,
        month: params.liquorMonth,
        year: params.liquorYear,
        targetCostPct: params.liquorTargetCostPct,
        movementTypes: liquorMovementTypes,
      });

      params.setLiquorKinds(snapshot.kinds);
      params.setLiquorCatalog(snapshot.items);
      params.setLiquorCounts(snapshot.counts);
      params.setLiquorMovements(snapshot.movements);
      params.setLiquorBottleScans(snapshot.scans);
      params.setLiquorMonthly(snapshot.monthly);
      params.setLiquorMonthlyPrevious(snapshot.monthlyPrevious);
      params.setLiquorYearly(snapshot.yearly);
    } catch (error) {
      params.setLiquorStatus(
        error instanceof Error ? error.message : "Unable to load liquor control.",
      );
    } finally {
      params.setLiquorLoading(false);
    }
  };

  const updateLiquorSheetDraft = (
    itemId: string,
    field: keyof LiquorSheetDraft,
    value: string,
  ) => {
    params.setLiquorSheetDrafts((previous) => ({
      ...previous,
      [itemId]: {
        ...(previous[itemId] || {
          name: "",
          brand: "",
          upc: "",
          supplierName: "",
          unitCost: "",
          sizeMl: "",
          barQuantity: "",
          bodegaBottleCount: "",
        }),
        [field]: value,
      },
    }));
  };

  return {
    loadLiquorControlData,
    updateLiquorSheetDraft,
  };
};
