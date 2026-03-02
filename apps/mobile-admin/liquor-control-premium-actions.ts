import {
  analyzeLiquorInvoicePhotoRows,
  applyLiquorInvoiceRowsToInventory,
  captureAndAnalyzeLiquorBottle,
  pickLiquorInvoicePhotoFromLibrary,
} from "./liquor-photo-workflows";
import {
  ensureLiquorManagerAccess,
  ensureLiquorPremiumAccess,
} from "./liquor-control-action-access";
import type { LiquorControlActionsParams } from "./liquor-control-action-hooks.types";

export const createLiquorControlPremiumActions = (
  params: LiquorControlActionsParams,
  loadLiquorControlData: () => Promise<void>,
) => {
  const analyzeLiquorBottleForItem = async (itemId: string) => {
    if (!ensureLiquorManagerAccess(params)) {
      return;
    }
    if (!ensureLiquorPremiumAccess(params)) {
      return;
    }
    if (!params.companyOrdersOfficeId) {
      params.setLiquorStatus("Select a location before bottle scan.");
      return;
    }

    params.setLiquorAnalyzingItemId(itemId);
    try {
      const result = await captureAndAnalyzeLiquorBottle({
        itemId,
        officeId: params.companyOrdersOfficeId,
        containerKey: params.liquorScanContainerKey,
        fetchJson: params.fetchJson,
      });
      if (result.state === "status") {
        params.setLiquorStatus(result.message);
        if (result.reload) {
          await loadLiquorControlData();
        }
      }
    } catch (error) {
      params.setLiquorStatus(
        error instanceof Error ? error.message : "Unable to analyze bottle photo.",
      );
    } finally {
      params.setLiquorAnalyzingItemId(null);
    }
  };

  const pickLiquorInvoicePhoto = async () => {
    if (!ensureLiquorManagerAccess(params)) {
      return;
    }
    if (!ensureLiquorPremiumAccess(params)) {
      return;
    }

    const result = await pickLiquorInvoicePhotoFromLibrary();
    if (result.state === "status") {
      params.setLiquorStatus(result.message);
      return;
    }
    if (result.state === "selected") {
      params.setLiquorInvoiceImageDataUrl(result.imageDataUrl);
      params.setLiquorInvoiceImageName(result.imageName);
    }
  };

  const analyzeLiquorInvoicePhoto = async () => {
    if (!ensureLiquorManagerAccess(params)) {
      return;
    }
    if (!ensureLiquorPremiumAccess(params)) {
      return;
    }
    if (!params.companyOrdersOfficeId) {
      params.setLiquorStatus("Select a location before invoice OCR.");
      return;
    }
    if (!params.liquorInvoiceImageDataUrl) {
      params.setLiquorStatus("Select an invoice photo first.");
      return;
    }

    params.setLiquorInvoiceAnalyzing(true);
    try {
      const { rows, extractedCount } = await analyzeLiquorInvoicePhotoRows({
        officeId: params.companyOrdersOfficeId,
        invoiceDate: params.liquorInvoiceDate,
        invoiceNumber: params.liquorInvoiceNumber,
        supplierName: params.liquorInvoiceSupplier,
        notes: params.liquorInvoiceNotes,
        imageDataUrl: params.liquorInvoiceImageDataUrl,
        fetchJson: params.fetchJson,
      });
      params.setLiquorInvoiceRows(rows);
      params.setLiquorInvoiceImageDataUrl("");
      params.setLiquorInvoiceImageName("");
      params.setLiquorStatus(`Invoice analyzed. ${extractedCount} rows extracted.`);
    } catch (error) {
      params.setLiquorStatus(
        error instanceof Error ? error.message : "Unable to analyze invoice photo.",
      );
    } finally {
      params.setLiquorInvoiceAnalyzing(false);
    }
  };

  const applyLiquorInvoiceRows = async () => {
    if (!ensureLiquorManagerAccess(params)) {
      return;
    }
    if (!ensureLiquorPremiumAccess(params)) {
      return;
    }
    if (!params.companyOrdersOfficeId) {
      params.setLiquorStatus("Select a location before invoice OCR.");
      return;
    }
    if (params.liquorInvoiceRows.length === 0) {
      params.setLiquorStatus("Analyze an invoice with at least one row before applying.");
      return;
    }

    params.setLiquorInvoiceApplying(true);
    try {
      await applyLiquorInvoiceRowsToInventory({
        officeId: params.companyOrdersOfficeId,
        invoiceDate: params.liquorInvoiceDate,
        invoiceNumber: params.liquorInvoiceNumber,
        supplierName: params.liquorInvoiceSupplier,
        notes: params.liquorInvoiceNotes,
        createPurchaseMovements: params.liquorInvoiceIncludePurchases,
        rows: params.liquorInvoiceRows,
        fetchJson: params.fetchJson,
      });
      params.setLiquorInvoiceRows([]);
      params.setLiquorStatus("Invoice rows applied.");
      await loadLiquorControlData();
    } catch (error) {
      params.setLiquorStatus(
        error instanceof Error ? error.message : "Unable to apply invoice rows.",
      );
    } finally {
      params.setLiquorInvoiceApplying(false);
    }
  };

  return {
    analyzeLiquorBottleForItem,
    pickLiquorInvoicePhoto,
    analyzeLiquorInvoicePhoto,
    applyLiquorInvoiceRows,
  };
};
