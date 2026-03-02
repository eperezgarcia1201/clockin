import { createLiquorControlCatalogActions } from "./liquor-control-catalog-actions";
import { createLiquorControlExportActions } from "./liquor-control-export-actions";
import type { LiquorControlActionsParams } from "./liquor-control-action-hooks.types";
import { createLiquorControlLoadActions } from "./liquor-control-load-actions";
import { createLiquorControlOperationsActions } from "./liquor-control-operations-actions";
import { createLiquorControlPremiumActions } from "./liquor-control-premium-actions";

export const useLiquorControlActions = (params: LiquorControlActionsParams) => {
  const loadActions = createLiquorControlLoadActions(params);
  const catalogActions = createLiquorControlCatalogActions(
    params,
    loadActions.loadLiquorControlData,
  );
  const operationsActions = createLiquorControlOperationsActions(
    params,
    loadActions.loadLiquorControlData,
  );
  const premiumActions = createLiquorControlPremiumActions(
    params,
    loadActions.loadLiquorControlData,
  );
  const exportActions = createLiquorControlExportActions(params);

  return {
    ...loadActions,
    ...catalogActions,
    ...operationsActions,
    ...premiumActions,
    ...exportActions,
  };
};
