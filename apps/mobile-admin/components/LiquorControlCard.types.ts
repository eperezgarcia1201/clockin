import type { Dispatch, SetStateAction } from "react";
import type { Lang } from "../copy";
import type { LiquorControlViewModel } from "../liquor-control-view-helpers";
import type {
  LiquorCatalogAiResponse,
  LiquorInvoiceExtractedRow,
  LiquorSheetDraft,
  LiquorUpcLookupResponse,
  LiquorWorkspace,
  LiquorYearlyControl,
  Office,
} from "../types";
import type {
  LiquorMovementFormState,
  LiquorQuickCountFormState,
} from "./LiquorOperationsSection.types";

export type LiquorKindFormState = {
  newKind: string;
  deleteKind: string;
};

export type LiquorCatalogFormState = {
  supplierName: string;
  name: string;
  brand: string;
  upc: string;
  sizeMl: string;
  unitCost: string;
};

export type LiquorControlCardProps = {
  isLight: boolean;
  inline: (value: string) => string;
  inlineOrNull: (value: string | null | undefined) => string | null;
  language: Lang;
  liquorInventoryEnabled: boolean;
  hasLiquorManagerAccess: boolean;
  hasLiquorPremiumAccess: boolean;
  liquorMonth: string;
  onLiquorMonthChange: (value: string) => void;
  liquorYear: string;
  onLiquorYearChange: (value: string) => void;
  liquorTargetCostPct: string;
  onLiquorTargetCostPctChange: (value: string) => void;
  companyOrdersOfficeId: string;
  liquorLoading: boolean;
  onRefreshLiquor: () => void;
  liquorWorkspace: LiquorWorkspace;
  onLiquorWorkspaceChange: (value: LiquorWorkspace) => void;
  liquorStatus: string | null;
  viewModel: LiquorControlViewModel;
  liquorCountDate: string;
  onLiquorCountDateChange: (value: string) => void;
  liquorInventorySearch: string;
  onLiquorInventorySearchChange: (value: string) => void;
  liquorSheetDrafts: Record<string, LiquorSheetDraft>;
  liquorKinds: string[];
  liquorSavingItemId: string | null;
  liquorSavingCountItemId: string | null;
  onUpdateLiquorSheetDraft: (
    itemId: string,
    key: keyof LiquorSheetDraft,
    value: string,
  ) => void;
  onSaveLiquorCatalogRow: (itemId: string) => void;
  onSaveLiquorCountRow: (itemId: string) => void;
  onShowMoreInventoryRows: () => void;
  liquorCatalogSearch: string;
  onLiquorCatalogSearchChange: (value: string) => void;
  liquorKindForm: LiquorKindFormState;
  setLiquorKindForm: Dispatch<SetStateAction<LiquorKindFormState>>;
  liquorActionLoading: string | null;
  onCreateLiquorKind: () => void;
  onDeleteLiquorKind: () => void;
  liquorCatalogAiQuery: string;
  onLiquorCatalogAiQueryChange: (value: string) => void;
  liquorCatalogAiLoading: boolean;
  onAssistLiquorCatalog: () => void;
  liquorCatalogAiResult: LiquorCatalogAiResponse | null;
  onApplyAiMatchToCatalogSearch: (value: string) => void;
  onJumpAiMatchToInventory: (value: string) => void;
  liquorLookupUpc: string;
  onLiquorLookupUpcChange: (value: string) => void;
  liquorLookupLoading: boolean;
  onLookupLiquorByUpc: () => void;
  liquorLookupResult: LiquorUpcLookupResponse | null;
  liquorCatalogForm: LiquorCatalogFormState;
  setLiquorCatalogForm: Dispatch<SetStateAction<LiquorCatalogFormState>>;
  onCreateLiquorCatalogItem: () => void;
  onShowMoreCatalogItems: () => void;
  offices: Office[];
  liquorMovementForm: LiquorMovementFormState;
  setLiquorMovementForm: Dispatch<SetStateAction<LiquorMovementFormState>>;
  onCreateLiquorMovement: () => void;
  liquorQuickCountForm: LiquorQuickCountFormState;
  setLiquorQuickCountForm: Dispatch<SetStateAction<LiquorQuickCountFormState>>;
  onSaveLiquorQuickCount: () => void;
  liquorScanItemId: string;
  onLiquorScanItemIdChange: (value: string) => void;
  liquorScanContainerKey: string;
  onLiquorScanContainerKeyChange: (value: string) => void;
  liquorAnalyzingItemId: string | null;
  onAnalyzeLiquorBottleForItem: (itemId: string) => void;
  liquorInvoiceDate: string;
  onLiquorInvoiceDateChange: (value: string) => void;
  liquorInvoiceNumber: string;
  onLiquorInvoiceNumberChange: (value: string) => void;
  liquorInvoiceSupplier: string;
  onLiquorInvoiceSupplierChange: (value: string) => void;
  liquorInvoiceNotes: string;
  onLiquorInvoiceNotesChange: (value: string) => void;
  liquorInvoiceIncludePurchases: boolean;
  onToggleLiquorInvoiceIncludePurchases: () => void;
  onPickLiquorInvoicePhoto: () => void;
  liquorInvoiceAnalyzing: boolean;
  onAnalyzeLiquorInvoicePhoto: () => void;
  liquorInvoiceApplying: boolean;
  onApplyLiquorInvoiceRows: () => void;
  liquorInvoiceImageName: string;
  liquorInvoiceRows: LiquorInvoiceExtractedRow[];
  liquorExportingFormat: "pdf" | "csv" | "excel" | null;
  onLiquorAnalyticsExport: (format: "pdf" | "csv" | "excel") => void;
  liquorMonthlyMonth: string | null;
  liquorMonthlyPreviousMonth: string | null;
  liquorYearly: LiquorYearlyControl | null;
};
