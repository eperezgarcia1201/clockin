export type LiquorCatalogItem = {
  id: string;
  name: string;
  brand: string | null;
  upc: string | null;
  unitLabel?: string | null;
  supplierName: string | null;
  sizeMl: number | null;
  unitCost: number;
  isActive: boolean;
};

export type LiquorCountRow = {
  id: string;
  officeId?: string;
  officeName?: string | null;
  itemId: string;
  itemName?: string;
  itemBrand?: string | null;
  itemUpc?: string | null;
  countDate: string;
  quantity: number;
  barQuantity: number | null;
  bodegaQuantity: number | null;
  bodegaBottleCount: number | null;
  itemSizeMl: number | null;
  notes?: string;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type LiquorBottleScanRow = {
  id: string;
  officeId?: string;
  officeName?: string | null;
  itemId: string;
  itemName: string;
  itemBrand?: string | null;
  source?: string;
  confidence?: number | null;
  createdBy?: string | null;
  containerKey: string | null;
  fillPercent: number;
  estimatedMl: number | null;
  measuredAt: string;
  createdAt: string;
};

export type LiquorSheetDraft = {
  name: string;
  brand: string;
  upc: string;
  supplierName: string;
  unitCost: string;
  sizeMl: string;
  barQuantity: string;
  bodegaBottleCount: string;
};

export type LiquorMovementType =
  | "PURCHASE"
  | "SALE"
  | "WASTE"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT";

export type LiquorMovementRow = {
  id: string;
  officeId: string;
  officeName: string;
  itemId: string;
  itemName: string;
  itemBrand: string | null;
  itemUpc: string | null;
  type: LiquorMovementType;
  quantity: number;
  unitCostOverride: number | null;
  occurredAt: string;
  notes: string;
  createdBy: string | null;
  createdAt: string;
};

export type LiquorMonthlyReport = {
  month: string;
  assumptions?: {
    targetLiquorCostPercent?: number;
  };
  summary: {
    itemCount: number;
    itemsMissingClosingCount: number;
    openingInventoryValue: number;
    closingInventoryValue: number;
    inventoryValueDelta: number;
    liquorSales: number;
    expectedUsageCost: number;
    actualUsageCost: number;
    usageCostVariance: number;
    expectedUsageCostPercent: number;
    actualUsageCostPercent: number | null;
  };
  rows: Array<{
    itemId: string;
    name: string;
    supplierName: string | null;
    openingUnits: number;
    receivedUnits: number;
    issuedUnits: number;
    closingUnits: number | null;
    actualUsageUnits: number | null;
    varianceUnits: number | null;
    unitCost: number;
    actualUsageCost: number | null;
  }>;
  intelligence?: {
    generatedAt: string;
    topVarianceItems: Array<{
      itemId: string;
      name: string;
      supplierName: string | null;
      varianceUnits: number;
      usageCost: number;
    }>;
    topUsageCostItems: Array<{
      itemId: string;
      name: string;
      supplierName: string | null;
      usageCost: number;
      actualUsageUnits: number;
    }>;
    supplierVariance: Array<{
      supplierName: string;
      itemCount: number;
      usageCost: number;
      varianceUnits: number;
    }>;
    topRiskItems: Array<{
      itemId: string;
      name: string;
      supplierName: string | null;
      riskScore: number;
      varianceUnits: number;
    }>;
    costShockItems: Array<{
      itemId: string;
      name: string;
      baselineCost: number;
      averageOverrideCost: number;
      deltaCost: number;
      deltaPct: number;
      severity: "normal" | "elevated" | "critical";
      isShock: boolean;
    }>;
  };
};

export type LiquorYearlyControl = {
  year: string;
  months: Array<{
    month: string;
    openingInventoryValue: number;
    closingInventoryValue: number;
    liquorSales: number;
    expectedUsageCost: number;
    actualUsageCost: number;
    usageCostVariance: number;
    expectedUsageCostPercent: number;
    actualUsageCostPercent: number | null;
    itemCount: number;
    itemsMissingClosingCount: number;
  }>;
  totals: {
    openingInventoryValue: number;
    closingInventoryValue: number;
    liquorSales: number;
    expectedUsageCost: number;
    actualUsageCost: number;
    usageCostVariance: number;
    expectedUsageCostPercent: number;
    actualUsageCostPercent: number | null;
  };
};

export type LiquorWorkspace =
  | "inventory"
  | "catalog"
  | "operations"
  | "scans"
  | "invoices"
  | "analytics"
  | "activity";

export type LiquorInvoiceExtractedRow = {
  rowNumber: number;
  company: string | null;
  liquorName: string;
  kind: string | null;
  upc: string | null;
  ml: number | null;
  unitCost: number | null;
  quantity: number | null;
  matchedItemId: string | null;
  matchedItemName: string | null;
  suggestedAction: "update" | "create";
  costShockDeltaPct: number | null;
  costShockSeverity: "normal" | "elevated" | "critical";
  costShockFlag: boolean;
};

export type LiquorInvoiceAnalyzeResponse = {
  analysis?: {
    model?: string;
    summary?: string;
    totalExtractedRows?: number;
    matchedCount?: number;
    costShockCount?: number;
  };
  rows?: Array<Record<string, unknown>>;
};

export type LiquorUpcLookupResponse = {
  source?: "local" | "external" | "none";
  item?: {
    id?: string;
    name?: string;
    brand?: string | null;
    upc?: string | null;
    sizeMl?: number | null;
    supplierName?: string | null;
    unitCost?: number | null;
  };
  candidate?: {
    name: string;
    brand: string | null;
    upc: string;
    sizeMl: number | null;
    sourceImageUrl?: string | null;
  };
};

export type LiquorCatalogAiMatch = {
  rank: number;
  score: number;
  reason: string;
  item: LiquorCatalogItem;
};

export type LiquorCatalogAiResponse = {
  source?: "ai" | "heuristic" | "none";
  model?: string;
  query?: string;
  summary?: string;
  searchHint?: string;
  matches?: LiquorCatalogAiMatch[];
};
