export type Screen =
  | "dashboard"
  | "users"
  | "offices"
  | "groups"
  | "capture"
  | "reports"
  | "liquorControl"
  | "alerts"
  | "schedules"
  | "companyOrders";

export type Summary = {
  total: number;
  admins: number;
  timeAdmins: number;
  reports: number;
};

export type Employee = {
  id: string;
  name: string;
  email?: string;
  active: boolean;
  officeId?: string | null;
  groupId?: string | null;
  isManager?: boolean;
  isOwnerManager?: boolean;
  managerPermissions?: string[];
  isAdmin?: boolean;
  isTimeAdmin?: boolean;
  isReports?: boolean;
  isServer?: boolean;
  isKitchenManager?: boolean;
  allowOpenSchedule?: boolean;
};

export type Office = {
  id: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  geofenceRadiusMeters?: number | null;
};

export type Group = { id: string; name: string; officeId?: string | null };

export type AccessPermissions = {
  dashboard: boolean;
  users: boolean;
  locations: boolean;
  manageMultiLocation: boolean;
  groups: boolean;
  statuses: boolean;
  schedules: boolean;
  companyOrders: boolean;
  reports: boolean;
  tips: boolean;
  salesCapture: boolean;
  notifications: boolean;
  settings: boolean;
  timeEdits: boolean;
};

export type NotificationRow = {
  id: string;
  message: string;
  createdAt: string;
  readAt?: string | null;
  employeeName?: string | null;
  type: string;
  metadata?: Record<string, unknown> | null;
};

export type AdminNotificationPreferences = {
  notifyPunchActivity: boolean;
  notifyNoBreakAlerts: boolean;
  notifyLateClockInReminders: boolean;
  notifyScheduleOverrides: boolean;
  notifyTipSummaries: boolean;
  notifyDailySalesReminders: boolean;
};

export type AdminNotificationPreferenceKey =
  keyof AdminNotificationPreferences;

export type AdminPushDevice = {
  id: string;
  label?: string | null;
  platform?: string | null;
  timeZone?: string | null;
  tokenPreview?: string | null;
  createdAt: string;
  updatedAt: string;
  notifications: AdminNotificationPreferences;
};

export type ExpensePaymentMethod = "CHECK" | "DEBIT_CARD" | "CASH";
export type ReceiptAttachment = {
  uri: string;
  mimeType: string;
  fileName: string;
};

export type ReportType = "daily" | "hours" | "payroll" | "audit" | "tips";
export type CaptureMode = "sales" | "expense";
export type ThemeMode = "dark" | "light";
export type Meridiem = "AM" | "PM";
export type ScheduleTimeKey = "startTime" | "endTime";

export type ScheduleDay = {
  weekday: number;
  label: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
};

export type TodayScheduleRow = {
  employeeId: string;
  employeeName: string;
  startTime: string;
  endTime: string;
  isServer: boolean;
  officeName: string | null;
  groupName: string | null;
  roleLabel: string;
};

export type TodayScheduleResponse = {
  date: string;
  weekday: number;
  weekdayLabel: string;
  timezone: string;
  rows: TodayScheduleRow[];
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
  contributors?: string[];
  notes: string;
  officeName: string | null;
  createdBy: string | null;
  totalQuantity: number;
  itemCount: number;
  items: CompanyOrderItem[];
};

export type CompanyOrderInPersonItem = {
  nameEs: string;
  nameEn: string;
  orderedQuantity: number;
  purchasedQuantity: number;
  remainingQuantity: number;
  unitPrice: number | null;
  companyUnitPrice: number | null;
};

export type CompanyOrderInPersonSupplier = {
  supplierName: string;
  itemCount: number;
  totalOrderedQuantity: number;
  totalPurchasedQuantity: number;
  totalRemainingQuantity: number;
  items: CompanyOrderInPersonItem[];
};

export type EditUserForm = {
  fullName: string;
  displayName: string;
  email: string;
  pin: string;
  hourlyRate: string;
  officeId: string;
  groupId: string;
  isManager: boolean;
  isOwnerManager: boolean;
  isAdmin: boolean;
  isTimeAdmin: boolean;
  isReports: boolean;
  isServer: boolean;
  isKitchenManager: boolean;
  allowOpenSchedule: boolean;
  disabled: boolean;
};
