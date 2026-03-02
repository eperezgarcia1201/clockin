import { useState } from "react";
import {
  nowDateTimeLocal,
  todayDateKey,
} from "./app-helpers";
import type {
  LiquorBottleScanRow,
  LiquorCatalogAiResponse,
  LiquorCatalogItem,
  LiquorCountRow,
  LiquorInvoiceExtractedRow,
  LiquorMovementRow,
  LiquorMovementType,
  LiquorMonthlyReport,
  LiquorSheetDraft,
  LiquorUpcLookupResponse,
  LiquorWorkspace,
  LiquorYearlyControl,
} from "./types";

export function useAdminLiquorState() {
  const [liquorInventoryEnabled, setLiquorInventoryEnabled] = useState(false);
  const [liquorPremiumEnabled, setLiquorPremiumEnabled] = useState(false);
  const [liquorWorkspace, setLiquorWorkspace] =
    useState<LiquorWorkspace>("inventory");
  const [liquorMonth, setLiquorMonth] = useState(todayDateKey().slice(0, 7));
  const [liquorYear, setLiquorYear] = useState(todayDateKey().slice(0, 4));
  const [liquorTargetCostPct, setLiquorTargetCostPct] = useState("0.24");
  const [liquorCatalog, setLiquorCatalog] = useState<LiquorCatalogItem[]>([]);
  const [liquorCounts, setLiquorCounts] = useState<LiquorCountRow[]>([]);
  const [liquorMovements, setLiquorMovements] = useState<LiquorMovementRow[]>(
    [],
  );
  const [liquorMonthly, setLiquorMonthly] =
    useState<LiquorMonthlyReport | null>(null);
  const [liquorMonthlyPrevious, setLiquorMonthlyPrevious] =
    useState<LiquorMonthlyReport | null>(null);
  const [liquorYearly, setLiquorYearly] = useState<LiquorYearlyControl | null>(
    null,
  );
  const [liquorCatalogForm, setLiquorCatalogForm] = useState({
    supplierName: "",
    name: "",
    brand: "",
    upc: "",
    sizeMl: "",
    unitCost: "",
  });
  const [liquorKinds, setLiquorKinds] = useState<string[]>([]);
  const [liquorKindForm, setLiquorKindForm] = useState({
    newKind: "",
    deleteKind: "",
  });
  const [liquorInventorySearch, setLiquorInventorySearch] = useState("");
  const [liquorInventoryVisibleCount, setLiquorInventoryVisibleCount] =
    useState(20);
  const [liquorCatalogSearch, setLiquorCatalogSearch] = useState("");
  const [liquorCatalogVisibleCount, setLiquorCatalogVisibleCount] =
    useState(24);
  const [liquorCatalogAiQuery, setLiquorCatalogAiQuery] = useState("");
  const [liquorCatalogAiLoading, setLiquorCatalogAiLoading] = useState(false);
  const [liquorCatalogAiResult, setLiquorCatalogAiResult] =
    useState<LiquorCatalogAiResponse | null>(null);
  const [liquorLookupUpc, setLiquorLookupUpc] = useState("");
  const [liquorLookupLoading, setLiquorLookupLoading] = useState(false);
  const [liquorLookupResult, setLiquorLookupResult] =
    useState<LiquorUpcLookupResponse | null>(null);
  const [liquorMovementForm, setLiquorMovementForm] = useState({
    itemId: "",
    officeId: "",
    type: "PURCHASE" as LiquorMovementType,
    quantity: "",
    occurredAt: nowDateTimeLocal(),
    notes: "",
  });
  const [liquorQuickCountForm, setLiquorQuickCountForm] = useState({
    itemId: "",
    officeId: "",
    countDate: todayDateKey(),
    quantity: "",
    barQuantity: "",
    bodegaBottleCount: "",
    notes: "",
  });
  const [liquorScanItemId, setLiquorScanItemId] = useState("");
  const [liquorBottleScans, setLiquorBottleScans] = useState<
    LiquorBottleScanRow[]
  >([]);
  const [liquorSheetDrafts, setLiquorSheetDrafts] = useState<
    Record<string, LiquorSheetDraft>
  >({});
  const [liquorCountDate, setLiquorCountDate] = useState(todayDateKey());
  const [liquorScanContainerKey, setLiquorScanContainerKey] = useState("");
  const [liquorInvoiceDate, setLiquorInvoiceDate] = useState(todayDateKey());
  const [liquorInvoiceNumber, setLiquorInvoiceNumber] = useState("");
  const [liquorInvoiceSupplier, setLiquorInvoiceSupplier] = useState("");
  const [liquorInvoiceNotes, setLiquorInvoiceNotes] = useState("");
  const [liquorInvoiceIncludePurchases, setLiquorInvoiceIncludePurchases] =
    useState(true);
  const [liquorInvoiceImageDataUrl, setLiquorInvoiceImageDataUrl] =
    useState("");
  const [liquorInvoiceImageName, setLiquorInvoiceImageName] = useState("");
  const [liquorInvoiceRows, setLiquorInvoiceRows] = useState<
    LiquorInvoiceExtractedRow[]
  >([]);
  const [liquorInvoiceAnalyzing, setLiquorInvoiceAnalyzing] = useState(false);
  const [liquorInvoiceApplying, setLiquorInvoiceApplying] = useState(false);
  const [liquorLoading, setLiquorLoading] = useState(false);
  const [liquorExportingFormat, setLiquorExportingFormat] = useState<
    "pdf" | "csv" | "excel" | null
  >(null);
  const [liquorStatus, setLiquorStatus] = useState<string | null>(null);
  const [liquorActionLoading, setLiquorActionLoading] = useState<string | null>(
    null,
  );
  const [liquorSavingItemId, setLiquorSavingItemId] = useState<string | null>(
    null,
  );
  const [liquorSavingCountItemId, setLiquorSavingCountItemId] = useState<
    string | null
  >(null);
  const [liquorAnalyzingItemId, setLiquorAnalyzingItemId] = useState<
    string | null
  >(null);

  return {
    liquorInventoryEnabled,
    setLiquorInventoryEnabled,
    liquorPremiumEnabled,
    setLiquorPremiumEnabled,
    liquorWorkspace,
    setLiquorWorkspace,
    liquorMonth,
    setLiquorMonth,
    liquorYear,
    setLiquorYear,
    liquorTargetCostPct,
    setLiquorTargetCostPct,
    liquorCatalog,
    setLiquorCatalog,
    liquorCounts,
    setLiquorCounts,
    liquorMovements,
    setLiquorMovements,
    liquorMonthly,
    setLiquorMonthly,
    liquorMonthlyPrevious,
    setLiquorMonthlyPrevious,
    liquorYearly,
    setLiquorYearly,
    liquorCatalogForm,
    setLiquorCatalogForm,
    liquorKinds,
    setLiquorKinds,
    liquorKindForm,
    setLiquorKindForm,
    liquorInventorySearch,
    setLiquorInventorySearch,
    liquorInventoryVisibleCount,
    setLiquorInventoryVisibleCount,
    liquorCatalogSearch,
    setLiquorCatalogSearch,
    liquorCatalogVisibleCount,
    setLiquorCatalogVisibleCount,
    liquorCatalogAiQuery,
    setLiquorCatalogAiQuery,
    liquorCatalogAiLoading,
    setLiquorCatalogAiLoading,
    liquorCatalogAiResult,
    setLiquorCatalogAiResult,
    liquorLookupUpc,
    setLiquorLookupUpc,
    liquorLookupLoading,
    setLiquorLookupLoading,
    liquorLookupResult,
    setLiquorLookupResult,
    liquorMovementForm,
    setLiquorMovementForm,
    liquorQuickCountForm,
    setLiquorQuickCountForm,
    liquorScanItemId,
    setLiquorScanItemId,
    liquorBottleScans,
    setLiquorBottleScans,
    liquorSheetDrafts,
    setLiquorSheetDrafts,
    liquorCountDate,
    setLiquorCountDate,
    liquorScanContainerKey,
    setLiquorScanContainerKey,
    liquorInvoiceDate,
    setLiquorInvoiceDate,
    liquorInvoiceNumber,
    setLiquorInvoiceNumber,
    liquorInvoiceSupplier,
    setLiquorInvoiceSupplier,
    liquorInvoiceNotes,
    setLiquorInvoiceNotes,
    liquorInvoiceIncludePurchases,
    setLiquorInvoiceIncludePurchases,
    liquorInvoiceImageDataUrl,
    setLiquorInvoiceImageDataUrl,
    liquorInvoiceImageName,
    setLiquorInvoiceImageName,
    liquorInvoiceRows,
    setLiquorInvoiceRows,
    liquorInvoiceAnalyzing,
    setLiquorInvoiceAnalyzing,
    liquorInvoiceApplying,
    setLiquorInvoiceApplying,
    liquorLoading,
    setLiquorLoading,
    liquorExportingFormat,
    setLiquorExportingFormat,
    liquorStatus,
    setLiquorStatus,
    liquorActionLoading,
    setLiquorActionLoading,
    liquorSavingItemId,
    setLiquorSavingItemId,
    liquorSavingCountItemId,
    setLiquorSavingCountItemId,
    liquorAnalyzingItemId,
    setLiquorAnalyzingItemId,
  };
}
