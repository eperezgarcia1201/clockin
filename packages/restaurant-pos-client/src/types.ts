export type RestaurantPosOffice = {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  geofenceRadiusMeters: number | null;
};

export type RestaurantPosConnectionResponse = {
  provider: 'clockin';
  configured: boolean;
  tenant: {
    id: string;
    name: string;
    slug: string;
    tenantExternalId: string;
  };
  actor: {
    actorType: string;
    displayName: string;
    membershipRole: string;
    authUserId: string;
    userId: string;
    allowedOfficeId: string | null;
  };
  settings: {
    websysPosEnabled: boolean;
    multiLocationEnabled: boolean;
    companyOrdersEnabled: boolean;
    liquorInventoryEnabled: boolean;
    premiumFeaturesEnabled: boolean;
  };
  capabilities: {
    scheduleManagement: boolean;
    hoursReporting: boolean;
    payrollReporting: boolean;
    tipReporting: boolean;
    payoutReporting: boolean;
    payoutWriteback: boolean;
  };
  resolvedScope: {
    requestedOfficeId: string | null;
    officeId: string | null;
    expensesScope: 'tenant';
  };
  permissions: Record<string, boolean>;
  offices: RestaurantPosOffice[];
  integrationNotes: string[];
};

export type RestaurantPosHoursDay = {
  date: string;
  minutes: number;
  hoursDecimal: number;
  hoursFormatted: string;
  firstIn?: string | null;
  lastOut?: string | null;
};

export type RestaurantPosHoursEmployee = {
  employeeId: string;
  name: string;
  totalMinutes: number;
  totalHoursDecimal: number;
  totalHoursFormatted: string;
  shifts: number;
  days?: RestaurantPosHoursDay[];
};

export type RestaurantPosHoursReport = {
  provider: 'clockin';
  range: { from: string; to: string };
  roundMinutes: number;
  employees: RestaurantPosHoursEmployee[];
};

export type RestaurantPosPayrollWeek = {
  weekStart: string;
  totalMinutes: number;
  totalHoursFormatted: string;
  totalHoursDecimal: number;
  regularMinutes: number;
  regularHoursFormatted: string;
  overtimeMinutes: number;
  overtimeHoursFormatted: string;
  regularPay: number;
  overtimePay: number;
  totalPay: number;
};

export type RestaurantPosPayrollEmployee = {
  employeeId: string;
  name: string;
  hourlyRate: number;
  totalMinutes: number;
  totalHoursDecimal: number;
  totalHoursFormatted: string;
  totalPay: number;
  weeks: RestaurantPosPayrollWeek[];
};

export type RestaurantPosPayrollReport = {
  provider: 'clockin';
  range: { from: string; to: string };
  roundMinutes: number;
  weekStartsOn: number;
  overtimeThreshold: number;
  overtimeMultiplier: number;
  totals: {
    totalHoursDecimal: number;
    totalPay: number;
  };
  employees: RestaurantPosPayrollEmployee[];
};

export type RestaurantPosTipsDay = {
  date: string;
  cashTips: number;
  creditCardTips: number;
  totalTips: number;
};

export type RestaurantPosTipsEmployee = {
  employeeId: string;
  name: string;
  cashTips: number;
  creditCardTips: number;
  totalTips: number;
  days?: RestaurantPosTipsDay[];
};

export type RestaurantPosTipsReport = {
  provider: 'clockin';
  range: { from: string; to: string };
  totals: {
    cashTips: number;
    creditCardTips: number;
    totalTips: number;
  };
  employees: RestaurantPosTipsEmployee[];
};

export type RestaurantPosScheduleDay = {
  weekday: number;
  label: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
};

export type RestaurantPosTodayScheduleRow = {
  employeeId: string;
  employeeName: string;
  startTime: string;
  endTime: string;
  isServer: boolean;
  officeId: string | null;
  officeName: string | null;
  groupId: string | null;
  groupName: string | null;
  roleLabel: string;
};

export type RestaurantPosTodaySchedulesResponse = {
  provider: 'clockin';
  editable: true;
  date: string;
  weekday: number;
  weekdayLabel: string;
  timezone: string;
  rows: RestaurantPosTodayScheduleRow[];
};

export type RestaurantPosEmployeeSchedule = {
  provider: 'clockin';
  editable: true;
  employeeId: string;
  employeeName: string;
  days: RestaurantPosScheduleDay[];
};

export type RestaurantPosPayoutRecord = {
  payoutId: string;
  expenseId: string;
  date: string;
  vendor: string;
  companyName: string;
  paymentMethod: 'CHECK' | 'DEBIT_CARD' | 'CASH';
  invoiceNumber: string;
  amount: number;
  checkNumber: string | null;
  payToCompany: string | null;
  hasReceipt: boolean;
  notes: string;
  submittedBy: string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type RestaurantPosPayoutsReport = {
  provider: 'clockin';
  range: { from: string; to: string };
  scope: 'tenant';
  totals: {
    totalExpenses: number;
    cashExpenses: number;
    debitCardExpenses: number;
    checkExpenses: number;
  };
  payouts: RestaurantPosPayoutRecord[];
  expenses: RestaurantPosPayoutRecord[];
};

export type RestaurantPosCreatePayoutInput = {
  date: string;
  companyName: string;
  paymentMethod: 'CHECK' | 'DEBIT_CARD' | 'CASH';
  amount: number;
  invoiceNumber?: string;
  checkNumber?: string;
  payToCompany?: string;
  notes?: string;
};

export type RestaurantPosCreatePayoutResponse = {
  provider: 'clockin';
  ok: true;
  payout: RestaurantPosPayoutRecord;
  expense: RestaurantPosPayoutRecord;
};

export type RestaurantPosScopedRangeInput = {
  from: string;
  to: string;
  employeeId?: string;
  officeId?: string;
  groupId?: string;
  roundMinutes?: number;
  tzOffset?: number;
};

export type RestaurantPosPayrollInput = RestaurantPosScopedRangeInput & {
  weekStartsOn?: number;
  overtimeThreshold?: number;
};

export type RestaurantPosClientDevAuth = {
  tenantExternalId: string;
  actorId?: string;
  actorName?: string;
  actorEmail?: string;
};

export type RestaurantPosClientConfig = {
  baseUrl: string;
  bearerToken?: string | (() => string | Promise<string | undefined>) | undefined;
  devAuth?: RestaurantPosClientDevAuth;
  getHeaders?: () => HeadersInit | Promise<HeadersInit>;
  fetchImpl?: typeof fetch;
};

export type RestaurantPosQueryState<T> = {
  data: T | null;
  error: Error | null;
  loading: boolean;
  reload: () => Promise<void>;
};

export type RestaurantPosMutationState<TInput, TResult> = {
  data: TResult | null;
  error: Error | null;
  loading: boolean;
  execute: (input: TInput) => Promise<TResult>;
  reset: () => void;
};
