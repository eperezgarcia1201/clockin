"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  supplierName: string;
  unitCost: string;
  sizeMl: string;
  barQuantity: string;
  bodegaQuantity: string;
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
  rows: MonthlyRow[];
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
    spreadsheetEditor: "Spreadsheet Editor",
    company: "Company",
    liquorName: "Liquor Names",
    liquorKind: "Kind",
    price: "Price",
    qtyMl: "Qty/ML",
    bar: "Bar",
    bodega: "Bodega",
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
    workspaceAnalytics: "Analytics",
    workspaceActivity: "Activity Feed",
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
    spreadsheetEditor: "Editor de Hoja",
    company: "Compañía",
    liquorName: "Nombres de Licor",
    liquorKind: "Tipo",
    price: "Precio",
    qtyMl: "Cant/ML",
    bar: "Bar",
    bodega: "Bodega",
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
    workspaceAnalytics: "Analítica",
    workspaceActivity: "Actividad",
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
  const [targetCostPct, setTargetCostPct] = useState("0.30");

  const [offices, setOffices] = useState<Office[]>([]);
  const [items, setItems] = useState<LiquorCatalogItem[]>([]);
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
    bodegaQuantity: "",
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

  const parsedTargetCostPct = useMemo(() => {
    const value = Number(targetCostPct);
    return Number.isFinite(value) ? value : null;
  }, [targetCostPct]);
  const workspaceOptions: Array<{ key: WorkspaceKey; label: string }> = [
    { key: "inventory", label: t.workspaceInventory },
    { key: "catalog", label: t.workspaceCatalog },
    { key: "operations", label: t.workspaceOperations },
    { key: "scans", label: t.workspaceScans },
    { key: "analytics", label: t.workspaceAnalytics },
    { key: "activity", label: t.workspaceActivity },
  ];
  const isAnyActionBusy = activeAction !== null;

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
          const barQuantity =
            latestCount?.barQuantity ?? latestCount?.quantity ?? 0;
          const bodegaQuantity = latestCount?.bodegaQuantity ?? 0;
          const inventory = barQuantity + bodegaQuantity;
          const total =
            item.sizeMl && item.sizeMl > 0
              ? (item.unitCost * inventory) / item.sizeMl
              : null;
          return {
            item,
            latestCount,
            barQuantity,
            bodegaQuantity,
            inventory,
            total,
          };
        }),
    [items, latestCountByItem],
  );

  useEffect(() => {
    setSheetDrafts((previous) => {
      const next: Record<string, SpreadsheetDraft> = {};
      spreadsheetRows.forEach((row) => {
        const existing = previous[row.item.id];
        next[row.item.id] = {
          name: existing?.name ?? row.item.name ?? "",
          brand: existing?.brand ?? row.item.brand ?? "",
          supplierName: existing?.supplierName ?? row.item.supplierName ?? "",
          unitCost: existing?.unitCost ?? String(row.item.unitCost ?? ""),
          sizeMl:
            existing?.sizeMl ??
            (row.item.sizeMl === null ? "" : String(row.item.sizeMl)),
          barQuantity: existing?.barQuantity ?? String(row.barQuantity || ""),
          bodegaQuantity:
            existing?.bodegaQuantity ?? String(row.bodegaQuantity || ""),
        };
      });
      return next;
    });
  }, [spreadsheetRows]);

  const loadAll = useCallback(async (options?: { silent?: boolean }) => {
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
      const accessResponse = await fetch("/api/access/me", { cache: "no-store" });
      if (accessResponse.ok) {
        const accessPayload = (await accessResponse.json()) as {
          liquorInventoryEnabled?: boolean;
          permissions?: { reports?: boolean };
        };
        const canAccessLiquorControl =
          Boolean(accessPayload.permissions?.reports) &&
          Boolean(accessPayload.liquorInventoryEnabled);

        if (!canAccessLiquorControl) {
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

      const [
        catalogResponse,
        movementResponse,
        countResponse,
        bottleScansResponse,
        monthlyResponse,
        yearlyResponse,
        officesResponse,
      ] = await Promise.all([
        fetch("/api/liquor-inventory/catalog?includeInactive=1", {
          cache: "no-store",
        }),
        fetch(`/api/liquor-inventory/movements?${queryFeed.toString()}`, {
          cache: "no-store",
        }),
        fetch(`/api/liquor-inventory/counts?${queryFeed.toString()}`, {
          cache: "no-store",
        }),
        fetch(`/api/liquor-inventory/bottle-scans?${queryFeed.toString()}`, {
          cache: "no-store",
        }),
        fetch(`/api/liquor-inventory/report/monthly?${queryMonthly.toString()}`, {
          cache: "no-store",
        }),
        fetch(`/api/liquor-inventory/control/yearly?${queryYearly.toString()}`, {
          cache: "no-store",
        }),
        fetch("/api/offices", { cache: "no-store" }),
      ]);

      if (!catalogResponse.ok) {
        throw new Error(
          await readErrorMessage(catalogResponse, "Unable to load catalog."),
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
      if (!bottleScansResponse.ok) {
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

      const catalogPayload = (await catalogResponse.json()) as {
        items?: LiquorCatalogItem[];
      };
      const movementPayload = (await movementResponse.json()) as {
        movements?: LiquorMovement[];
      };
      const countPayload = (await countResponse.json()) as {
        counts?: LiquorCount[];
      };
      const bottleScansPayload = (await bottleScansResponse.json()) as {
        scans?: BottleScan[];
      };
      const monthlyPayload = (await monthlyResponse.json()) as MonthlyReport;
      const yearlyPayload = (await yearlyResponse.json()) as YearlyControl;

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
  }, [month, officeId, parsedTargetCostPct, t.featureDisabled, year]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

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

    const response = await fetch("/api/liquor-inventory/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        brand: itemForm.brand.trim() || undefined,
        upc: itemForm.upc.trim() || undefined,
        sizeMl,
        unitLabel: itemForm.unitLabel.trim() || undefined,
        supplierName: itemForm.supplierName.trim() || undefined,
        unitCost,
      }),
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

    const response = await fetch("/api/liquor-inventory/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId,
        officeId: selectedOfficeId,
        type: movementForm.type,
        quantity,
        occurredAt: occurredAt.toISOString(),
        notes: movementForm.notes.trim() || undefined,
      }),
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
    const parsedBodegaQuantity = countForm.bodegaQuantity.trim()
      ? Number(countForm.bodegaQuantity)
      : null;
    const hasSplitCount =
      parsedBarQuantity !== null || parsedBodegaQuantity !== null;
    const quantity = hasSplitCount
      ? (parsedBarQuantity || 0) + (parsedBodegaQuantity || 0)
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
      parsedBodegaQuantity !== null &&
      (!Number.isFinite(parsedBodegaQuantity) || parsedBodegaQuantity < 0)
    ) {
      setStatusKind("danger");
      setStatus("Bodega quantity must be zero or greater.");
      return;
    }

    const response = await fetch("/api/liquor-inventory/counts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId,
        officeId: selectedOfficeId,
        countDate: countForm.countDate,
        quantity,
        barQuantity: parsedBarQuantity ?? undefined,
        bodegaQuantity: parsedBodegaQuantity ?? undefined,
        notes: countForm.notes.trim() || undefined,
      }),
    });
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, "Unable to save count."));
    }

    setCountForm((previous) => ({
      ...previous,
      quantity: "",
      barQuantity: "",
      bodegaQuantity: "",
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
        supplierName: previous[itemId]?.supplierName ?? "",
        unitCost: previous[itemId]?.unitCost ?? "",
        sizeMl: previous[itemId]?.sizeMl ?? "",
        barQuantity: previous[itemId]?.barQuantity ?? "",
        bodegaQuantity: previous[itemId]?.bodegaQuantity ?? "",
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

    const response = await fetch(`/api/liquor-inventory/catalog/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        brand: draft.brand.trim() || undefined,
        supplierName: draft.supplierName.trim() || undefined,
        unitCost,
        sizeMl: parsedSizeMl ?? undefined,
      }),
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
    const bodegaQuantity = draft.bodegaQuantity.trim()
      ? Number(draft.bodegaQuantity)
      : 0;
    if (!Number.isFinite(barQuantity) || barQuantity < 0) {
      throw new Error("Bar quantity must be zero or greater.");
    }
    if (!Number.isFinite(bodegaQuantity) || bodegaQuantity < 0) {
      throw new Error("Bodega quantity must be zero or greater.");
    }

    const response = await fetch("/api/liquor-inventory/counts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId,
        officeId: selectedOfficeId,
        countDate: countForm.countDate,
        quantity: barQuantity + bodegaQuantity,
        barQuantity,
        bodegaQuantity,
      }),
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
      const response = await fetch(`/api/liquor-inventory/catalog/upc/${upc}`, {
        cache: "no-store",
      });
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
      const response = await fetch("/api/liquor-inventory/bottle-scans/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          officeId: selectedOfficeId,
          measuredAt: measuredAt.toISOString(),
          containerKey: scanForm.containerKey.trim() || undefined,
          imageDataUrl: scanForm.imageDataUrl,
        }),
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
          <table className="report-table">
            <thead>
              <tr>
                <th>{t.company}</th>
                <th>{t.liquorName}</th>
                <th>{t.liquorKind}</th>
                <th>{t.price}</th>
                <th>{t.qtyMl}</th>
                <th>{t.bar}</th>
                <th>{t.bodega}</th>
                <th>{t.inventory}</th>
                <th>{t.total}</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {spreadsheetRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-muted text-center py-3">
                    {t.noItems}
                  </td>
                </tr>
              ) : null}
              {spreadsheetRows.map((row) => {
                const draft = sheetDrafts[row.item.id];
                const bar = Number(draft?.barQuantity ?? row.barQuantity) || 0;
                const bodega =
                  Number(draft?.bodegaQuantity ?? row.bodegaQuantity) || 0;
                const inventory = bar + bodega;
                const price = Number(draft?.unitCost ?? row.item.unitCost) || 0;
                const qtyMl = Number(draft?.sizeMl ?? row.item.sizeMl) || 0;
                const total = qtyMl > 0 ? (price * inventory) / qtyMl : null;

                return (
                  <tr key={`sheet-${row.item.id}`}>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={draft?.supplierName ?? row.item.supplierName ?? ""}
                        onChange={(event) =>
                          updateSheetDraft(
                            row.item.id,
                            "supplierName",
                            event.target.value,
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={draft?.name ?? row.item.name}
                        onChange={(event) =>
                          updateSheetDraft(row.item.id, "name", event.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={draft?.brand ?? row.item.brand ?? ""}
                        onChange={(event) =>
                          updateSheetDraft(row.item.id, "brand", event.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={draft?.unitCost ?? String(row.item.unitCost)}
                        onChange={(event) =>
                          updateSheetDraft(row.item.id, "unitCost", event.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={draft?.sizeMl ?? String(row.item.sizeMl ?? "")}
                        onChange={(event) =>
                          updateSheetDraft(row.item.id, "sizeMl", event.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={draft?.barQuantity ?? String(row.barQuantity)}
                        onChange={(event) =>
                          updateSheetDraft(
                            row.item.id,
                            "barQuantity",
                            event.target.value,
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        value={draft?.bodegaQuantity ?? String(row.bodegaQuantity)}
                        onChange={(event) =>
                          updateSheetDraft(
                            row.item.id,
                            "bodegaQuantity",
                            event.target.value,
                          )
                        }
                      />
                    </td>
                    <td>{formatQty(inventory)}</td>
                    <td>{formatMoney(total)}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          disabled={loading || isAnyActionBusy}
                          onClick={() => {
                            void runWithReload(
                              `sheet-item-${row.item.id}`,
                              () => saveSpreadsheetItem(row.item.id),
                              "Catalog row updated.",
                            );
                          }}
                        >
                          {t.saveItemRow}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          disabled={loading || isAnyActionBusy}
                          onClick={() => {
                            void runWithReload(
                              `sheet-count-${row.item.id}`,
                              () => saveSpreadsheetCount(row.item.id),
                              "Inventory row updated.",
                            );
                          }}
                        >
                          {t.saveCountRow}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      ) : null}

      {workspace === "scans" ? (
      <section id="liquor-ai-scan" className="admin-card d-flex flex-column gap-3">
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
              value={itemForm.brand}
              onChange={(event) =>
                setItemForm((prev) => ({ ...prev, brand: event.target.value }))
              }
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
        <div className="table-responsive">
          <table className="report-table">
            <thead>
              <tr>
                <th>{t.company}</th>
                <th>{t.liquorName}</th>
                <th>{t.liquorKind}</th>
                <th>UPC</th>
                <th>ml</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted text-center py-3">
                    {t.noItems}
                  </td>
                </tr>
              ) : null}
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.supplierName || "—"}</td>
                  <td>{item.name}</td>
                  <td>{item.brand || "—"}</td>
                  <td>{item.upc || "—"}</td>
                  <td>{item.sizeMl ?? "—"}</td>
                  <td>{formatMoney(item.unitCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
            <label className="form-label">{t.bodega}</label>
            <input
              className="form-control"
              value={countForm.bodegaQuantity}
              onChange={(event) =>
                setCountForm((prev) => ({
                  ...prev,
                  bodegaQuantity: event.target.value,
                }))
              }
            />
          </div>
          <div className="col-6 col-md-1">
            <label className="form-label">{t.inventory}</label>
            <input
              className="form-control"
              value={String(
                (Number(countForm.barQuantity) || 0) +
                  (Number(countForm.bodegaQuantity) || 0),
              )}
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
                <th>{t.bodega}</th>
                <th>Qty</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              {counts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-muted text-center py-3">
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
