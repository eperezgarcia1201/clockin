import {
  buildLiquorCatalogCreatePayload,
  buildLiquorCatalogUpdatePayload,
  buildLiquorCountRowPayload,
} from "./liquor-catalog-payloads";
import { resolveLiquorCatalogAssist } from "./liquor-catalog-assist";
import { ensureLiquorManagerAccess, ensureLiquorPremiumAccess } from "./liquor-control-action-access";
import type { LiquorControlActionsParams } from "./liquor-control-action-hooks.types";
import {
  createLiquorCatalogItemRequest,
  createLiquorKindRequest,
  deleteLiquorKindRequest,
  lookupLiquorByUpcRequest,
  saveLiquorCatalogRowRequest,
  saveLiquorCountRowRequest,
} from "./liquor-control-runtime";
import { mergeLiquorUpcLookupIntoForm } from "./liquor-upc-lookup";

export const createLiquorControlCatalogActions = (
  params: LiquorControlActionsParams,
  loadLiquorControlData: () => Promise<void>,
) => {
  const saveLiquorCatalogRow = async (itemId: string) => {
    if (!ensureLiquorManagerAccess(params)) {
      return;
    }
    const draft = params.liquorSheetDrafts[itemId];
    if (!draft) {
      return;
    }
    const updateValidation = buildLiquorCatalogUpdatePayload(draft);
    if (updateValidation.ok === false) {
      params.setLiquorStatus(updateValidation.error);
      return;
    }

    params.setLiquorSavingItemId(itemId);
    try {
      const result = await saveLiquorCatalogRowRequest({
        fetchJson: params.fetchJson,
        itemId,
        payload: updateValidation.payload,
      });
      if (result.ok === false) {
        params.setLiquorStatus(result.error);
        return;
      }
      params.setLiquorStatus("Liquor catalog row saved.");
      await loadLiquorControlData();
    } finally {
      params.setLiquorSavingItemId(null);
    }
  };

  const saveLiquorCountRow = async (itemId: string) => {
    if (!ensureLiquorManagerAccess(params)) {
      return;
    }
    const draft = params.liquorSheetDrafts[itemId];
    if (!draft) {
      return;
    }
    const countValidation = buildLiquorCountRowPayload({
      itemId,
      draft,
      liquorCatalog: params.liquorCatalog,
      liquorCountDate: params.liquorCountDate,
      companyOrdersOfficeId: params.companyOrdersOfficeId,
    });
    if (countValidation.ok === false) {
      params.setLiquorStatus(countValidation.error);
      return;
    }

    params.setLiquorSavingCountItemId(itemId);
    try {
      const result = await saveLiquorCountRowRequest({
        fetchJson: params.fetchJson,
        payload: countValidation.payload,
      });
      if (result.ok === false) {
        params.setLiquorStatus(result.error);
        return;
      }
      params.setLiquorStatus("Liquor inventory row saved.");
      await loadLiquorControlData();
    } finally {
      params.setLiquorSavingCountItemId(null);
    }
  };

  const createLiquorCatalogItem = async () => {
    if (!ensureLiquorManagerAccess(params)) {
      return;
    }
    const createValidation = buildLiquorCatalogCreatePayload(params.liquorCatalogForm);
    if (createValidation.ok === false) {
      params.setLiquorStatus(createValidation.error);
      return;
    }

    params.setLiquorActionLoading("create-catalog-item");
    try {
      const result = await createLiquorCatalogItemRequest({
        fetchJson: params.fetchJson,
        payload: createValidation.payload,
      });
      if (result.ok === false) {
        params.setLiquorStatus(result.error);
        return;
      }
      params.setLiquorCatalogForm({
        supplierName: "",
        name: "",
        brand: "",
        upc: "",
        sizeMl: "",
        unitCost: "",
      });
      params.setLiquorLookupResult(null);
      params.setLiquorStatus("Liquor catalog item created.");
      await loadLiquorControlData();
    } finally {
      params.setLiquorActionLoading(null);
    }
  };

  const createLiquorKind = async () => {
    if (!ensureLiquorManagerAccess(params)) {
      return;
    }
    const name = params.liquorKindForm.newKind.trim();
    if (!name) {
      params.setLiquorStatus("Kind name is required.");
      return;
    }

    params.setLiquorActionLoading("create-kind");
    try {
      const result = await createLiquorKindRequest({
        fetchJson: params.fetchJson,
        name,
      });
      if (result.ok === false) {
        params.setLiquorStatus(result.error);
        return;
      }
      params.setLiquorKindForm((previous) => ({ ...previous, newKind: "" }));
      params.setLiquorStatus("Kind saved.");
      await loadLiquorControlData();
    } finally {
      params.setLiquorActionLoading(null);
    }
  };

  const deleteLiquorKind = async () => {
    if (!ensureLiquorManagerAccess(params)) {
      return;
    }
    const name = params.liquorKindForm.deleteKind.trim();
    if (!name) {
      params.setLiquorStatus("Select a kind to delete.");
      return;
    }

    params.setLiquorActionLoading("delete-kind");
    try {
      const result = await deleteLiquorKindRequest({
        fetchJson: params.fetchJson,
        name,
      });
      if (result.ok === false) {
        params.setLiquorStatus(result.error);
        return;
      }
      params.setLiquorKindForm((previous) => ({ ...previous, deleteKind: "" }));
      params.setLiquorStatus("Kind deleted.");
      await loadLiquorControlData();
    } finally {
      params.setLiquorActionLoading(null);
    }
  };

  const lookupLiquorByUpc = async () => {
    if (!ensureLiquorManagerAccess(params)) {
      return;
    }
    const upc = params.liquorLookupUpc.trim();
    if (!upc) {
      params.setLiquorStatus("UPC is required.");
      return;
    }

    params.setLiquorLookupLoading(true);
    try {
      const result = await lookupLiquorByUpcRequest({
        fetchJson: params.fetchJson,
        upc,
      });
      if (result.ok === false) {
        params.setLiquorStatus(result.error);
        params.setLiquorLookupResult(null);
        return;
      }
      params.setLiquorLookupResult(result.payload);
      params.setLiquorCatalogForm((previous) =>
        mergeLiquorUpcLookupIntoForm({ payload: result.payload, upc, previousForm: previous }),
      );
      params.setLiquorStatus(result.statusMessage);
    } finally {
      params.setLiquorLookupLoading(false);
    }
  };

  const assistLiquorCatalog = async () => {
    if (!ensureLiquorManagerAccess(params)) {
      return;
    }
    if (!ensureLiquorPremiumAccess(params)) {
      return;
    }
    const query = params.liquorCatalogAiQuery.trim();
    if (!query) {
      params.setLiquorStatus("Enter an AI catalog request first.");
      return;
    }

    params.setLiquorCatalogAiLoading(true);
    try {
      const result = await resolveLiquorCatalogAssist({
        query,
        liquorCatalog: params.liquorCatalog,
        fetchJson: params.fetchJson,
      });
      params.setLiquorCatalogAiResult(result.payload);
      if (result.searchHint) {
        params.setLiquorCatalogSearch(result.searchHint);
      }
      params.setLiquorStatus(result.statusMessage);
    } finally {
      params.setLiquorCatalogAiLoading(false);
    }
  };

  return {
    saveLiquorCatalogRow,
    saveLiquorCountRow,
    createLiquorCatalogItem,
    createLiquorKind,
    deleteLiquorKind,
    lookupLiquorByUpc,
    assistLiquorCatalog,
  };
};
