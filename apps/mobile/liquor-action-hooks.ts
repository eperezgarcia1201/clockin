import type { LiquorSheetDraft } from "./types";
import {
  buildLiquorCatalogUpdatePayload,
  buildLiquorCountPayload,
} from "./liquor-operation-payloads";
import {
  analyzeLiquorInvoicePhotoRows,
  applyLiquorInvoiceRowsToInventory,
  captureAndAnalyzeLiquorBottle,
  pickLiquorInvoicePhotoFromLibrary,
} from "./liquor-photo-workflows";
import type { UseLiquorActionsParams } from "./liquor-action-types";

export const useLiquorActions = (params: UseLiquorActionsParams) => {
  const updateLiquorSheetDraft = (
    itemId: string,
    field: keyof LiquorSheetDraft,
    value: string,
  ) => {
    params.setLiquorSheetDrafts((previous) => ({
      ...previous,
      [itemId]: {
        ...(previous[itemId] || {
          supplierName: "",
          unitCost: "",
          sizeMl: "",
          barQuantity: "",
          bodegaQuantity: "",
        }),
        [field]: value,
      },
    }));
  };

  const saveLiquorCatalogRow = async (itemId: string) => {
    if (!params.hasLiquorAccess || !params.liquorHeaders) {
      params.setLiquorStatus(params.t.liquorManagerOnly);
      return;
    }
    const draft = params.liquorSheetDrafts[itemId];
    if (!draft) {
      return;
    }
    const validation = buildLiquorCatalogUpdatePayload(draft);
    if (!validation.ok) {
      if (validation.error === "invalid_unit_cost") {
        params.setLiquorStatus(params.t.liquorPriceNonNegative);
      } else {
        params.setLiquorStatus(params.t.liquorQtyMlPositive);
      }
      return;
    }

    params.setLiquorSavingItemId(itemId);
    try {
      await params.fetchJson(`/liquor-inventory/catalog/${itemId}`, {
        method: "PUT",
        headers: params.liquorHeaders,
        body: JSON.stringify(validation.payload),
      });
      params.setLiquorStatus(params.t.liquorCatalogRowSaved);
      await params.loadLiquorControlData();
    } catch (error) {
      params.setLiquorStatus(
        error instanceof Error ? error.message : params.t.liquorCatalogSaveFailed,
      );
    } finally {
      params.setLiquorSavingItemId(null);
    }
  };

  const saveLiquorCountRow = async (itemId: string) => {
    if (!params.hasLiquorAccess || !params.liquorHeaders) {
      params.setLiquorStatus(params.t.liquorManagerOnly);
      return;
    }
    if (!params.selectedOfficeId) {
      params.setLiquorStatus(params.t.selectLocationBeforeClockIn);
      return;
    }
    const draft = params.liquorSheetDrafts[itemId];
    if (!draft) {
      return;
    }
    const validation = buildLiquorCountPayload({
      itemId,
      officeId: params.selectedOfficeId,
      countDate: params.liquorCountDate,
      draft,
    });
    if (!validation.ok) {
      if (validation.error === "invalid_bar_quantity") {
        params.setLiquorStatus(params.t.liquorBarNonNegative);
      } else if (validation.error === "invalid_bodega_quantity") {
        params.setLiquorStatus(params.t.liquorBodegaNonNegative);
      } else {
        params.setLiquorStatus(params.t.liquorCountDateFormat);
      }
      return;
    }

    params.setLiquorSavingCountItemId(itemId);
    try {
      await params.fetchJson("/liquor-inventory/counts", {
        method: "POST",
        headers: params.liquorHeaders,
        body: JSON.stringify(validation.payload),
      });
      params.setLiquorStatus(params.t.liquorInventoryRowSaved);
      await params.loadLiquorControlData();
    } catch (error) {
      params.setLiquorStatus(
        error instanceof Error
          ? error.message
          : params.t.liquorInventorySaveFailed,
      );
    } finally {
      params.setLiquorSavingCountItemId(null);
    }
  };

  const analyzeLiquorBottleForItem = async (itemId: string) => {
    if (!params.hasLiquorAccess || !params.liquorHeaders) {
      params.setLiquorStatus(params.t.liquorManagerOnly);
      return;
    }
    if (!params.hasLiquorPremiumAccess) {
      params.setLiquorStatus(params.t.liquorPremiumDisabled);
      return;
    }
    if (!params.selectedOfficeId) {
      params.setLiquorStatus(params.t.selectLocationBeforeClockIn);
      return;
    }

    params.setLiquorAnalyzingItemId(itemId);
    try {
      const result = await captureAndAnalyzeLiquorBottle({
        itemId,
        officeId: params.selectedOfficeId,
        containerKey: params.liquorScanContainerKey,
        fetchJson: params.fetchJson,
        headers: params.liquorHeaders,
      });
      if (result.state === "camera_permission_required") {
        params.setLiquorStatus(params.t.liquorCameraPermissionRequired);
        return;
      }
      if (result.state === "canceled") {
        return;
      }
      params.setLiquorStatus(
        `${params.t.liquorBottleScanSaved} ${params.t.liquorBottleScanFill} ${result.fillPercent}% • ${params.t.liquorBottleScanSpent} ${result.spentMl} ml.`,
      );
      await params.loadLiquorControlData();
    } catch (error) {
      params.setLiquorStatus(
        error instanceof Error ? error.message : params.t.liquorBottleScanAnalyzeFailed,
      );
    } finally {
      params.setLiquorAnalyzingItemId(null);
    }
  };

  const pickLiquorInvoicePhoto = async () => {
    if (!params.hasLiquorAccess) {
      params.setLiquorStatus(params.t.liquorManagerOnly);
      return;
    }
    if (!params.hasLiquorPremiumAccess) {
      params.setLiquorStatus(params.t.liquorPremiumDisabled);
      return;
    }
    const result = await pickLiquorInvoicePhotoFromLibrary();
    if (result.state === "library_permission_required") {
      params.setLiquorStatus(params.t.liquorInvoiceMediaPermission);
      return;
    }
    if (result.state === "canceled") {
      return;
    }
    params.setLiquorInvoiceImageDataUrl(result.imageDataUrl);
    params.setLiquorInvoiceImageName(result.imageName);
  };

  const analyzeLiquorInvoicePhoto = async () => {
    if (!params.hasLiquorAccess || !params.liquorHeaders) {
      params.setLiquorStatus(params.t.liquorManagerOnly);
      return;
    }
    if (!params.hasLiquorPremiumAccess) {
      params.setLiquorStatus(params.t.liquorPremiumDisabled);
      return;
    }
    if (!params.selectedOfficeId) {
      params.setLiquorStatus(params.t.liquorInvoiceSelectLocation);
      return;
    }
    if (!params.liquorInvoiceImageDataUrl) {
      params.setLiquorStatus(params.t.liquorInvoiceSelectPhoto);
      return;
    }
    params.setLiquorInvoiceAnalyzing(true);
    try {
      const { rows, extractedCount } = await analyzeLiquorInvoicePhotoRows({
        officeId: params.selectedOfficeId,
        invoiceDate: params.liquorInvoiceDate,
        invoiceNumber: params.liquorInvoiceNumber,
        supplierName: params.liquorInvoiceSupplier,
        notes: params.liquorInvoiceNotes,
        imageDataUrl: params.liquorInvoiceImageDataUrl,
        fetchJson: params.fetchJson,
        headers: params.liquorHeaders,
      });
      params.setLiquorInvoiceRows(rows);
      params.setLiquorInvoiceImageDataUrl("");
      params.setLiquorInvoiceImageName("");
      params.setLiquorStatus(
        `${params.t.liquorInvoiceAnalyzeSaved} ${extractedCount} ${params.t.liquorInvoiceRowsExtracted}.`,
      );
    } catch (error) {
      params.setLiquorStatus(
        error instanceof Error ? error.message : params.t.liquorInvoiceAnalyzeFailed,
      );
    } finally {
      params.setLiquorInvoiceAnalyzing(false);
    }
  };

  const applyLiquorInvoiceRows = async () => {
    if (!params.hasLiquorAccess || !params.liquorHeaders) {
      params.setLiquorStatus(params.t.liquorManagerOnly);
      return;
    }
    if (!params.hasLiquorPremiumAccess) {
      params.setLiquorStatus(params.t.liquorPremiumDisabled);
      return;
    }
    if (!params.selectedOfficeId) {
      params.setLiquorStatus(params.t.liquorInvoiceSelectLocation);
      return;
    }
    if (params.liquorInvoiceRows.length === 0) {
      params.setLiquorStatus(params.t.liquorInvoiceNeedRows);
      return;
    }
    params.setLiquorInvoiceApplying(true);
    try {
      await applyLiquorInvoiceRowsToInventory({
        officeId: params.selectedOfficeId,
        invoiceDate: params.liquorInvoiceDate,
        invoiceNumber: params.liquorInvoiceNumber,
        supplierName: params.liquorInvoiceSupplier,
        notes: params.liquorInvoiceNotes,
        createPurchaseMovements: params.liquorInvoiceIncludePurchases,
        rows: params.liquorInvoiceRows,
        fetchJson: params.fetchJson,
        headers: params.liquorHeaders,
      });
      params.setLiquorInvoiceRows([]);
      params.setLiquorStatus(params.t.liquorInvoiceApplied);
      await params.loadLiquorControlData();
    } catch (error) {
      params.setLiquorStatus(
        error instanceof Error ? error.message : params.t.liquorInvoiceApplyFailed,
      );
    } finally {
      params.setLiquorInvoiceApplying(false);
    }
  };

  return {
    updateLiquorSheetDraft,
    saveLiquorCatalogRow,
    saveLiquorCountRow,
    analyzeLiquorBottleForItem,
    pickLiquorInvoicePhoto,
    analyzeLiquorInvoicePhoto,
    applyLiquorInvoiceRows,
  };
};
