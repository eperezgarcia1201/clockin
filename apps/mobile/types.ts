export type Employee = {
  id: string;
  name: string;
  active: boolean;
  isManager?: boolean;
  isServer?: boolean;
  isKitchenManager?: boolean;
  officeId?: string | null;
};

export type TenantContext = {
  input: string;
  name: string;
  slug: string;
  subdomain: string;
  authOrgId: string;
};

export type TenantOffice = {
  id: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  geofenceRadiusMeters?: number | null;
};

export type ActiveShift = {
  tenantAuthOrgId: string;
  tenantSlug?: string;
  employeeId: string;
  employeeName: string;
  isManager?: boolean;
  isServer: boolean;
  isKitchenManager?: boolean;
  startedAt: string;
  pin?: string;
};

export type WorkingNowRow = {
  id: string;
  name: string;
  status: "IN" | "BREAK" | "LUNCH";
  office: string | null;
  group: string | null;
};

export type TodayScheduleRow = {
  employeeId: string;
  employeeName: string;
  startTime: string;
  endTime: string;
  roleLabel: string;
  officeId: string | null;
  officeName: string | null;
};

export type TodayScheduleResponse = {
  date: string;
  weekday: number;
  weekdayLabel: string;
  timezone: string;
  rows: TodayScheduleRow[];
};

export type EmployeeWeekScheduleDay = {
  weekday: number;
  label: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
};

export type EmployeeWeekScheduleResponse = {
  employeeId: string;
  employeeName: string;
  days: EmployeeWeekScheduleDay[];
};

export type CompanyOrderCatalogItem = {
  nameEs: string;
  nameEn: string;
};

export type CompanyOrderCatalogSupplier = {
  supplierName: string;
  items: CompanyOrderCatalogItem[];
};

export type CompanyOrderItem = {
  id: string;
  nameEs: string;
  nameEn: string;
  quantity: number;
};

export type CompanyOrderRow = {
  id: string;
  supplierName: string;
  orderDate: string;
  weekStartDate?: string;
  weekEndDate?: string;
  orderLabel?: string;
  submittedDates?: string[];
  contributors?: string[];
  notes: string;
  officeName: string | null;
  createdBy: string | null;
  totalQuantity: number;
  itemCount: number;
  items: CompanyOrderItem[];
};

export type EmployeeViewTab = "clock" | "weekSchedule" | "companyOrders";

export type LiquorCatalogItem = {
  id: string;
  name: string;
  brand: string | null;
  supplierName: string | null;
  sizeMl: number | null;
  unitCost: number;
  isActive: boolean;
};

export type LiquorCountRow = {
  id: string;
  itemId: string;
  countDate: string;
  quantity: number;
  barQuantity: number | null;
  bodegaQuantity: number | null;
};

export type LiquorBottleScanRow = {
  id: string;
  itemId: string;
  itemName: string;
  containerKey: string | null;
  fillPercent: number;
  estimatedMl: number | null;
  measuredAt: string;
  createdAt: string;
};

export type LiquorSheetDraft = {
  supplierName: string;
  unitCost: string;
  sizeMl: string;
  barQuantity: string;
  bodegaQuantity: string;
};

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
    summary?: string;
    totalExtractedRows?: number;
    matchedCount?: number;
    costShockCount?: number;
  };
  rows?: Array<Record<string, unknown>>;
};
