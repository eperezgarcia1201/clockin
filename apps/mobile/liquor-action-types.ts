import type { Dispatch, SetStateAction } from "react";
import type { LiquorInvoiceExtractedRow, LiquorSheetDraft } from "./types";

export type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export type LiquorText = {
  liquorManagerOnly: string;
  liquorPriceNonNegative: string;
  liquorQtyMlPositive: string;
  liquorCatalogRowSaved: string;
  liquorCatalogSaveFailed: string;
  selectLocationBeforeClockIn: string;
  liquorBarNonNegative: string;
  liquorBodegaNonNegative: string;
  liquorCountDateFormat: string;
  liquorInventoryRowSaved: string;
  liquorInventorySaveFailed: string;
  liquorPremiumDisabled: string;
  liquorCameraPermissionRequired: string;
  liquorBottleScanSaved: string;
  liquorBottleScanFill: string;
  liquorBottleScanSpent: string;
  liquorBottleScanAnalyzeFailed: string;
  liquorInvoiceMediaPermission: string;
  liquorInvoiceSelectLocation: string;
  liquorInvoiceSelectPhoto: string;
  liquorInvoiceAnalyzeSaved: string;
  liquorInvoiceRowsExtracted: string;
  liquorInvoiceAnalyzeFailed: string;
  liquorInvoiceNeedRows: string;
  liquorInvoiceApplied: string;
  liquorInvoiceApplyFailed: string;
};

export type UseLiquorActionsParams = {
  hasLiquorAccess: boolean;
  hasLiquorPremiumAccess: boolean;
  selectedOfficeId: string | null;
  liquorHeaders: Record<string, string> | undefined;
  liquorSheetDrafts: Record<string, LiquorSheetDraft>;
  liquorCountDate: string;
  liquorScanContainerKey: string;
  liquorInvoiceDate: string;
  liquorInvoiceNumber: string;
  liquorInvoiceSupplier: string;
  liquorInvoiceNotes: string;
  liquorInvoiceIncludePurchases: boolean;
  liquorInvoiceImageDataUrl: string;
  liquorInvoiceRows: LiquorInvoiceExtractedRow[];
  t: LiquorText;
  fetchJson: FetchJson;
  loadLiquorControlData: () => Promise<void>;
  setLiquorStatus: Dispatch<SetStateAction<string | null>>;
  setLiquorSheetDrafts: Dispatch<
    SetStateAction<Record<string, LiquorSheetDraft>>
  >;
  setLiquorSavingItemId: Dispatch<SetStateAction<string | null>>;
  setLiquorSavingCountItemId: Dispatch<SetStateAction<string | null>>;
  setLiquorAnalyzingItemId: Dispatch<SetStateAction<string | null>>;
  setLiquorInvoiceImageDataUrl: Dispatch<SetStateAction<string>>;
  setLiquorInvoiceImageName: Dispatch<SetStateAction<string>>;
  setLiquorInvoiceRows: Dispatch<SetStateAction<LiquorInvoiceExtractedRow[]>>;
  setLiquorInvoiceAnalyzing: Dispatch<SetStateAction<boolean>>;
  setLiquorInvoiceApplying: Dispatch<SetStateAction<boolean>>;
};
