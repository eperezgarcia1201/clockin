import type { Dispatch, SetStateAction } from "react";
import type { Lang } from "./copy";
import type {
  LiquorBottleScanRow,
  LiquorCatalogAiResponse,
  LiquorCatalogItem,
  LiquorCountRow,
  LiquorInvoiceExtractedRow,
  LiquorMonthlyReport,
  LiquorMovementRow,
  LiquorMovementType,
  LiquorSheetDraft,
  LiquorUpcLookupResponse,
  LiquorYearlyControl,
} from "./types";

export type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export type LiquorCatalogFormState = {
  supplierName: string;
  name: string;
  brand: string;
  upc: string;
  sizeMl: string;
  unitCost: string;
};

export type LiquorKindFormState = {
  newKind: string;
  deleteKind: string;
};

export type LiquorMovementFormState = {
  itemId: string;
  officeId: string;
  type: LiquorMovementType;
  quantity: string;
  occurredAt: string;
  notes: string;
};

export type LiquorQuickCountFormState = {
  itemId: string;
  officeId: string;
  countDate: string;
  quantity: string;
  barQuantity: string;
  bodegaBottleCount: string;
  notes: string;
};

export type LiquorControlActionsParams = {
  fetchJson: FetchJson;
  language: Lang;
  bytesToBase64: (bytes: Uint8Array) => string;
  loggedIn: boolean;
  hasLiquorManagerAccess: boolean;
  hasLiquorPremiumAccess: boolean;
  companyOrdersOfficeId: string;
  liquorMonth: string;
  liquorYear: string;
  liquorTargetCostPct: string;
  liquorCatalog: LiquorCatalogItem[];
  liquorCounts: LiquorCountRow[];
  liquorMovements: LiquorMovementRow[];
  liquorBottleScans: LiquorBottleScanRow[];
  liquorMonthly: LiquorMonthlyReport | null;
  liquorMonthlyPrevious: LiquorMonthlyReport | null;
  liquorYearly: LiquorYearlyControl | null;
  liquorCatalogForm: LiquorCatalogFormState;
  liquorKindForm: LiquorKindFormState;
  liquorLookupUpc: string;
  liquorCatalogAiQuery: string;
  liquorMovementForm: LiquorMovementFormState;
  liquorQuickCountForm: LiquorQuickCountFormState;
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
  setLiquorKinds: Dispatch<SetStateAction<string[]>>;
  setLiquorCatalog: Dispatch<SetStateAction<LiquorCatalogItem[]>>;
  setLiquorCounts: Dispatch<SetStateAction<LiquorCountRow[]>>;
  setLiquorMovements: Dispatch<SetStateAction<LiquorMovementRow[]>>;
  setLiquorMonthly: Dispatch<SetStateAction<LiquorMonthlyReport | null>>;
  setLiquorMonthlyPrevious: Dispatch<SetStateAction<LiquorMonthlyReport | null>>;
  setLiquorYearly: Dispatch<SetStateAction<LiquorYearlyControl | null>>;
  setLiquorBottleScans: Dispatch<SetStateAction<LiquorBottleScanRow[]>>;
  setLiquorSheetDrafts: Dispatch<SetStateAction<Record<string, LiquorSheetDraft>>>;
  setLiquorInvoiceRows: Dispatch<SetStateAction<LiquorInvoiceExtractedRow[]>>;
  setLiquorInvoiceImageDataUrl: Dispatch<SetStateAction<string>>;
  setLiquorInvoiceImageName: Dispatch<SetStateAction<string>>;
  setLiquorStatus: Dispatch<SetStateAction<string | null>>;
  setLiquorLoading: Dispatch<SetStateAction<boolean>>;
  setLiquorSavingItemId: Dispatch<SetStateAction<string | null>>;
  setLiquorSavingCountItemId: Dispatch<SetStateAction<string | null>>;
  setLiquorCatalogForm: Dispatch<SetStateAction<LiquorCatalogFormState>>;
  setLiquorLookupResult: Dispatch<SetStateAction<LiquorUpcLookupResponse | null>>;
  setLiquorActionLoading: Dispatch<SetStateAction<string | null>>;
  setLiquorKindForm: Dispatch<SetStateAction<LiquorKindFormState>>;
  setLiquorLookupLoading: Dispatch<SetStateAction<boolean>>;
  setLiquorCatalogAiLoading: Dispatch<SetStateAction<boolean>>;
  setLiquorCatalogAiResult: Dispatch<SetStateAction<LiquorCatalogAiResponse | null>>;
  setLiquorCatalogSearch: Dispatch<SetStateAction<string>>;
  setLiquorMovementForm: Dispatch<SetStateAction<LiquorMovementFormState>>;
  setLiquorQuickCountForm: Dispatch<SetStateAction<LiquorQuickCountFormState>>;
  setLiquorAnalyzingItemId: Dispatch<SetStateAction<string | null>>;
  setLiquorInvoiceAnalyzing: Dispatch<SetStateAction<boolean>>;
  setLiquorInvoiceApplying: Dispatch<SetStateAction<boolean>>;
  setLiquorExportingFormat: Dispatch<SetStateAction<"pdf" | "csv" | "excel" | null>>;
};
