import { nowDateTimeLocal } from "./app-helpers";
import { ensureLiquorManagerAccess } from "./liquor-control-action-access";
import type { LiquorControlActionsParams } from "./liquor-control-action-hooks.types";
import {
  createLiquorMovementRequest,
  saveLiquorQuickCountRequest,
} from "./liquor-control-runtime";
import {
  buildLiquorMovementPayload,
  buildLiquorQuickCountPayload,
} from "./liquor-operation-payloads";

export const createLiquorControlOperationsActions = (
  params: LiquorControlActionsParams,
  loadLiquorControlData: () => Promise<void>,
) => {
  const createLiquorMovement = async () => {
    if (!ensureLiquorManagerAccess(params)) {
      return;
    }
    const movementValidation = buildLiquorMovementPayload(
      params.liquorMovementForm,
      params.companyOrdersOfficeId,
    );
    if (movementValidation.ok === false) {
      params.setLiquorStatus(movementValidation.error);
      return;
    }

    params.setLiquorActionLoading("create-movement");
    try {
      const result = await createLiquorMovementRequest({
        fetchJson: params.fetchJson,
        payload: movementValidation.payload,
      });
      if (result.ok === false) {
        params.setLiquorStatus(result.error);
        return;
      }
      params.setLiquorMovementForm((previous) => ({
        ...previous,
        quantity: "",
        notes: "",
        occurredAt: nowDateTimeLocal(),
      }));
      params.setLiquorStatus("Liquor movement saved.");
      await loadLiquorControlData();
    } finally {
      params.setLiquorActionLoading(null);
    }
  };

  const saveLiquorQuickCount = async () => {
    if (!ensureLiquorManagerAccess(params)) {
      return;
    }
    const quickCountValidation = buildLiquorQuickCountPayload(
      params.liquorQuickCountForm,
      params.companyOrdersOfficeId,
      params.liquorCatalog,
    );
    if (quickCountValidation.ok === false) {
      params.setLiquorStatus(quickCountValidation.error);
      return;
    }

    params.setLiquorActionLoading("save-quick-count");
    try {
      const result = await saveLiquorQuickCountRequest({
        fetchJson: params.fetchJson,
        payload: quickCountValidation.payload,
      });
      if (result.ok === false) {
        params.setLiquorStatus(result.error);
        return;
      }
      params.setLiquorQuickCountForm((previous) => ({
        ...previous,
        quantity: "",
        barQuantity: "",
        bodegaBottleCount: "",
        notes: "",
      }));
      params.setLiquorStatus("Liquor count saved.");
      await loadLiquorControlData();
    } finally {
      params.setLiquorActionLoading(null);
    }
  };

  return {
    createLiquorMovement,
    saveLiquorQuickCount,
  };
};
