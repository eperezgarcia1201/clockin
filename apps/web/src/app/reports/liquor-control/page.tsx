"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LiquorCatalogEditorTable } from "./components/LiquorCatalogEditorTable";
import { LiquorKindManager } from "./components/LiquorKindManager";
import { LiquorInventoryCountTable } from "./components/LiquorInventoryCountTable";
import { readPersistedLocationScope } from "./location-scope";
import {
  analyzeLiquorBottleScanRequest,
  analyzeLiquorInvoiceRequest,
  applyLiquorInvoiceRequest,
  createLiquorCatalogItemRequest,
  createLiquorCountRequest,
  createLiquorKindRequest,
  createLiquorMovementRequest,
  deleteLiquorKindRequest,
  fetchLiquorAccessRequest,
  fetchLiquorMonthlyReportRequest,
  fetchLiquorYearlyControlRequest,
  fetchOfficesRequest,
  listLiquorBottleScansRequest,
  listLiquorCatalogRequest,
  listLiquorCountsRequest,
  listLiquorKindsRequest,
  listLiquorMovementsRequest,
  lookupLiquorCatalogByUpcRequest,
  updateLiquorCatalogItemRequest,
} from "../../../lib/api/reports-liquor-control";
import { useUiLanguage } from "../../../lib/ui-language";

type Office = { id: string; name: string };

type LiquorCatalogItem = {
  id: string;
  name: string;
  brand: string | null;
  upc: string | null;
  sizeMl: number | null;
  unitLabel: string | null;
  supplierName: string | null;
  unitCost: number;
  isActive: boolean;
};

type LiquorMovement = {
  id: string;
  officeId: string;
  officeName: string;
  itemId: string;
  itemName: string;
  type: string;
  quantity: number;
  occurredAt: string;
  createdBy: string | null;
};

type LiquorCount = {
  id: string;
  officeId: string;
  officeName: string;
  itemId: string;
  itemName: string;
  countDate: string;
  quantity: number;
  barQuantity: number | null;
  bodegaQuantity: number | null;
  bodegaBottleCount: number | null;
  itemSizeMl: number | null;
  createdBy: string | null;
};

type BottleScan = {
  id: string;
  officeId: string;
  officeName: string;
  itemId: string;
  itemName: string;
  itemBrand: string | null;
  itemSizeMl: number | null;
  containerKey: string | null;
  measuredAt: string;
  fillPercent: number;
  estimatedMl: number | null;
  confidence: number | null;
  source: string;
  createdBy: string | null;
  createdAt: string;
};

type BottleScanAnalyzeResponse = {
  analysis?: {
    fillPercent?: number;
    confidence?: number | null;
    summary?: string;
    model?: string;
  };
  scan?: BottleScan;
  comparison?: {
    spentMl?: number | null;
    spentMlClamped?: number | null;
    daysBetween?: number | null;
    previousScan?: BottleScan | null;
  };
};

type SpreadsheetDraft = {
  name: string;
  brand: string;
  upc: string;
  supplierName: string;
  unitCost: string;
  sizeMl: string;
  barQuantity: string;
  bodegaBottleCount: string;
};

type MonthlyRow = {
  itemId: string;
  name: string;
  supplierName: string | null;
  unitCost: number;
  openingUnits: number;
  receivedUnits: number;
  issuedUnits: number;
  closingUnits: number | null;
  actualUsageUnits: number | null;
  actualUsageCost: number | null;
  varianceUnits: number | null;
};

type MonthlySummary = {
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

type MonthlyReport = {
  month: string;
  office: Office | null;
  summary: MonthlySummary;
  intelligence?: {
    generatedAt?: string;
    topVarianceItems?: Array<{
      itemId: string;
      name: string;
      supplierName: string | null;
      varianceUnits: number;
      varianceAbsUnits: number;
      actualUsageUnits: number | null;
      issuedUnits: number;
      usageCost: number | null;
    }>;
    topUsageCostItems?: Array<{
      itemId: string;
      name: string;
      supplierName: string | null;
      actualUsageUnits: number | null;
      actualUsageCost: number;
    }>;
    supplierVariance?: Array<{
      supplierName: string;
      itemCount: number;
      usageCost: number;
      varianceUnits: number;
      varianceAbsUnits: number;
    }>;
    topRiskItems?: Array<{
      itemId: string;
      name: string;
      supplierName: string | null;
      riskScore: number;
      varianceUnits: number | null;
      wasteUnits: number;
      adjustmentUnits: number;
      reasons: string[];
    }>;
    costShockItems?: Array<{
      itemId: string;
      name: string;
      supplierName: string | null;
      sampleCount: number;
      baselineCost: number;
      averageOverrideCost: number;
      deltaCost: number;
      deltaPct: number;
      severity: "normal" | "elevated" | "critical";
      isShock: boolean;
    }>;
  };
  rows: MonthlyRow[];
};

type InvoiceExtractedRow = {
  rowNumber: number;
  company: string | null;
  liquorName: string;
  kind: string | null;
  upc: string | null;
  ml: number | null;
  unitCost: number | null;
  quantity: number | null;
  lineTotal: number | null;
  confidence: number | null;
  matchedItem: {
    id: string;
    name: string;
    brand: string | null;
    upc: string | null;
    supplierName: string | null;
    sizeMl: number | null;
    unitCost: number;
  } | null;
  matchScore: number | null;
  matchedBy: string | null;
  suggestedAction: "update" | "create";
  costShock: {
    isShock: boolean;
    severity: "normal" | "elevated" | "critical";
    baselineCost: number;
    newCost: number;
    deltaCost: number;
    deltaPct: number;
  } | null;
};

type InvoiceAnalyzeResponse = {
  officeId: string | null;
  invoice: {
    supplierName: string | null;
    invoiceNumber: string | null;
    invoiceDate: string | null;
    notes: string | null;
  };
  analysis: {
    model: string;
    summary: string;
    totalExtractedRows: number;
    matchedCount: number;
    newItemCandidates: number;
    costShockCount: number;
    lowConfidenceCount: number;
    unresolvedRows: number;
  };
  rows: InvoiceExtractedRow[];
};

type InvoiceApplyResponse = {
  summary: {
    processedRows: number;
    skippedRows: number;
    createdItems: number;
    updatedItems: number;
    purchaseMovementsCreated: number;
    costShockCount: number;
  };
};

type YearlyMonth = {
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
};

type YearlyControl = {
  year: string;
  office: Office | null;
  assumptions: {
    targetLiquorCostPercent: number;
  };
  months: YearlyMonth[];
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

type UpcLookupResponse = {
  source?: "local" | "external" | "none";
  item?: LiquorCatalogItem;
  candidate?: {
    name: string;
    brand: string | null;
    upc: string;
    sizeMl: number | null;
    sourceImageUrl: string | null;
  };
};

const copy = {
  en: {
    title: "Liquor Control Sheet",
    subtitle:
      "Detailed item inventory feeds monthly liquor control by location.",
    month: "Month",
    year: "Year",
    office: "Location",
    allLocations: "All Locations",
    targetCostPct: "Target Cost %",
    refresh: "Refresh",
    loading: "Loading liquor control...",
    saveItem: "Add Catalog Item",
    postMovement: "Post Movement",
    saveCount: "Save Count",
    upcLookup: "UPC Lookup",
    lookup: "Lookup",
    monthlySummary: "Monthly Control Summary",
    yearlySummary: "Yearly Control Sheet",
    itemVariance: "Item-Level Variance",
    recentMovements: "Recent Movements",
    recentCounts: "Recent Counts",
    catalog: "Liquor Catalog",
    openingInventory: "Opening Inventory",
    closingInventory: "Closing Inventory",
    inventoryDelta: "Inventory Delta",
    liquorSales: "Liquor Sales",
    expectedUsage: "Expected Usage Cost",
    actualUsage: "Actual Usage Cost",
    usageVariance: "Usage Variance",
    expectedPct: "Expected Cost %",
    actualPct: "Actual Cost %",
    item: "Item",
    supplier: "Supplier",
    openingMl: "Opening",
    receivedMl: "Received",
    issuedMl: "Issued",
    closingMl: "Closing",
    usageMl: "Usage",
    usageCost: "Usage Cost",
    varianceMl: "Variance",
    missingCount: "Missing Closing Count",
    monthCol: "Month",
    items: "Items",
    missing: "Missing Counts",
    officeRequired: "Pick a location or set an active location scope.",
    featureDisabled:
      "Liquor inventory is disabled for this tenant. Ask your owner to enable it in Tenant Features.",
    premiumFeatureDisabled:
      "Premium liquor features are disabled for this tenant. Ask your owner to enable Premium Features in Tenant Features.",
    spreadsheetEditor: "Spreadsheet Editor",
    company: "Company",
    liquorName: "Liquor Names",
    liquorKind: "Kind",
    kindList: "Kind List",
    addKind: "Add Kind",
    deleteKind: "Delete Kind",
    kindPlaceholder: "Select or type kind",
    newKindPlaceholder: "Add new kind",
    kindDeletePlaceholder: "Select kind to hide",
    noKindsConfigured: "No kinds configured yet.",
    showMoreKinds: "Show more kinds",
    showLessKinds: "Show fewer kinds",
    price: "Price",
    qtyMl: "Qty/ML",
    bar: "Bar",
    bodega: "Bodega",
    bodegaBottles: "Bodega Bottles",
    bodegaMl: "Bodega ML",
    inventory: "Inventario",
    total: "Total",
    saveItemRow: "Save Item",
    saveCountRow: "Save Count",
    countDate: "Count Date",
    quickLinks: "Quick Links",
    bottleScan: "AI Bottle Scan",
    bottleScanHint:
      "Take a bottle photo now and later; AI estimates fill level and spent ml automatically.",
    uploadPhoto: "Upload Photo",
    analyzePhoto: "Analyze Photo",
    analyzingPhoto: "Analyzing...",
    fillPercent: "Fill %",
    estimatedMl: "Estimated ML",
    spentMl: "Spent ML",
    scanHistory: "Bottle Scan History",
    confidence: "Confidence",
    model: "Model",
    compareWithPrevious: "Compared to previous scan",
    workspace: "Workspace",
    workspaceInventory: "Inventory Sheet",
    workspaceCatalog: "Catalog",
    workspaceOperations: "Movements & Counts",
    workspaceScans: "AI Bottle Scan",
    workspaceInvoices: "Invoice OCR",
    workspaceAnalytics: "Analytics",
    workspaceActivity: "Activity Feed",
    invoiceOcr: "Invoice OCR + Cost Shock",
    invoiceOcrHint:
      "Upload supplier invoice photos, extract rows with AI, and apply catalog/movement updates in one pass.",
    analyzeInvoice: "Analyze Invoice",
    applyInvoice: "Apply to Catalog",
    includePurchases: "Create purchase movements",
    invoiceDate: "Invoice Date",
    invoiceNumber: "Invoice #",
    supplierNameLabel: "Supplier",
    invoiceRows: "Extracted Invoice Rows",
    noInvoiceRows: "No rows extracted yet.",
    varianceIntelligence: "Variance Intelligence",
    topVarianceItems: "Top Variance Items",
    topRiskItems: "Top Risk Items",
    supplierVariance: "Supplier Variance",
    costShockMonitor: "Cost Shock Monitor",
    match: "Match",
    suggestedAction: "Action",
    severity: "Severity",
    shock: "Shock",
    baselineCost: "Baseline Cost",
    newCost: "New Cost",
    deltaCost: "Delta Cost",
    deltaPct: "Delta %",
    noItems: "No liquor items yet. Add one in Catalog.",
    noMovements: "No movements yet.",
    noCounts: "No counts yet.",
    noScanHistory: "No bottle scans yet.",
    noAnalytics: "No report data for selected period.",
    processing: "Processing...",
  },
  es: {
    title: "Control Mensual de Licor",
    subtitle:
      "El inventario detallado por artículo alimenta el control mensual por ubicación.",
    month: "Mes",
    year: "Año",
    office: "Ubicación",
    allLocations: "Todas las ubicaciones",
    targetCostPct: "% Costo Objetivo",
    refresh: "Actualizar",
    loading: "Cargando control de licor...",
    saveItem: "Agregar Artículo",
    postMovement: "Registrar Movimiento",
    saveCount: "Guardar Conteo",
    upcLookup: "Búsqueda UPC",
    lookup: "Buscar",
    monthlySummary: "Resumen de Control Mensual",
    yearlySummary: "Hoja de Control Anual",
    itemVariance: "Variación por Artículo",
    recentMovements: "Movimientos Recientes",
    recentCounts: "Conteos Recientes",
    catalog: "Catálogo de Licor",
    openingInventory: "Inventario Inicial",
    closingInventory: "Inventario Final",
    inventoryDelta: "Diferencia Inventario",
    liquorSales: "Ventas de Licor",
    expectedUsage: "Costo de Consumo Esperado",
    actualUsage: "Costo de Consumo Real",
    usageVariance: "Variación de Consumo",
    expectedPct: "% Costo Esperado",
    actualPct: "% Costo Real",
    item: "Artículo",
    supplier: "Proveedor",
    openingMl: "Inicial",
    receivedMl: "Entradas",
    issuedMl: "Salidas",
    closingMl: "Final",
    usageMl: "Consumo",
    usageCost: "Costo Consumo",
    varianceMl: "Diferencia",
    missingCount: "Sin Conteo Final",
    monthCol: "Mes",
    items: "Artículos",
    missing: "Faltantes",
    officeRequired: "Selecciona ubicación o usa el alcance activo de ubicación.",
    featureDisabled:
      "El inventario de licor está deshabilitado para este tenant. Pide al owner activarlo en las funciones del tenant.",
    premiumFeatureDisabled:
      "Las funciones premium de licor están deshabilitadas para este tenant. Pide al owner activarlas en Funciones del Tenant.",
    spreadsheetEditor: "Editor de Hoja",
    company: "Compañía",
    liquorName: "Nombres de Licor",
    liquorKind: "Tipo",
    kindList: "Lista de Tipos",
    addKind: "Agregar Tipo",
    deleteKind: "Eliminar Tipo",
    kindPlaceholder: "Selecciona o escribe tipo",
    newKindPlaceholder: "Agregar tipo nuevo",
    kindDeletePlaceholder: "Selecciona tipo para ocultar",
    noKindsConfigured: "Aún no hay tipos configurados.",
    showMoreKinds: "Mostrar más tipos",
    showLessKinds: "Mostrar menos tipos",
    price: "Precio",
    qtyMl: "Cant/ML",
    bar: "Bar",
    bodega: "Bodega",
    bodegaBottles: "Botellas Bodega",
    bodegaMl: "ML Bodega",
    inventory: "Inventario",
    total: "Total",
    saveItemRow: "Guardar Artículo",
    saveCountRow: "Guardar Conteo",
    countDate: "Fecha Conteo",
    quickLinks: "Accesos Rápidos",
    bottleScan: "Escaneo AI de Botella",
    bottleScanHint:
      "Toma una foto ahora y otra después; la IA estima nivel y ml consumidos automáticamente.",
    uploadPhoto: "Subir Foto",
    analyzePhoto: "Analizar Foto",
    analyzingPhoto: "Analizando...",
    fillPercent: "Nivel %",
    estimatedMl: "ML Estimado",
    spentMl: "ML Consumido",
    scanHistory: "Historial de Escaneos",
    confidence: "Confianza",
    model: "Modelo",
    compareWithPrevious: "Comparado contra escaneo anterior",
    workspace: "Área",
    workspaceInventory: "Hoja Inventario",
    workspaceCatalog: "Catálogo",
    workspaceOperations: "Movimientos y Conteos",
    workspaceScans: "Escaneo AI",
    workspaceInvoices: "OCR Facturas",
    workspaceAnalytics: "Analítica",
    workspaceActivity: "Actividad",
    invoiceOcr: "OCR de Facturas + Alerta de Costos",
    invoiceOcrHint:
      "Sube fotos de facturas de proveedor, extrae filas con IA y aplica actualizaciones de catálogo/movimientos.",
    analyzeInvoice: "Analizar Factura",
    applyInvoice: "Aplicar al Catálogo",
    includePurchases: "Crear movimientos de compra",
    invoiceDate: "Fecha Factura",
    invoiceNumber: "Factura #",
    supplierNameLabel: "Proveedor",
    invoiceRows: "Filas Extraídas",
    noInvoiceRows: "Aún no hay filas extraídas.",
    varianceIntelligence: "Inteligencia de Variaciones",
    topVarianceItems: "Mayores Variaciones",
    topRiskItems: "Mayor Riesgo",
    supplierVariance: "Variación por Proveedor",
    costShockMonitor: "Monitor de Choques de Costo",
    match: "Coincidencia",
    suggestedAction: "Acción",
    severity: "Severidad",
    shock: "Choque",
    baselineCost: "Costo Base",
    newCost: "Costo Nuevo",
    deltaCost: "Diferencia Costo",
    deltaPct: "Diferencia %",
    noItems: "Aún no hay artículos de licor. Agrega uno en Catálogo.",
    noMovements: "Aún no hay movimientos.",
    noCounts: "Aún no hay conteos.",
    noScanHistory: "Aún no hay escaneos de botella.",
    noAnalytics: "No hay datos del reporte para el período seleccionado.",
    processing: "Procesando...",
  },
} as const;

type WorkspaceKey =
  | "inventory"
  | "catalog"
  | "operations"
  | "scans"
  | "invoices"
  | "analytics"
  | "activity";

const movementTypes = [
  "PURCHASE",
  "SALE",
  "WASTE",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
  "TRANSFER_IN",
  "TRANSFER_OUT",
] as const;

const currentMonthKey = () => new Date().toISOString().slice(0, 7);
const currentYearKey = () => new Date().getUTCFullYear().toString();
const todayDateKey = () => new Date().toISOString().slice(0, 10);
const nowDateTimeLocal = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate(),
  )}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

const readErrorMessage = async (response: Response, fallback: string) => {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
  };
  return payload.error || payload.message || fallback;
};

const formatMoney = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
};

const formatQty = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return value.toLocaleString("en-US", { maximumFractionDigits: 3 });
};

const formatPercent = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return `${value.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })}%`;
};

export default function LiquorControlPage() {
  const lang = useUiLanguage();
  const t = useMemo(() => copy[lang] ?? copy.en, [lang]);

  const [month, setMonth] = useState(currentMonthKey);
  const [year, setYear] = useState(currentYearKey);
  const [officeId, setOfficeId] = useState("");
  const [locationScopeHydrated, setLocationScopeHydrated] = useState(false);
  const [targetCostPct, setTargetCostPct] = useState("0.30");
  const [liquorPremiumEnabled, setLiquorPremiumEnabled] = useState(false);

  const [offices, setOffices] = useState<Office[]>([]);
  const [items, setItems] = useState<LiquorCatalogItem[]>([]);
  const [liquorKinds, setLiquorKinds] = useState<string[]>([]);
  const [movements, setMovements] = useState<LiquorMovement[]>([]);
  const [counts, setCounts] = useState<LiquorCount[]>([]);
  const [bottleScans, setBottleScans] = useState<BottleScan[]>([]);
  const [monthly, setMonthly] = useState<MonthlyReport | null>(null);
  const [yearly, setYearly] = useState<YearlyControl | null>(null);

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "danger" | "info">(
    "info",
  );
  const [workspace, setWorkspace] = useState<WorkspaceKey>("inventory");
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const [lookupUpc, setLookupUpc] = useState("");
  const [lookupResult, setLookupResult] = useState<UpcLookupResponse | null>(
    null,
  );
  const [lookingUp, setLookingUp] = useState(false);

  const [itemForm, setItemForm] = useState({
    name: "",
    brand: "",
    upc: "",
    sizeMl: "",
    unitLabel: "ml",
    supplierName: "",
    unitCost: "",
  });
  const [kindForm, setKindForm] = useState({
    newKind: "",
    deleteKind: "",
  });

  const [movementForm, setMovementForm] = useState({
    itemId: "",
    officeId: "",
    type: "PURCHASE",
    quantity: "",
    occurredAt: nowDateTimeLocal(),
    notes: "",
  });

  const [countForm, setCountForm] = useState({
    itemId: "",
    officeId: "",
    countDate: todayDateKey(),
    quantity: "",
    barQuantity: "",
    bodegaBottleCount: "",
    notes: "",
  });
  const [sheetDrafts, setSheetDrafts] = useState<Record<string, SpreadsheetDraft>>(
    {},
  );
  const [scanForm, setScanForm] = useState({
    itemId: "",
    officeId: "",
    measuredAt: nowDateTimeLocal(),
    containerKey: "",
    imageDataUrl: "",
    imageName: "",
  });
  const [scanResult, setScanResult] = useState<BottleScanAnalyzeResponse | null>(
    null,
  );
  const [analyzingScan, setAnalyzingScan] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    officeId: "",
    invoiceDate: todayDateKey(),
    invoiceNumber: "",
    supplierName: "",
    notes: "",
    imageDataUrl: "",
    imageName: "",
    createPurchaseMovements: true,
  });
  const [invoiceResult, setInvoiceResult] = useState<InvoiceAnalyzeResponse | null>(
    null,
  );
  const [analyzingInvoice, setAnalyzingInvoice] = useState(false);
  const hasLiquorPremiumAccess = liquorPremiumEnabled;

  const parsedTargetCostPct = useMemo(() => {
    const value = Number(targetCostPct);
    return Number.isFinite(value) ? value : null;
  }, [targetCostPct]);
  const workspaceOptions = useMemo<Array<{ key: WorkspaceKey; label: string }>>(
    () => [
      { key: "inventory", label: t.workspaceInventory },
      { key: "catalog", label: t.workspaceCatalog },
      { key: "operations", label: t.workspaceOperations },
      ...(hasLiquorPremiumAccess
        ? ([
            { key: "scans", label: t.workspaceScans },
            { key: "invoices", label: t.workspaceInvoices },
          ] as Array<{ key: WorkspaceKey; label: string }>)
        : []),
      { key: "analytics", label: t.workspaceAnalytics },
      { key: "activity", label: t.workspaceActivity },
    ],
    [
      hasLiquorPremiumAccess,
      t.workspaceActivity,
      t.workspaceAnalytics,
      t.workspaceCatalog,
      t.workspaceInventory,
      t.workspaceInvoices,
      t.workspaceOperations,
      t.workspaceScans,
    ],
  );
  const isAnyActionBusy = activeAction !== null;
  const selectedCountItem = useMemo(
    () => items.find((item) => item.id === countForm.itemId.trim()) || null,
    [countForm.itemId, items],
  );
  const countBodegaBottleInput = countForm.bodegaBottleCount.trim()
    ? Number(countForm.bodegaBottleCount)
    : 0;
  const countBodegaQuantityMl =
    selectedCountItem?.sizeMl && selectedCountItem.sizeMl > 0
      ? Number((countBodegaBottleInput * selectedCountItem.sizeMl).toFixed(3))
      : 0;
  const countInventoryQuantity =
    (Number(countForm.barQuantity) || 0) + countBodegaQuantityMl;

  const latestCountByItem = useMemo(() => {
    const map = new Map<string, LiquorCount>();
    counts.forEach((count) => {
      if (!map.has(count.itemId)) {
        map.set(count.itemId, count);
      }
    });
    return map;
  }, [counts]);

  const spreadsheetRows = useMemo(
    () =>
      [...items]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((item) => {
          const latestCount = latestCountByItem.get(item.id);
          const hasSplitCount = Boolean(
            latestCount &&
              (latestCount.barQuantity !== null ||
                latestCount.bodegaQuantity !== null),
          );
          const itemSizeMl = latestCount?.itemSizeMl ?? item.sizeMl;
          const barQuantity = hasSplitCount
            ? latestCount?.barQuantity ?? 0
            : latestCount?.quantity ?? 0;
          const bodegaQuantityMl = hasSplitCount
            ? latestCount?.bodegaQuantity ?? 0
            : 0;
          const bodegaBottleCount =
            latestCount?.bodegaBottleCount ??
            (itemSizeMl && itemSizeMl > 0
              ? Number((bodegaQuantityMl / itemSizeMl).toFixed(3))
              : 0);
          const inventory = hasSplitCount
            ? barQuantity + bodegaQuantityMl
            : latestCount?.quantity ?? 0;
          const total =
            item.sizeMl && item.sizeMl > 0
              ? (item.unitCost * inventory) / item.sizeMl
              : null;
          return {
            item,
            latestCount,
            barQuantity,
            bodegaQuantityMl,
            bodegaBottleCount,
            inventory,
            total,
          };
        }),
    [items, latestCountByItem],
  );

  useEffect(() => {
    const persistedScope = readPersistedLocationScope();
    setOfficeId(persistedScope.officeId);
    setLocationScopeHydrated(true);
  }, []);

  useEffect(() => {
    if (!locationScopeHydrated) {
      return;
    }
    if (!officeId) {
      return;
    }
    if (offices.length === 0) {
      return;
    }
    if (offices.some((office) => office.id === officeId)) {
      return;
    }
    setOfficeId("");
  }, [locationScopeHydrated, officeId, offices]);

  useEffect(() => {
    setSheetDrafts((previous) => {
      const next: Record<string, SpreadsheetDraft> = {};
      spreadsheetRows.forEach((row) => {
        const existing = previous[row.item.id];
        next[row.item.id] = {
          name: existing?.name ?? row.item.name ?? "",
          brand: existing?.brand ?? row.item.brand ?? "",
          upc: existing?.upc ?? row.item.upc ?? "",
          supplierName: existing?.supplierName ?? row.item.supplierName ?? "",
          unitCost: existing?.unitCost ?? String(row.item.unitCost ?? ""),
          sizeMl:
            existing?.sizeMl ??
            (row.item.sizeMl === null ? "" : String(row.item.sizeMl)),
          barQuantity: existing?.barQuantity ?? String(row.barQuantity || ""),
          bodegaBottleCount:
            existing?.bodegaBottleCount ?? String(row.bodegaBottleCount || ""),
        };
      });
      return next;
    });
  }, [spreadsheetRows]);

  useEffect(() => {
    if (
      !hasLiquorPremiumAccess &&
      (workspace === "scans" || workspace === "invoices")
    ) {
      setWorkspace("inventory");
    }
  }, [hasLiquorPremiumAccess, workspace]);

  const loadAll = useCallback(async (options?: { silent?: boolean }) => {
    if (!locationScopeHydrated) {
      return;
    }
    if (parsedTargetCostPct === null) {
      setStatusKind("danger");
      setStatus("Target cost percent must be a number between 0 and 1.");
      return;
    }

    setLoading(true);
    if (!options?.silent) {
      setStatus(null);
    }
    try {
      let hasLiquorAccess = true;
      let hasPremiumAccess = false;
      const accessResponse = await fetchLiquorAccessRequest();
      if (accessResponse.ok) {
        const accessPayload = (await accessResponse.json()) as {
          liquorInventoryEnabled?: boolean;
          premiumFeaturesEnabled?: boolean;
          permissions?: { reports?: boolean };
        };
        hasLiquorAccess =
          Boolean(accessPayload.permissions?.reports) &&
          Boolean(accessPayload.liquorInventoryEnabled);
        hasPremiumAccess =
          hasLiquorAccess && Boolean(accessPayload.premiumFeaturesEnabled);
        setLiquorPremiumEnabled(hasPremiumAccess);

        if (!hasLiquorAccess) {
          setLiquorKinds([]);
          setItems([]);
          setMovements([]);
          setCounts([]);
          setBottleScans([]);
          setMonthly(null);
          setYearly(null);
          setStatusKind("info");
          setStatus(t.featureDisabled);
          return;
        }
      } else {
        setLiquorPremiumEnabled(false);
      }

      const queryMonthly = new URLSearchParams();
      queryMonthly.set("month", month);
      queryMonthly.set("targetCostPct", String(parsedTargetCostPct));
      if (officeId) {
        queryMonthly.set("officeId", officeId);
      }

      const queryYearly = new URLSearchParams();
      queryYearly.set("year", year);
      queryYearly.set("targetCostPct", String(parsedTargetCostPct));
      if (officeId) {
        queryYearly.set("officeId", officeId);
      }

      const queryFeed = new URLSearchParams();
      queryFeed.set("limit", "400");
      if (officeId) {
        queryFeed.set("officeId", officeId);
      }

      const bottleScansRequest = hasPremiumAccess
        ? listLiquorBottleScansRequest(queryFeed)
        : Promise.resolve(null);

      const [
        kindsResponse,
        catalogResponse,
        movementResponse,
        countResponse,
        bottleScansResponse,
        monthlyResponse,
        yearlyResponse,
        officesResponse,
      ] = await Promise.all([
        listLiquorKindsRequest(),
        listLiquorCatalogRequest("includeInactive=1"),
        listLiquorMovementsRequest(queryFeed),
        listLiquorCountsRequest(queryFeed),
        bottleScansRequest,
        fetchLiquorMonthlyReportRequest(queryMonthly),
        fetchLiquorYearlyControlRequest(queryYearly),
        fetchOfficesRequest(),
      ]);

      if (!catalogResponse.ok) {
        throw new Error(
          await readErrorMessage(catalogResponse, "Unable to load catalog."),
        );
      }
      if (!kindsResponse.ok) {
        throw new Error(
          await readErrorMessage(kindsResponse, "Unable to load liquor kinds."),
        );
      }
      if (!movementResponse.ok) {
        throw new Error(
          await readErrorMessage(
            movementResponse,
            "Unable to load movement feed.",
          ),
        );
      }
      if (!countResponse.ok) {
        throw new Error(
          await readErrorMessage(countResponse, "Unable to load count feed."),
        );
      }
      if (bottleScansResponse && !bottleScansResponse.ok) {
        throw new Error(
          await readErrorMessage(
            bottleScansResponse,
            "Unable to load bottle scan feed.",
          ),
        );
      }
      if (!monthlyResponse.ok) {
        throw new Error(
          await readErrorMessage(
            monthlyResponse,
            "Unable to load monthly control summary.",
          ),
        );
      }
      if (!yearlyResponse.ok) {
        throw new Error(
          await readErrorMessage(
            yearlyResponse,
            "Unable to load yearly control sheet.",
          ),
        );
      }

      const kindsPayload = (await kindsResponse.json()) as {
        kinds?: string[];
      };
      const catalogPayload = (await catalogResponse.json()) as {
        items?: LiquorCatalogItem[];
      };
      const movementPayload = (await movementResponse.json()) as {
        movements?: LiquorMovement[];
      };
      const countPayload = (await countResponse.json()) as {
        counts?: LiquorCount[];
      };
      const bottleScansPayload = bottleScansResponse
        ? ((await bottleScansResponse.json()) as {
            scans?: BottleScan[];
          })
        : { scans: [] as BottleScan[] };
      const monthlyPayload = (await monthlyResponse.json()) as MonthlyReport;
      const yearlyPayload = (await yearlyResponse.json()) as YearlyControl;

      const kinds = Array.isArray(kindsPayload.kinds)
        ? kindsPayload.kinds
            .filter((entry): entry is string => typeof entry === "string")
            .map((entry) => entry.trim())
            .filter(Boolean)
        : [];
      setLiquorKinds(kinds);
      setItems(Array.isArray(catalogPayload.items) ? catalogPayload.items : []);
      setMovements(
        Array.isArray(movementPayload.movements) ? movementPayload.movements : [],
      );
      setCounts(Array.isArray(countPayload.counts) ? countPayload.counts : []);
      setBottleScans(
        Array.isArray(bottleScansPayload.scans) ? bottleScansPayload.scans : [],
      );
      setMonthly(monthlyPayload);
      setYearly(yearlyPayload);

      if (officesResponse.ok) {
        const officesPayload = (await officesResponse.json()) as {
          offices?: Office[];
        };
        const nextOffices = Array.isArray(officesPayload.offices)
          ? officesPayload.offices
          : [];
        setOffices(nextOffices);
      } else {
        setOffices([]);
      }

      if (!options?.silent) {
        setStatusKind("success");
        setStatus("Liquor control data loaded.");
      }
    } catch (error) {
      setStatusKind("danger");
      setStatus(
        error instanceof Error ? error.message : "Unable to load liquor control.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    locationScopeHydrated,
    month,
    officeId,
    parsedTargetCostPct,
    t.featureDisabled,
    year,
  ]);

  useEffect(() => {
    if (!locationScopeHydrated) {
      return;
    }
    void loadAll();
  }, [loadAll, locationScopeHydrated]);

  useEffect(() => {
    const monthYear = month.slice(0, 4);
    if (monthYear && monthYear !== year) {
      setYear(monthYear);
    }
  }, [month, year]);

  const createCatalogItem = async () => {
    const name = itemForm.name.trim();
    if (!name) {
      setStatusKind("danger");
      setStatus("Item name is required.");
      return;
    }

    const sizeMl = itemForm.sizeMl.trim() ? Number(itemForm.sizeMl) : undefined;
    const unitCost = itemForm.unitCost.trim()
      ? Number(itemForm.unitCost)
      : undefined;
    if (
      (sizeMl !== undefined && (!Number.isFinite(sizeMl) || sizeMl <= 0)) ||
      (unitCost !== undefined && (!Number.isFinite(unitCost) || unitCost < 0))
    ) {
      setStatusKind("danger");
      setStatus("Size and cost must be valid non-negative numbers.");
      return;
    }

    const response = await createLiquorCatalogItemRequest({
      name,
      brand: itemForm.brand.trim() || undefined,
      upc: itemForm.upc.trim() || undefined,
      sizeMl,
      unitLabel: itemForm.unitLabel.trim() || undefined,
      supplierName: itemForm.supplierName.trim() || undefined,
      unitCost,
    });
    if (!response.ok) {
      throw new Error(
        await readErrorMessage(response, "Unable to create catalog item."),
      );
    }

    setItemForm({
      name: "",
      brand: "",
      upc: "",
      sizeMl: "",
      unitLabel: "ml",
      supplierName: "",
      unitCost: "",
    });
  };

  const createLiquorKind = async () => {
    const name = kindForm.newKind.trim();
    if (!name) {
      setStatusKind("danger");
      setStatus("Kind name is required.");
      return;
    }

    const response = await createLiquorKindRequest({ name });
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, "Unable to save kind."));
    }

    setKindForm((previous) => ({ ...previous, newKind: "" }));
  };

  const deleteLiquorKind = async () => {
    const name = kindForm.deleteKind.trim();
    if (!name) {
      setStatusKind("danger");
      setStatus("Select a kind to delete.");
      return;
    }

    const response = await deleteLiquorKindRequest(name);
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, "Unable to delete kind."));
    }

    setKindForm((previous) => ({ ...previous, deleteKind: "" }));
  };

  const createMovement = async () => {
    const itemId = movementForm.itemId.trim();
    const selectedOfficeId = movementForm.officeId.trim() || officeId;
    if (!itemId) {
      setStatusKind("danger");
      setStatus("Select an item for the movement.");
      return;
    }
    if (!selectedOfficeId) {
      setStatusKind("danger");
      setStatus(t.officeRequired);
      return;
    }
    const quantity = Number(movementForm.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setStatusKind("danger");
      setStatus("Movement quantity must be greater than zero.");
      return;
    }
    const occurredAt = movementForm.occurredAt
      ? new Date(movementForm.occurredAt)
      : new Date();
    if (Number.isNaN(occurredAt.getTime())) {
      setStatusKind("danger");
      setStatus("Movement date/time is invalid.");
      return;
    }

    const response = await createLiquorMovementRequest({
      itemId,
      officeId: selectedOfficeId,
      type: movementForm.type,
      quantity,
      occurredAt: occurredAt.toISOString(),
      notes: movementForm.notes.trim() || undefined,
    });
    if (!response.ok) {
      throw new Error(
        await readErrorMessage(response, "Unable to save movement."),
      );
    }

    setMovementForm((previous) => ({
      ...previous,
      quantity: "",
      notes: "",
      occurredAt: nowDateTimeLocal(),
    }));
  };

  const saveCount = async () => {
    const itemId = countForm.itemId.trim();
    const selectedOfficeId = countForm.officeId.trim() || officeId;
    if (!itemId) {
      setStatusKind("danger");
      setStatus("Select an item for the count.");
      return;
    }
    if (!selectedOfficeId) {
      setStatusKind("danger");
      setStatus(t.officeRequired);
      return;
    }
    const parsedQuantity = countForm.quantity.trim()
      ? Number(countForm.quantity)
      : null;
    const parsedBarQuantity = countForm.barQuantity.trim()
      ? Number(countForm.barQuantity)
      : null;
    const parsedBodegaBottleCount = countForm.bodegaBottleCount.trim()
      ? Number(countForm.bodegaBottleCount)
      : null;
    const hasSplitCount =
      parsedBarQuantity !== null || parsedBodegaBottleCount !== null;
    const selectedItem = items.find((candidate) => candidate.id === itemId) || null;
    const sizeMl = selectedItem?.sizeMl ?? null;
    const resolvedBodegaQuantity =
      parsedBodegaBottleCount === null
        ? null
        : sizeMl && sizeMl > 0
          ? Number((parsedBodegaBottleCount * sizeMl).toFixed(3))
          : null;
    const quantity = hasSplitCount
      ? (parsedBarQuantity || 0) + (resolvedBodegaQuantity || 0)
      : parsedQuantity;

    if (quantity === null || !Number.isFinite(quantity) || quantity < 0) {
      setStatusKind("danger");
      setStatus("Count quantity must be zero or greater.");
      return;
    }
    if (
      parsedBarQuantity !== null &&
      (!Number.isFinite(parsedBarQuantity) || parsedBarQuantity < 0)
    ) {
      setStatusKind("danger");
      setStatus("Bar quantity must be zero or greater.");
      return;
    }
    if (
      parsedBodegaBottleCount !== null &&
      (!Number.isFinite(parsedBodegaBottleCount) || parsedBodegaBottleCount < 0)
    ) {
      setStatusKind("danger");
      setStatus("Bodega bottle count must be zero or greater.");
      return;
    }
    if (
      parsedBodegaBottleCount !== null &&
      parsedBodegaBottleCount > 0 &&
      (!sizeMl || sizeMl <= 0)
    ) {
      setStatusKind("danger");
      setStatus("Item Qty/ML is required before entering bodega bottles.");
      return;
    }

    const response = await createLiquorCountRequest({
      itemId,
      officeId: selectedOfficeId,
      countDate: countForm.countDate,
      quantity,
      barQuantity: parsedBarQuantity ?? undefined,
      bodegaBottleCount: parsedBodegaBottleCount ?? undefined,
      notes: countForm.notes.trim() || undefined,
    });
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, "Unable to save count."));
    }

    setCountForm((previous) => ({
      ...previous,
      quantity: "",
      barQuantity: "",
      bodegaBottleCount: "",
      notes: "",
    }));
  };

  const updateSheetDraft = (
    itemId: string,
    field: keyof SpreadsheetDraft,
    value: string,
  ) => {
    setSheetDrafts((previous) => ({
      ...previous,
      [itemId]: {
        name: previous[itemId]?.name ?? "",
        brand: previous[itemId]?.brand ?? "",
        upc: previous[itemId]?.upc ?? "",
        supplierName: previous[itemId]?.supplierName ?? "",
        unitCost: previous[itemId]?.unitCost ?? "",
        sizeMl: previous[itemId]?.sizeMl ?? "",
        barQuantity: previous[itemId]?.barQuantity ?? "",
        bodegaBottleCount: previous[itemId]?.bodegaBottleCount ?? "",
        [field]: value,
      },
    }));
  };

  const saveSpreadsheetItem = async (itemId: string) => {
    const draft = sheetDrafts[itemId];
    if (!draft) {
      return;
    }

    const name = (draft.name || "").trim();
    if (!name) {
      throw new Error("Liquor name is required.");
    }
    const unitCost = Number(draft.unitCost);
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      throw new Error("Price must be zero or greater.");
    }
    const sizeMlRaw = draft.sizeMl.trim();
    const parsedSizeMl = sizeMlRaw ? Number(sizeMlRaw) : null;
    if (
      sizeMlRaw &&
      (parsedSizeMl === null ||
        !Number.isFinite(parsedSizeMl) ||
        parsedSizeMl <= 0)
    ) {
      throw new Error("Qty/ML must be greater than zero.");
    }

    const response = await updateLiquorCatalogItemRequest(itemId, {
      name,
      brand: draft.brand.trim() || undefined,
      upc: draft.upc.trim() || undefined,
      supplierName: draft.supplierName.trim() || undefined,
      unitCost,
      sizeMl: parsedSizeMl ?? undefined,
    });

    if (!response.ok) {
      throw new Error(
        await readErrorMessage(response, "Unable to save catalog fields."),
      );
    }
  };

  const saveSpreadsheetCount = async (itemId: string) => {
    const draft = sheetDrafts[itemId];
    if (!draft) {
      return;
    }

    const selectedOfficeId = officeId || countForm.officeId.trim();
    if (!selectedOfficeId) {
      throw new Error(t.officeRequired);
    }

    const barQuantity = draft.barQuantity.trim() ? Number(draft.barQuantity) : 0;
    const bodegaBottleCount = draft.bodegaBottleCount.trim()
      ? Number(draft.bodegaBottleCount)
      : 0;
    if (!Number.isFinite(barQuantity) || barQuantity < 0) {
      throw new Error("Bar quantity must be zero or greater.");
    }
    if (!Number.isFinite(bodegaBottleCount) || bodegaBottleCount < 0) {
      throw new Error("Bodega bottle count must be zero or greater.");
    }
    const item = items.find((candidate) => candidate.id === itemId);
    const sizeMl = item?.sizeMl ?? null;
    if (bodegaBottleCount > 0 && (!sizeMl || sizeMl <= 0)) {
      throw new Error("Qty/ML is required before entering bodega bottles.");
    }
    const bodegaQuantity =
      bodegaBottleCount > 0 && sizeMl
        ? Number((bodegaBottleCount * sizeMl).toFixed(3))
        : 0;

    const response = await createLiquorCountRequest({
      itemId,
      officeId: selectedOfficeId,
      countDate: countForm.countDate,
      quantity: barQuantity + bodegaQuantity,
      barQuantity,
      bodegaBottleCount,
    });
    if (!response.ok) {
      throw new Error(
        await readErrorMessage(response, "Unable to save inventory row."),
      );
    }
  };

  const runWithReload = async (
    actionKey: string,
    runner: () => Promise<void>,
    success: string,
  ) => {
    if (activeAction) {
      return;
    }
    setActiveAction(actionKey);
    setStatusKind("info");
    setStatus(t.processing);
    try {
      await runner();
      await loadAll({ silent: true });
      setStatusKind("success");
      setStatus(success);
    } catch (error) {
      setStatusKind("danger");
      setStatus(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setActiveAction(null);
    }
  };

  const lookupByUpc = async () => {
    const upc = lookupUpc.replace(/\D/g, "");
    if (!upc) {
      setStatusKind("danger");
      setStatus("UPC is required.");
      return;
    }

    setLookingUp(true);
    try {
      const response = await lookupLiquorCatalogByUpcRequest(upc);
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Unable to lookup UPC right now."),
        );
      }
      const payload = (await response.json()) as UpcLookupResponse;
      setLookupResult(payload);
      setStatusKind("info");
      setStatus("UPC lookup completed.");
    } catch (error) {
      setStatusKind("danger");
      setStatus(
        error instanceof Error ? error.message : "Unable to lookup UPC.",
      );
    } finally {
      setLookingUp(false);
    }
  };

  const readFileAsDataUrl = async (file: File) =>
    await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const value = typeof reader.result === "string" ? reader.result : "";
        if (!value) {
          reject(new Error("Unable to read image file."));
          return;
        }
        resolve(value);
      };
      reader.onerror = () => reject(new Error("Unable to read image file."));
      reader.readAsDataURL(file);
    });

  const onScanPhotoSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setScanForm((prev) => ({
        ...prev,
        imageDataUrl: dataUrl,
        imageName: file.name,
      }));
    } catch (error) {
      setStatusKind("danger");
      setStatus(
        error instanceof Error ? error.message : "Unable to read selected photo.",
      );
    } finally {
      event.target.value = "";
    }
  };

  const analyzeBottlePhoto = async () => {
    if (!hasLiquorPremiumAccess) {
      throw new Error(t.premiumFeatureDisabled);
    }
    const itemId = scanForm.itemId.trim();
    const selectedOfficeId = scanForm.officeId.trim() || officeId;
    if (!itemId) {
      throw new Error("Select an item for bottle scan.");
    }
    if (!selectedOfficeId) {
      throw new Error(t.officeRequired);
    }
    if (!scanForm.imageDataUrl) {
      throw new Error("Select a bottle photo first.");
    }

    const measuredAt = scanForm.measuredAt
      ? new Date(scanForm.measuredAt)
      : new Date();
    if (Number.isNaN(measuredAt.getTime())) {
      throw new Error("Bottle scan date/time is invalid.");
    }

    setAnalyzingScan(true);
    try {
      const response = await analyzeLiquorBottleScanRequest({
        itemId,
        officeId: selectedOfficeId,
        measuredAt: measuredAt.toISOString(),
        containerKey: scanForm.containerKey.trim() || undefined,
        imageDataUrl: scanForm.imageDataUrl,
      });
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Unable to analyze bottle photo right now.",
          ),
        );
      }
      const payload = (await response.json()) as BottleScanAnalyzeResponse;
      setScanResult(payload);
      setScanForm((prev) => ({
        ...prev,
        imageDataUrl: "",
        imageName: "",
      }));
    } finally {
      setAnalyzingScan(false);
    }
  };

  const onInvoicePhotoSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setInvoiceForm((prev) => ({
        ...prev,
        imageDataUrl: dataUrl,
        imageName: file.name,
      }));
    } catch (error) {
      setStatusKind("danger");
      setStatus(
        error instanceof Error ? error.message : "Unable to read selected photo.",
      );
    } finally {
      event.target.value = "";
    }
  };

  const analyzeInvoicePhoto = async () => {
    if (!hasLiquorPremiumAccess) {
      throw new Error(t.premiumFeatureDisabled);
    }
    const selectedOfficeId = invoiceForm.officeId.trim() || officeId;
    if (!selectedOfficeId) {
      throw new Error(t.officeRequired);
    }
    if (!invoiceForm.imageDataUrl) {
      throw new Error("Select an invoice photo first.");
    }

    setAnalyzingInvoice(true);
    try {
      const response = await analyzeLiquorInvoiceRequest({
        officeId: selectedOfficeId,
        invoiceDate: invoiceForm.invoiceDate || undefined,
        invoiceNumber: invoiceForm.invoiceNumber.trim() || undefined,
        supplierName: invoiceForm.supplierName.trim() || undefined,
        notes: invoiceForm.notes.trim() || undefined,
        imageDataUrl: invoiceForm.imageDataUrl,
      });
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Unable to analyze invoice photo."),
        );
      }
      const payload = (await response.json()) as InvoiceAnalyzeResponse;
      setInvoiceResult(payload);
      setInvoiceForm((prev) => ({
        ...prev,
        imageDataUrl: "",
        imageName: "",
        supplierName: payload.invoice.supplierName || prev.supplierName,
        invoiceNumber: payload.invoice.invoiceNumber || prev.invoiceNumber,
        invoiceDate: payload.invoice.invoiceDate || prev.invoiceDate,
        notes: payload.invoice.notes || prev.notes,
      }));
    } finally {
      setAnalyzingInvoice(false);
    }
  };

  const applyInvoiceAnalysis = async () => {
    if (!hasLiquorPremiumAccess) {
      throw new Error(t.premiumFeatureDisabled);
    }
    if (!invoiceResult || invoiceResult.rows.length === 0) {
      throw new Error("Analyze an invoice with at least one row before applying.");
    }
    const selectedOfficeId = invoiceForm.officeId.trim() || officeId;
    if (!selectedOfficeId) {
      throw new Error(t.officeRequired);
    }

    const response = await applyLiquorInvoiceRequest({
      officeId: selectedOfficeId,
      invoiceDate: invoiceForm.invoiceDate || undefined,
      invoiceNumber: invoiceForm.invoiceNumber.trim() || undefined,
      supplierName: invoiceForm.supplierName.trim() || undefined,
      notes: invoiceForm.notes.trim() || undefined,
      createPurchaseMovements: invoiceForm.createPurchaseMovements,
      rows: invoiceResult.rows.map((row) => ({
        existingItemId: row.matchedItem?.id || undefined,
        apply: true,
        company: row.company || undefined,
        liquorName: row.liquorName,
        kind: row.kind || undefined,
        upc: row.upc || undefined,
        ml: row.ml ?? undefined,
        unitCost: row.unitCost ?? undefined,
        quantity: row.quantity ?? undefined,
      })),
    });
    if (!response.ok) {
      throw new Error(
        await readErrorMessage(response, "Unable to apply invoice rows."),
      );
    }
    await response.json().catch(() => ({} as InvoiceApplyResponse));
    setInvoiceResult(null);
  };

  const runInvoiceAnalyze = async () => {
    if (activeAction) {
      return;
    }
    setActiveAction("analyze-invoice");
    setStatusKind("info");
    setStatus(t.processing);
    try {
      await analyzeInvoicePhoto();
      setStatusKind("success");
      setStatus("Invoice analyzed.");
    } catch (error) {
      setStatusKind("danger");
      setStatus(error instanceof Error ? error.message : "Invoice analysis failed.");
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="admin-header">
        <h1>{t.title}</h1>
        <p className="text-muted mb-0">{t.subtitle}</p>
      </div>

      <section className="admin-card d-flex flex-column gap-3">
        <div className="row g-2 align-items-end">
          <div className="col-12 col-md-3">
            <label className="form-label">{t.month}</label>
            <input
              type="month"
              className="form-control"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />
          </div>
          <div className="col-12 col-md-2">
            <label className="form-label">{t.year}</label>
            <input
              type="number"
              className="form-control"
              value={year}
              onChange={(event) => setYear(event.target.value)}
              min={2000}
              max={2099}
            />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">{t.office}</label>
            <select
              className="form-select"
              value={officeId}
              onChange={(event) => setOfficeId(event.target.value)}
            >
              <option value="">{t.allLocations}</option>
              {offices.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-2">
            <label className="form-label">{t.targetCostPct}</label>
            <input
              className="form-control"
              value={targetCostPct}
              onChange={(event) => setTargetCostPct(event.target.value)}
              placeholder="0.30"
            />
          </div>
          <div className="col-12 col-md-2">
            <button
              type="button"
              className="btn btn-outline-secondary w-100"
              onClick={() => {
                void loadAll();
              }}
              disabled={loading || isAnyActionBusy}
            >
              {t.refresh}
            </button>
          </div>
        </div>
        {status ? (
          <div className={`alert alert-${statusKind} mb-0`} role="alert">
            {status}
          </div>
        ) : null}
        <div className="d-flex flex-wrap align-items-center gap-2">
          <span className="small text-muted">{t.workspace}:</span>
          {workspaceOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`btn btn-sm ${
                workspace === option.key ? "btn-primary" : "btn-outline-secondary"
              }`}
              onClick={() => setWorkspace(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <datalist id="liquor-kind-options">
          {liquorKinds.map((kind) => (
            <option key={`kind-option-${kind}`} value={kind} />
          ))}
        </datalist>
      </section>

      {loading && !monthly ? (
        <div className="admin-card text-muted">{t.loading}</div>
      ) : null}

      {workspace === "analytics" && monthly ? (
        <section className="admin-card d-flex flex-column gap-3">
          <h2 className="h5 mb-0">{t.monthlySummary}</h2>
          <div className="row g-3">
            <div className="col-12 col-md-6 col-lg-3">
              <div className="text-muted small">{t.openingInventory}</div>
              <div className="fw-semibold">
                {formatMoney(monthly.summary.openingInventoryValue)}
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <div className="text-muted small">{t.closingInventory}</div>
              <div className="fw-semibold">
                {formatMoney(monthly.summary.closingInventoryValue)}
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <div className="text-muted small">{t.inventoryDelta}</div>
              <div className="fw-semibold">
                {formatMoney(monthly.summary.inventoryValueDelta)}
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <div className="text-muted small">{t.liquorSales}</div>
              <div className="fw-semibold">
                {formatMoney(monthly.summary.liquorSales)}
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <div className="text-muted small">{t.expectedUsage}</div>
              <div className="fw-semibold">
                {formatMoney(monthly.summary.expectedUsageCost)}
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <div className="text-muted small">{t.actualUsage}</div>
              <div className="fw-semibold">
                {formatMoney(monthly.summary.actualUsageCost)}
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <div className="text-muted small">{t.usageVariance}</div>
              <div className="fw-semibold">
                {formatMoney(monthly.summary.usageCostVariance)}
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <div className="text-muted small">{t.actualPct}</div>
              <div className="fw-semibold">
                {formatPercent(monthly.summary.actualUsageCostPercent)}
              </div>
            </div>
          </div>
          <div className="text-muted small">
            {t.items}: {monthly.summary.itemCount} • {t.missingCount}:{" "}
            {monthly.summary.itemsMissingClosingCount}
          </div>
        </section>
      ) : null}

      {workspace === "analytics" && !hasLiquorPremiumAccess ? (
        <section className="admin-card d-flex flex-column gap-3">
          <div className="alert alert-info mb-0" role="alert">
            {t.premiumFeatureDisabled}
          </div>
        </section>
      ) : null}

      {workspace === "analytics" && monthly?.intelligence ? (
        <section className="admin-card d-flex flex-column gap-3">
          <h2 className="h5 mb-0">{t.varianceIntelligence}</h2>
          <div className="row g-3">
            <div className="col-12 col-xl-6">
              <div className="small fw-semibold mb-2">{t.topVarianceItems}</div>
              <div className="table-responsive">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>{t.item}</th>
                      <th>{t.supplier}</th>
                      <th>{t.varianceMl}</th>
                      <th>{t.usageCost}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(monthly.intelligence.topVarianceItems || []).map((row) => (
                      <tr key={`variance-${row.itemId}`}>
                        <td>{row.name}</td>
                        <td>{row.supplierName || "—"}</td>
                        <td>{formatQty(row.varianceUnits)}</td>
                        <td>{formatMoney(row.usageCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="col-12 col-xl-6">
              <div className="small fw-semibold mb-2">{t.topRiskItems}</div>
              <div className="table-responsive">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>{t.item}</th>
                      <th>{t.severity}</th>
                      <th>Risk Score</th>
                      <th>{t.varianceMl}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(monthly.intelligence.topRiskItems || []).map((row) => (
                      <tr key={`risk-${row.itemId}`}>
                        <td>{row.name}</td>
                        <td>
                          {row.riskScore >= 70
                            ? "High"
                            : row.riskScore >= 40
                              ? "Medium"
                              : "Low"}
                        </td>
                        <td>{formatPercent(row.riskScore)}</td>
                        <td>{formatQty(row.varianceUnits)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="col-12 col-xl-6">
              <div className="small fw-semibold mb-2">{t.supplierVariance}</div>
              <div className="table-responsive">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>{t.supplier}</th>
                      <th>{t.items}</th>
                      <th>{t.usageCost}</th>
                      <th>{t.varianceMl}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(monthly.intelligence.supplierVariance || []).map((row) => (
                      <tr key={`supplier-${row.supplierName}`}>
                        <td>{row.supplierName}</td>
                        <td>{row.itemCount}</td>
                        <td>{formatMoney(row.usageCost)}</td>
                        <td>{formatQty(row.varianceUnits)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="col-12 col-xl-6">
              <div className="small fw-semibold mb-2">{t.costShockMonitor}</div>
              <div className="table-responsive">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>{t.item}</th>
                      <th>{t.baselineCost}</th>
                      <th>{t.newCost}</th>
                      <th>{t.deltaPct}</th>
                      <th>{t.severity}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(monthly.intelligence.costShockItems || []).map((row) => (
                      <tr key={`shock-${row.itemId}`}>
                        <td>{row.name}</td>
                        <td>{formatMoney(row.baselineCost)}</td>
                        <td>{formatMoney(row.averageOverrideCost)}</td>
                        <td>{formatPercent(row.deltaPct)}</td>
                        <td className={row.isShock ? "text-danger fw-semibold" : ""}>
                          {row.severity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {workspace === "analytics" && yearly ? (
        <section className="admin-card d-flex flex-column gap-3">
          <h2 className="h5 mb-0">{t.yearlySummary}</h2>
          <div className="table-responsive">
            <table className="report-table">
              <thead>
                <tr>
                  <th>{t.monthCol}</th>
                  <th>{t.openingInventory}</th>
                  <th>{t.closingInventory}</th>
                  <th>{t.liquorSales}</th>
                  <th>{t.expectedUsage}</th>
                  <th>{t.actualUsage}</th>
                  <th>{t.usageVariance}</th>
                  <th>{t.actualPct}</th>
                  <th>{t.items}</th>
                  <th>{t.missing}</th>
                </tr>
              </thead>
              <tbody>
                {yearly.months.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-muted text-center py-3">
                      {t.noAnalytics}
                    </td>
                  </tr>
                ) : null}
                {yearly.months.map((row) => (
                  <tr key={row.month}>
                    <td>{row.month}</td>
                    <td>{formatMoney(row.openingInventoryValue)}</td>
                    <td>{formatMoney(row.closingInventoryValue)}</td>
                    <td>{formatMoney(row.liquorSales)}</td>
                    <td>{formatMoney(row.expectedUsageCost)}</td>
                    <td>{formatMoney(row.actualUsageCost)}</td>
                    <td>{formatMoney(row.usageCostVariance)}</td>
                    <td>{formatPercent(row.actualUsageCostPercent)}</td>
                    <td>{row.itemCount}</td>
                    <td>{row.itemsMissingClosingCount}</td>
                  </tr>
                ))}
                <tr>
                  <td>
                    <strong>Total</strong>
                  </td>
                  <td>
                    <strong>
                      {formatMoney(yearly.totals.openingInventoryValue)}
                    </strong>
                  </td>
                  <td>
                    <strong>
                      {formatMoney(yearly.totals.closingInventoryValue)}
                    </strong>
                  </td>
                  <td>
                    <strong>{formatMoney(yearly.totals.liquorSales)}</strong>
                  </td>
                  <td>
                    <strong>
                      {formatMoney(yearly.totals.expectedUsageCost)}
                    </strong>
                  </td>
                  <td>
                    <strong>{formatMoney(yearly.totals.actualUsageCost)}</strong>
                  </td>
                  <td>
                    <strong>{formatMoney(yearly.totals.usageCostVariance)}</strong>
                  </td>
                  <td>
                    <strong>
                      {formatPercent(yearly.totals.actualUsageCostPercent)}
                    </strong>
                  </td>
                  <td>—</td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {workspace === "catalog" ? (
      <section className="admin-card d-flex flex-column gap-3">
        <h2 className="h5 mb-0">{t.upcLookup}</h2>
        <div className="row g-2 align-items-end">
          <div className="col-12 col-md-4">
            <label className="form-label">UPC</label>
            <input
              className="form-control"
              value={lookupUpc}
              onChange={(event) => setLookupUpc(event.target.value)}
              placeholder="081538102055"
            />
          </div>
          <div className="col-12 col-md-2">
            <button
              type="button"
              className="btn btn-outline-primary w-100"
              onClick={() => {
                void lookupByUpc();
              }}
              disabled={lookingUp || isAnyActionBusy || !lookupUpc.trim()}
            >
              {lookingUp ? "..." : t.lookup}
            </button>
          </div>
        </div>
        {lookupResult ? (
          <div className="small text-muted">
            Source: {lookupResult.source || "unknown"}
            {lookupResult.item
              ? ` • ${lookupResult.item.name} (${lookupResult.item.brand || "No brand"})`
              : ""}
            {lookupResult.candidate
              ? ` • ${lookupResult.candidate.name} (${lookupResult.candidate.brand || "No brand"})`
              : ""}
          </div>
        ) : null}
      </section>
      ) : null}

      {workspace === "inventory" ? (
      <section id="liquor-spreadsheet" className="admin-card d-flex flex-column gap-3">
        <h2 className="h5 mb-0">{t.spreadsheetEditor}</h2>
        <div className="row g-2 align-items-end">
          <div className="col-12 col-md-3">
            <label className="form-label">{t.countDate}</label>
            <input
              type="date"
              className="form-control"
              value={countForm.countDate}
              onChange={(event) =>
                setCountForm((prev) => ({ ...prev, countDate: event.target.value }))
              }
            />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">{t.office}</label>
            <select
              className="form-select"
              value={officeId || countForm.officeId}
              onChange={(event) => {
                const nextOfficeId = event.target.value;
                if (officeId) {
                  setOfficeId(nextOfficeId);
                } else {
                  setCountForm((prev) => ({ ...prev, officeId: nextOfficeId }));
                }
              }}
            >
              <option value="">Use selected scope</option>
              {offices.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="table-responsive">
          <LiquorInventoryCountTable
            rows={spreadsheetRows}
            drafts={sheetDrafts}
            noItemsLabel={t.noItems}
            itemLabel={t.item}
            barLabel={t.bar}
            bodegaBottlesLabel={t.bodegaBottles}
            bodegaMlLabel={t.bodegaMl}
            inventoryLabel={t.inventory}
            totalLabel={t.total}
            actionsLabel="Actions"
            saveLabel={t.saveCountRow}
            disabled={loading || isAnyActionBusy}
            formatQty={formatQty}
            formatMoney={formatMoney}
            onUpdateField={updateSheetDraft}
            onSave={(itemId) => {
              void runWithReload(
                `sheet-count-${itemId}`,
                () => saveSpreadsheetCount(itemId),
                "Inventory row updated.",
              );
            }}
          />
        </div>
      </section>
      ) : null}

      {workspace === "scans" ? (
      <section id="liquor-ai-scan" className="admin-card d-flex flex-column gap-3">
        {!hasLiquorPremiumAccess ? (
          <div className="alert alert-info mb-0" role="alert">
            {t.premiumFeatureDisabled}
          </div>
        ) : (
          <>
            <h2 className="h5 mb-0">{t.bottleScan}</h2>
            <div className="text-muted small">{t.bottleScanHint}</div>
        <div className="row g-2 align-items-end">
          <div className="col-12 col-md-3">
            <label className="form-label">{t.item}</label>
            <select
              className="form-select"
              value={scanForm.itemId}
              onChange={(event) =>
                setScanForm((prev) => ({ ...prev, itemId: event.target.value }))
              }
            >
              <option value="">Select item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.brand ? `${item.name} (${item.brand})` : item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-2">
            <label className="form-label">{t.office}</label>
            <select
              className="form-select"
              value={scanForm.officeId}
              onChange={(event) =>
                setScanForm((prev) => ({ ...prev, officeId: event.target.value }))
              }
            >
              <option value="">Use selected scope</option>
              {offices.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-2">
            <label className="form-label">Date/Time</label>
            <input
              type="datetime-local"
              className="form-control"
              value={scanForm.measuredAt}
              onChange={(event) =>
                setScanForm((prev) => ({ ...prev, measuredAt: event.target.value }))
              }
            />
          </div>
          <div className="col-12 col-md-2">
            <label className="form-label">Bottle Key</label>
            <input
              className="form-control"
              value={scanForm.containerKey}
              onChange={(event) =>
                setScanForm((prev) => ({ ...prev, containerKey: event.target.value }))
              }
              placeholder="optional"
            />
          </div>
          <div className="col-12 col-md-2">
            <label className="form-label">{t.uploadPhoto}</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="form-control"
              onChange={(event) => {
                void onScanPhotoSelected(event);
              }}
            />
          </div>
          <div className="col-12 col-md-1">
            <button
              type="button"
              className="btn btn-primary w-100"
              disabled={
                analyzingScan ||
                isAnyActionBusy ||
                !scanForm.itemId.trim() ||
                !(scanForm.officeId.trim() || officeId) ||
                !scanForm.imageDataUrl
              }
              onClick={() => {
                void runWithReload(
                  "analyze-photo",
                  analyzeBottlePhoto,
                  "Bottle photo analyzed.",
                );
              }}
            >
              {analyzingScan ? t.analyzingPhoto : t.analyzePhoto}
            </button>
          </div>
        </div>
        {scanForm.imageName ? (
          <div className="small text-muted">{scanForm.imageName}</div>
        ) : null}
        {scanResult?.scan ? (
          <div className="alert alert-info mb-0">
            <div>
              {t.fillPercent}: {formatPercent(scanResult.scan.fillPercent)}
            </div>
            <div>
              {t.estimatedMl}: {formatQty(scanResult.scan.estimatedMl)}
            </div>
            <div>
              {t.spentMl}: {formatQty(scanResult.comparison?.spentMlClamped)}
            </div>
            <div>
              {t.compareWithPrevious}:{" "}
              {scanResult.comparison?.previousScan
                ? `${formatQty(scanResult.comparison?.daysBetween)} days`
                : "No previous scan"}
            </div>
            <div>
              {t.confidence}: {formatPercent(scanResult.scan.confidence)}
            </div>
            <div>
              {t.model}: {scanResult.scan.source}
            </div>
          </div>
        ) : null}
          </>
        )}
      </section>
      ) : null}

      {workspace === "invoices" ? (
      <section className="admin-card d-flex flex-column gap-3">
        {!hasLiquorPremiumAccess ? (
          <div className="alert alert-info mb-0" role="alert">
            {t.premiumFeatureDisabled}
          </div>
        ) : (
          <>
            <h2 className="h5 mb-0">{t.invoiceOcr}</h2>
            <div className="text-muted small">{t.invoiceOcrHint}</div>
        <div className="row g-2 align-items-end">
          <div className="col-12 col-md-2">
            <label className="form-label">{t.office}</label>
            <select
              className="form-select"
              value={invoiceForm.officeId}
              onChange={(event) =>
                setInvoiceForm((prev) => ({ ...prev, officeId: event.target.value }))
              }
            >
              <option value="">Use selected scope</option>
              {offices.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label">{t.invoiceDate}</label>
            <input
              type="date"
              className="form-control"
              value={invoiceForm.invoiceDate}
              onChange={(event) =>
                setInvoiceForm((prev) => ({ ...prev, invoiceDate: event.target.value }))
              }
            />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label">{t.invoiceNumber}</label>
            <input
              className="form-control"
              value={invoiceForm.invoiceNumber}
              onChange={(event) =>
                setInvoiceForm((prev) => ({
                  ...prev,
                  invoiceNumber: event.target.value,
                }))
              }
              placeholder="INV-1001"
            />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">{t.supplierNameLabel}</label>
            <input
              className="form-control"
              value={invoiceForm.supplierName}
              onChange={(event) =>
                setInvoiceForm((prev) => ({
                  ...prev,
                  supplierName: event.target.value,
                }))
              }
            />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">{t.uploadPhoto}</label>
            <input
              type="file"
              accept="image/*"
              className="form-control"
              onChange={(event) => {
                void onInvoicePhotoSelected(event);
              }}
            />
          </div>
          <div className="col-12 col-md-8">
            <label className="form-label">Notes</label>
            <input
              className="form-control"
              value={invoiceForm.notes}
              onChange={(event) =>
                setInvoiceForm((prev) => ({ ...prev, notes: event.target.value }))
              }
            />
          </div>
          <div className="col-12 col-md-4 d-flex gap-2 align-items-center">
            <div className="form-check">
              <input
                id="invoice-create-purchases"
                className="form-check-input"
                type="checkbox"
                checked={invoiceForm.createPurchaseMovements}
                onChange={(event) =>
                  setInvoiceForm((prev) => ({
                    ...prev,
                    createPurchaseMovements: event.target.checked,
                  }))
                }
              />
              <label className="form-check-label" htmlFor="invoice-create-purchases">
                {t.includePurchases}
              </label>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <button
              type="button"
              className="btn btn-primary w-100"
              disabled={
                loading ||
                isAnyActionBusy ||
                analyzingInvoice ||
                !(invoiceForm.officeId.trim() || officeId) ||
                !invoiceForm.imageDataUrl
              }
              onClick={() => {
                void runInvoiceAnalyze();
              }}
            >
              {analyzingInvoice ? t.analyzingPhoto : t.analyzeInvoice}
            </button>
          </div>
          <div className="col-6 col-md-3">
            <button
              type="button"
              className="btn btn-outline-primary w-100"
              disabled={
                loading ||
                isAnyActionBusy ||
                !invoiceResult ||
                invoiceResult.rows.length === 0
              }
              onClick={() => {
                void runWithReload(
                  "apply-invoice",
                  applyInvoiceAnalysis,
                  "Invoice rows applied to catalog.",
                );
              }}
            >
              {t.applyInvoice}
            </button>
          </div>
        </div>
        {invoiceForm.imageName ? (
          <div className="small text-muted">{invoiceForm.imageName}</div>
        ) : null}
        {invoiceResult ? (
          <div className="d-flex flex-column gap-2">
            <div className="alert alert-info mb-0">
              <div>
                {t.model}: {invoiceResult.analysis.model}
              </div>
              <div>{invoiceResult.analysis.summary}</div>
              <div>
                {t.items}: {invoiceResult.analysis.totalExtractedRows} • Match{" "}
                {invoiceResult.analysis.matchedCount} • {t.shock}{" "}
                {invoiceResult.analysis.costShockCount}
              </div>
            </div>
            <h3 className="h6 mb-0">{t.invoiceRows}</h3>
            <div className="table-responsive">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t.company}</th>
                    <th>{t.liquorName}</th>
                    <th>{t.liquorKind}</th>
                    <th>UPC</th>
                    <th>ml</th>
                    <th>Cost</th>
                    <th>Qty</th>
                    <th>{t.match}</th>
                    <th>{t.deltaPct}</th>
                    <th>{t.severity}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceResult.rows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-muted text-center py-3">
                        {t.noInvoiceRows}
                      </td>
                    </tr>
                  ) : null}
                  {invoiceResult.rows.map((row) => (
                    <tr key={`invoice-row-${row.rowNumber}-${row.liquorName}`}>
                      <td>{row.rowNumber}</td>
                      <td>{row.company || "—"}</td>
                      <td>{row.liquorName}</td>
                      <td>{row.kind || "—"}</td>
                      <td>{row.upc || "—"}</td>
                      <td>{formatQty(row.ml)}</td>
                      <td>{formatMoney(row.unitCost)}</td>
                      <td>{formatQty(row.quantity)}</td>
                      <td>
                        {row.matchedItem ? `${row.matchedItem.name}` : row.suggestedAction}
                      </td>
                      <td>{formatPercent(row.costShock ? row.costShock.deltaPct * 100 : null)}</td>
                      <td
                        className={
                          row.costShock?.isShock ? "text-danger fw-semibold" : ""
                        }
                      >
                        {row.costShock ? row.costShock.severity : "normal"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
          </>
        )}
      </section>
      ) : null}

      {workspace === "catalog" ? (
      <section className="admin-card d-flex flex-column gap-3">
        <h2 className="h5 mb-0">{t.catalog}</h2>
        <div className="row g-2 align-items-end">
          <div className="col-12 col-md-2">
            <label className="form-label">{t.company}</label>
            <input
              className="form-control"
              value={itemForm.supplierName}
              onChange={(event) =>
                setItemForm((prev) => ({
                  ...prev,
                  supplierName: event.target.value,
                }))
              }
            />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label">{t.liquorName}</label>
            <input
              className="form-control"
              value={itemForm.name}
              onChange={(event) =>
                setItemForm((prev) => ({ ...prev, name: event.target.value }))
              }
            />
          </div>
          <div className="col-12 col-md-2">
            <label className="form-label">{t.liquorKind}</label>
            <input
              className="form-control"
              list="liquor-kind-options"
              value={itemForm.brand}
              onChange={(event) =>
                setItemForm((prev) => ({ ...prev, brand: event.target.value }))
              }
              placeholder={t.kindPlaceholder}
            />
          </div>
          <div className="col-12 col-md-2">
            <label className="form-label">UPC</label>
            <input
              className="form-control"
              value={itemForm.upc}
              onChange={(event) =>
                setItemForm((prev) => ({ ...prev, upc: event.target.value }))
              }
            />
          </div>
          <div className="col-6 col-md-1">
            <label className="form-label">ml</label>
            <input
              className="form-control"
              value={itemForm.sizeMl}
              onChange={(event) =>
                setItemForm((prev) => ({ ...prev, sizeMl: event.target.value }))
              }
            />
          </div>
          <div className="col-6 col-md-1">
            <label className="form-label">Cost</label>
            <input
              className="form-control"
              value={itemForm.unitCost}
              onChange={(event) =>
                setItemForm((prev) => ({ ...prev, unitCost: event.target.value }))
              }
            />
          </div>
          <div className="col-6 col-md-1">
            <button
              type="button"
              className="btn btn-primary w-100"
              disabled={loading || isAnyActionBusy || !itemForm.name.trim()}
              onClick={() => {
                void runWithReload(
                  "create-catalog-item",
                  createCatalogItem,
                  "Catalog item created.",
                );
              }}
            >
              {t.saveItem}
            </button>
          </div>
        </div>
        <LiquorCatalogEditorTable
          items={items}
          drafts={sheetDrafts}
          noItemsLabel={t.noItems}
          companyLabel={t.company}
          liquorNameLabel={t.liquorName}
          liquorKindLabel={t.liquorKind}
          qtyMlLabel={t.qtyMl}
          priceLabel={t.price}
          actionsLabel="Actions"
          saveLabel={t.saveItemRow}
          disabled={loading || isAnyActionBusy}
          onUpdateField={updateSheetDraft}
          onSave={(itemId) => {
            void runWithReload(
              `sheet-item-${itemId}`,
              () => saveSpreadsheetItem(itemId),
              "Catalog row updated.",
            );
          }}
        />
        <LiquorKindManager
          title={t.kindList}
          addLabel={t.addKind}
          deleteLabel={t.deleteKind}
          newKindPlaceholder={t.newKindPlaceholder}
          deleteKindPlaceholder={t.kindDeletePlaceholder}
          noKindsConfigured={t.noKindsConfigured}
          showMoreKinds={t.showMoreKinds}
          showLessKinds={t.showLessKinds}
          newKindValue={kindForm.newKind}
          deleteKindValue={kindForm.deleteKind}
          kinds={liquorKinds}
          createDisabled={loading || isAnyActionBusy || !kindForm.newKind.trim()}
          deleteDisabled={
            loading || isAnyActionBusy || !kindForm.deleteKind.trim()
          }
          onNewKindChange={(value) =>
            setKindForm((prev) => ({ ...prev, newKind: value }))
          }
          onDeleteKindChange={(value) =>
            setKindForm((prev) => ({ ...prev, deleteKind: value }))
          }
          onCreate={() => {
            void runWithReload("create-kind", createLiquorKind, "Kind saved.");
          }}
          onDelete={() => {
            void runWithReload(
              "delete-kind",
              deleteLiquorKind,
              "Kind deleted.",
            );
          }}
        />
      </section>
      ) : null}

      {workspace === "analytics" && monthly ? (
      <section className="admin-card d-flex flex-column gap-3">
        <h2 className="h5 mb-0">{t.itemVariance}</h2>
        <div className="table-responsive">
          <table className="report-table">
            <thead>
              <tr>
                <th>{t.item}</th>
                <th>{t.supplier}</th>
                <th>{t.openingMl}</th>
                <th>{t.receivedMl}</th>
                <th>{t.issuedMl}</th>
                <th>{t.closingMl}</th>
                <th>{t.usageMl}</th>
                <th>{t.varianceMl}</th>
                <th>Unit Cost</th>
                <th>{t.usageCost}</th>
              </tr>
            </thead>
            <tbody>
              {monthly.rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-muted text-center py-3">
                    {t.noAnalytics}
                  </td>
                </tr>
              ) : null}
              {monthly?.rows.map((row) => (
                <tr key={row.itemId}>
                  <td>{row.name}</td>
                  <td>{row.supplierName || "—"}</td>
                  <td>{formatQty(row.openingUnits)}</td>
                  <td>{formatQty(row.receivedUnits)}</td>
                  <td>{formatQty(row.issuedUnits)}</td>
                  <td>{formatQty(row.closingUnits)}</td>
                  <td>{formatQty(row.actualUsageUnits)}</td>
                  <td>{formatQty(row.varianceUnits)}</td>
                  <td>{formatMoney(row.unitCost)}</td>
                  <td>{formatMoney(row.actualUsageCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      ) : null}

      {workspace === "operations" ? (
      <section className="admin-card d-flex flex-column gap-3">
        <h2 className="h5 mb-0">{t.postMovement}</h2>
        <div className="row g-2 align-items-end">
          <div className="col-12 col-md-3">
            <label className="form-label">{t.item}</label>
            <select
              className="form-select"
              value={movementForm.itemId}
              onChange={(event) =>
                setMovementForm((prev) => ({ ...prev, itemId: event.target.value }))
              }
            >
              <option value="">Select item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-2">
            <label className="form-label">{t.office}</label>
            <select
              className="form-select"
              value={movementForm.officeId}
              onChange={(event) =>
                setMovementForm((prev) => ({
                  ...prev,
                  officeId: event.target.value,
                }))
              }
            >
              <option value="">Use selected scope</option>
              {offices.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-2">
            <label className="form-label">Type</label>
            <select
              className="form-select"
              value={movementForm.type}
              onChange={(event) =>
                setMovementForm((prev) => ({ ...prev, type: event.target.value }))
              }
            >
              {movementTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-1">
            <label className="form-label">Qty</label>
            <input
              className="form-control"
              value={movementForm.quantity}
              onChange={(event) =>
                setMovementForm((prev) => ({
                  ...prev,
                  quantity: event.target.value,
                }))
              }
            />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label">Date/Time</label>
            <input
              type="datetime-local"
              className="form-control"
              value={movementForm.occurredAt}
              onChange={(event) =>
                setMovementForm((prev) => ({
                  ...prev,
                  occurredAt: event.target.value,
                }))
              }
            />
          </div>
          <div className="col-12 col-md-2">
            <button
              type="button"
              className="btn btn-primary w-100"
              disabled={
                loading ||
                isAnyActionBusy ||
                !movementForm.itemId.trim() ||
                !movementForm.quantity.trim()
              }
              onClick={() => {
                void runWithReload("create-movement", createMovement, "Movement saved.");
              }}
            >
              {t.postMovement}
            </button>
          </div>
        </div>
      </section>
      ) : null}

      {workspace === "operations" ? (
      <section className="admin-card d-flex flex-column gap-3">
        <h2 className="h5 mb-0">{t.saveCount}</h2>
        <div className="row g-2 align-items-end">
          <div className="col-12 col-md-3">
            <label className="form-label">{t.item}</label>
            <select
              className="form-select"
              value={countForm.itemId}
              onChange={(event) =>
                setCountForm((prev) => ({ ...prev, itemId: event.target.value }))
              }
            >
              <option value="">Select item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-2">
            <label className="form-label">{t.office}</label>
            <select
              className="form-select"
              value={countForm.officeId}
              onChange={(event) =>
                setCountForm((prev) => ({ ...prev, officeId: event.target.value }))
              }
            >
              <option value="">Use selected scope</option>
              {offices.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-control"
              value={countForm.countDate}
              onChange={(event) =>
                setCountForm((prev) => ({ ...prev, countDate: event.target.value }))
              }
            />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label">Qty</label>
            <input
              className="form-control"
              value={countForm.quantity}
              onChange={(event) =>
                setCountForm((prev) => ({ ...prev, quantity: event.target.value }))
              }
            />
          </div>
          <div className="col-6 col-md-1">
            <label className="form-label">{t.bar}</label>
            <input
              className="form-control"
              value={countForm.barQuantity}
              onChange={(event) =>
                setCountForm((prev) => ({
                  ...prev,
                  barQuantity: event.target.value,
                }))
              }
            />
          </div>
          <div className="col-6 col-md-1">
            <label className="form-label">{t.bodegaBottles}</label>
            <input
              className="form-control"
              value={countForm.bodegaBottleCount}
              onChange={(event) =>
                setCountForm((prev) => ({
                  ...prev,
                  bodegaBottleCount: event.target.value,
                }))
              }
            />
          </div>
          <div className="col-6 col-md-1">
            <label className="form-label">{t.bodegaMl}</label>
            <input
              className="form-control"
              value={String(countBodegaQuantityMl)}
              readOnly
            />
          </div>
          <div className="col-6 col-md-1">
            <label className="form-label">{t.inventory}</label>
            <input
              className="form-control"
              value={String(countInventoryQuantity)}
              readOnly
            />
          </div>
          <div className="col-12 col-md-3">
            <button
              type="button"
              className="btn btn-primary w-100"
              disabled={loading || isAnyActionBusy || !countForm.itemId.trim()}
              onClick={() => {
                void runWithReload("save-count", saveCount, "Count saved.");
              }}
            >
              {t.saveCount}
            </button>
          </div>
        </div>
      </section>
      ) : null}

      {workspace === "activity" ? (
      <section className="admin-card d-flex flex-column gap-3">
        <h2 className="h5 mb-0">{t.recentMovements}</h2>
        <div className="table-responsive">
          <table className="report-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>{t.office}</th>
                <th>{t.item}</th>
                <th>Type</th>
                <th>Qty</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted text-center py-3">
                    {t.noMovements}
                  </td>
                </tr>
              ) : null}
              {movements.map((movement) => (
                <tr key={movement.id}>
                  <td>{new Date(movement.occurredAt).toLocaleString()}</td>
                  <td>{movement.officeName}</td>
                  <td>{movement.itemName}</td>
                  <td>{movement.type}</td>
                  <td>{formatQty(movement.quantity)}</td>
                  <td>{movement.createdBy || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      ) : null}

      {workspace === "activity" ? (
      <section className="admin-card d-flex flex-column gap-3">
        <h2 className="h5 mb-0">{t.recentCounts}</h2>
        <div className="table-responsive">
          <table className="report-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>{t.office}</th>
                <th>{t.item}</th>
                <th>{t.bar}</th>
                <th>{t.bodegaBottles}</th>
                <th>{t.bodegaMl}</th>
                <th>Qty</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              {counts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-muted text-center py-3">
                    {t.noCounts}
                  </td>
                </tr>
              ) : null}
              {counts.map((count) => (
                <tr key={count.id}>
                  <td>{count.countDate}</td>
                  <td>{count.officeName}</td>
                  <td>{count.itemName}</td>
                  <td>{formatQty(count.barQuantity)}</td>
                  <td>{formatQty(count.bodegaBottleCount)}</td>
                  <td>{formatQty(count.bodegaQuantity)}</td>
                  <td>{formatQty(count.quantity)}</td>
                  <td>{count.createdBy || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      ) : null}

      {workspace === "scans" ? (
      <section id="liquor-ai-history" className="admin-card d-flex flex-column gap-3">
        <h2 className="h5 mb-0">{t.scanHistory}</h2>
        <div className="table-responsive">
          <table className="report-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>{t.office}</th>
                <th>{t.item}</th>
                <th>{t.fillPercent}</th>
                <th>{t.estimatedMl}</th>
                <th>{t.confidence}</th>
                <th>{t.model}</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              {bottleScans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-muted text-center py-3">
                    {t.noScanHistory}
                  </td>
                </tr>
              ) : null}
              {bottleScans.map((scan) => (
                <tr key={scan.id}>
                  <td>{new Date(scan.measuredAt).toLocaleString()}</td>
                  <td>{scan.officeName}</td>
                  <td>
                    {scan.itemBrand
                      ? `${scan.itemName} (${scan.itemBrand})`
                      : scan.itemName}
                  </td>
                  <td>{formatPercent(scan.fillPercent)}</td>
                  <td>{formatQty(scan.estimatedMl)}</td>
                  <td>{formatPercent(scan.confidence)}</td>
                  <td>{scan.source || "—"}</td>
                  <td>{scan.createdBy || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      ) : null}
    </div>
  );
}
