type ExpensePaymentMethod = "CHECK" | "DEBIT_CARD" | "CASH";

type SalesReportRowInput = {
  officeId: string | null;
  officeName: string | null;
  foodSales: number;
  liquorSales: number;
  totalSales: number;
  totalPayments: number;
  balance: number;
};

type DailyExpenseRowInput = {
  officeId: string | null;
  officeName: string | null;
  paymentMethod: ExpensePaymentMethod;
  amount: number;
};

type SalesReportResponseInput = {
  reports?: SalesReportRowInput[];
  expenses?: DailyExpenseRowInput[];
};

export type SalesLocationBreakdownRow = {
  officeId: string | null;
  officeName: string | null;
  reportCount: number;
  expenseCount: number;
  foodSales: number;
  liquorSales: number;
  totalSales: number;
  totalPayments: number;
  balance: number;
  totalExpenses: number;
  cashExpenses: number;
  debitCardExpenses: number;
  checkExpenses: number;
};

const toMoney = (value: number) => Number(value.toFixed(2));

const buildOfficeKey = (officeId: string | null, officeName: string | null) =>
  officeId || officeName?.trim().toLowerCase() || "__unassigned__";

const compareOfficeNames = (left: string | null, right: string | null) =>
  (left || "Unassigned").localeCompare(right || "Unassigned", undefined, {
    sensitivity: "base",
  });

const getOrCreateRow = (
  rows: Map<string, SalesLocationBreakdownRow>,
  officeId: string | null,
  officeName: string | null,
) => {
  const key = buildOfficeKey(officeId, officeName);
  const existing = rows.get(key);
  if (existing) {
    return existing;
  }

  const created: SalesLocationBreakdownRow = {
    officeId,
    officeName,
    reportCount: 0,
    expenseCount: 0,
    foodSales: 0,
    liquorSales: 0,
    totalSales: 0,
    totalPayments: 0,
    balance: 0,
    totalExpenses: 0,
    cashExpenses: 0,
    debitCardExpenses: 0,
    checkExpenses: 0,
  };
  rows.set(key, created);
  return created;
};

export const buildSalesLocationBreakdown = (
  report: SalesReportResponseInput | null | undefined,
) => {
  if (!report) {
    return [];
  }

  const rows = new Map<string, SalesLocationBreakdownRow>();

  (report.reports || []).forEach((entry) => {
    const row = getOrCreateRow(rows, entry.officeId, entry.officeName);
    row.reportCount += 1;
    row.foodSales += entry.foodSales;
    row.liquorSales += entry.liquorSales;
    row.totalSales += entry.totalSales;
    row.totalPayments += entry.totalPayments;
    row.balance += entry.balance;
  });

  (report.expenses || []).forEach((entry) => {
    const row = getOrCreateRow(rows, entry.officeId, entry.officeName);
    row.expenseCount += 1;
    row.totalExpenses += entry.amount;
    if (entry.paymentMethod === "CASH") {
      row.cashExpenses += entry.amount;
    } else if (entry.paymentMethod === "DEBIT_CARD") {
      row.debitCardExpenses += entry.amount;
    } else if (entry.paymentMethod === "CHECK") {
      row.checkExpenses += entry.amount;
    }
  });

  return [...rows.values()]
    .map((row) => ({
      ...row,
      foodSales: toMoney(row.foodSales),
      liquorSales: toMoney(row.liquorSales),
      totalSales: toMoney(row.totalSales),
      totalPayments: toMoney(row.totalPayments),
      balance: toMoney(row.balance),
      totalExpenses: toMoney(row.totalExpenses),
      cashExpenses: toMoney(row.cashExpenses),
      debitCardExpenses: toMoney(row.debitCardExpenses),
      checkExpenses: toMoney(row.checkExpenses),
    }))
    .sort((left, right) =>
      compareOfficeNames(left.officeName, right.officeName),
    );
};
