import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ExpensePaymentMethod, PunchType, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import type { AuthUser } from '../auth/auth.types';

const WORKING_TYPES = new Set<PunchType>([PunchType.IN]);
const AUTO_SCHEDULE_OUT_TOKEN = '[AUTO_SCHEDULE_OUT]';
const MAX_RECEIPT_SIZE_BYTES = 6 * 1024 * 1024;
const ALLOWED_RECEIPT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

type HoursReportInput = {
  from: string;
  to: string;
  roundMinutes: number;
  tzOffset: number;
  employeeId?: string;
  officeId?: string;
  groupId?: string;
  includeDetails: boolean;
};

type DayHours = {
  date: string;
  minutes: number;
  hoursDecimal: number;
  hoursFormatted: string;
  firstIn?: string | null;
  lastOut?: string | null;
};

type DayTips = {
  date: string;
  cashTips: number;
  creditCardTips: number;
  totalTips: number;
};

type DailySalesReportRow = {
  id: string;
  date: string;
  foodSales: number;
  liquorSales: number;
  totalSales: number;
  cashPayments: number;
  bankDepositBatch: string;
  checkPayments: number;
  creditCardPayments: number;
  otherPayments: number;
  totalPayments: number;
  balance: number;
  notes: string;
  submittedBy: string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
};

type DailyExpenseRow = {
  id: string;
  date: string;
  companyName: string;
  paymentMethod: ExpensePaymentMethod;
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

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
  ) {}

  private scopedOfficeFilter(officeId?: string) {
    const scopedOfficeId = officeId?.trim() || undefined;
    if (!scopedOfficeId) {
      return {};
    }
    return {
      OR: [{ officeId: scopedOfficeId }, { officeId: null }],
    };
  }

  async getHoursReport(authUser: AuthUser, input: HoursReportInput) {
    await this.tenancy.requireFeature(authUser, 'reports');
    const context = await this.getPunchContext(authUser, input);
    if (!context.reportsEnabled) {
      throw new ForbiddenException('Reports are disabled.');
    }

    if (context.employees.length === 0) {
      return {
        range: { from: input.from, to: input.to },
        roundMinutes: input.roundMinutes,
        employees: [],
      };
    }

    const employeesReport = context.employees.map((employee) => {
      const { days, totalMinutes } = buildDailySummary({
        punches: context.punchesByEmployee.get(employee.id) || [],
        before: context.lastBeforeMap.get(employee.id),
        rangeStartUtc: context.rangeStartUtc,
        rangeEndUtc: context.rangeEndUtc,
        offsetMs: context.offsetMs,
        roundTo: input.roundMinutes,
      });

      return {
        id: employee.id,
        name: employee.displayName || employee.fullName,
        totalMinutes,
        totalHoursDecimal: toHoursDecimal(totalMinutes),
        totalHoursFormatted: formatHoursMinutes(totalMinutes),
        days,
      };
    });

    return {
      range: { from: input.from, to: input.to },
      roundMinutes: input.roundMinutes,
      employees: employeesReport,
    };
  }

  async getDailyReport(authUser: AuthUser, input: HoursReportInput) {
    await this.tenancy.requireFeature(authUser, 'reports');
    const context = await this.getPunchContext(authUser, input);
    if (!context.reportsEnabled) {
      throw new ForbiddenException('Reports are disabled.');
    }

    if (context.employees.length === 0) {
      return {
        range: { from: input.from, to: input.to },
        roundMinutes: input.roundMinutes,
        employees: [],
      };
    }

    const employeesReport = context.employees.map((employee) => {
      const { days, totalMinutes } = buildDailySummary({
        punches: context.punchesByEmployee.get(employee.id) || [],
        before: context.lastBeforeMap.get(employee.id),
        rangeStartUtc: context.rangeStartUtc,
        rangeEndUtc: context.rangeEndUtc,
        offsetMs: context.offsetMs,
        roundTo: input.roundMinutes,
        includeInOutTimes: true,
      });

      return {
        id: employee.id,
        name: employee.displayName || employee.fullName,
        totalMinutes,
        totalHoursDecimal: toHoursDecimal(totalMinutes),
        totalHoursFormatted: formatHoursMinutes(totalMinutes),
        days,
      };
    });

    return {
      range: { from: input.from, to: input.to },
      roundMinutes: input.roundMinutes,
      employees: employeesReport,
    };
  }

  async getPayrollReport(
    authUser: AuthUser,
    input: HoursReportInput & {
      weekStartsOn: number;
      overtimeThreshold: number;
    },
  ) {
    await this.tenancy.requireFeature(authUser, 'reports');
    const context = await this.getPunchContext(authUser, input);
    if (!context.reportsEnabled) {
      throw new ForbiddenException('Reports are disabled.');
    }

    if (context.employees.length === 0) {
      return {
        range: { from: input.from, to: input.to },
        roundMinutes: input.roundMinutes,
        weekStartsOn: input.weekStartsOn,
        overtimeThreshold: input.overtimeThreshold,
        employees: [],
      };
    }

    const employeesReport = context.employees.map((employee) => {
      const { days, totalMinutes } = buildDailySummary({
        punches: context.punchesByEmployee.get(employee.id) || [],
        before: context.lastBeforeMap.get(employee.id),
        rangeStartUtc: context.rangeStartUtc,
        rangeEndUtc: context.rangeEndUtc,
        offsetMs: context.offsetMs,
        roundTo: input.roundMinutes,
      });

      const weekMap = new Map<string, number>();
      for (const day of days) {
        const weekKey = getWeekStart(day.date, input.weekStartsOn);
        weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + day.minutes);
      }

      const hourlyRate = employee.hourlyRate ?? 0;
      const overtimeMultiplier = 1.5;

      const weeks = Array.from(weekMap.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([weekStart, minutes]) => {
          const thresholdMinutes = input.overtimeThreshold * 60;
          const regularMinutes = Math.min(minutes, thresholdMinutes);
          const overtimeMinutes = Math.max(0, minutes - thresholdMinutes);
          const regularPay = (regularMinutes / 60) * hourlyRate;
          const overtimePay =
            (overtimeMinutes / 60) * hourlyRate * overtimeMultiplier;
          const totalPay = regularPay + overtimePay;

          return {
            weekStart,
            totalMinutes: minutes,
            totalHoursFormatted: formatHoursMinutes(minutes),
            totalHoursDecimal: toHoursDecimal(minutes),
            regularMinutes,
            regularHoursFormatted: formatHoursMinutes(regularMinutes),
            overtimeMinutes,
            overtimeHoursFormatted: formatHoursMinutes(overtimeMinutes),
            regularPay,
            overtimePay,
            totalPay,
          };
        });

      const totalPay = weeks.reduce((sum, week) => sum + week.totalPay, 0);

      return {
        id: employee.id,
        name: employee.displayName || employee.fullName,
        hourlyRate,
        totalMinutes,
        totalHoursDecimal: toHoursDecimal(totalMinutes),
        totalHoursFormatted: formatHoursMinutes(totalMinutes),
        totalPay,
        weeks,
      };
    });

    return {
      range: { from: input.from, to: input.to },
      roundMinutes: input.roundMinutes,
      weekStartsOn: input.weekStartsOn,
      overtimeThreshold: input.overtimeThreshold,
      overtimeMultiplier: 1.5,
      employees: employeesReport,
    };
  }

  async getAuditReport(
    authUser: AuthUser,
    input: {
      from: string;
      to: string;
      tzOffset: number;
      employeeId?: string;
      officeId?: string;
      groupId?: string;
      type?: PunchType;
      limit?: number;
    },
  ) {
    await this.tenancy.requireFeature(authUser, 'reports');
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: tenant.id },
    });
    if (settings && settings.reportsEnabled === false) {
      throw new ForbiddenException('Reports are disabled.');
    }

    const offsetMs = (input.tzOffset || 0) * 60 * 1000;
    const rangeStartUtc =
      new Date(`${input.from}T00:00:00.000Z`).getTime() - offsetMs;
    const rangeEndUtc =
      new Date(`${input.to}T23:59:59.999Z`).getTime() - offsetMs;

    const punches = await this.prisma.employeePunch.findMany({
      where: {
        tenantId: tenant.id,
        employeeId: input.employeeId,
        type: input.type,
        occurredAt: {
          gte: new Date(rangeStartUtc),
          lte: new Date(rangeEndUtc),
        },
        employee: {
          ...this.scopedOfficeFilter(input.officeId),
          groupId: input.groupId,
        },
      },
      orderBy: { occurredAt: 'desc' },
      take: input.limit && input.limit > 0 ? input.limit : 200,
      include: {
        employee: {
          select: {
            fullName: true,
            displayName: true,
            office: { select: { name: true } },
            group: { select: { name: true } },
          },
        },
      },
    });

    return {
      records: punches.map((punch) => ({
        id: punch.id,
        employeeName: punch.employee.displayName || punch.employee.fullName,
        office: punch.employee.office?.name ?? null,
        group: punch.employee.group?.name ?? null,
        type: punch.type,
        occurredAt: punch.occurredAt.toISOString(),
        notes: punch.notes ?? '',
      })),
    };
  }

  async getTipsReport(
    authUser: AuthUser,
    input: {
      from: string;
      to: string;
      employeeId?: string;
      officeId?: string;
      groupId?: string;
    },
  ) {
    await this.tenancy.requireFeature(authUser, 'reports');
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: tenant.id },
    });
    if (settings && settings.reportsEnabled === false) {
      throw new ForbiddenException('Reports are disabled.');
    }

    const fromUtc = new Date(`${input.from}T00:00:00.000Z`);
    const toUtc = new Date(`${input.to}T00:00:00.000Z`);

    const employees = await this.prisma.employee.findMany({
      where: {
        tenantId: tenant.id,
        id: input.employeeId,
        ...this.scopedOfficeFilter(input.officeId),
        groupId: input.groupId,
        isServer: true,
      },
      orderBy: { fullName: 'asc' },
      select: {
        id: true,
        fullName: true,
        displayName: true,
      },
    });

    if (!employees.length) {
      return {
        range: { from: input.from, to: input.to },
        employees: [],
      };
    }

    const tips = await this.prisma.employeeTip.findMany({
      where: {
        tenantId: tenant.id,
        employeeId: { in: employees.map((employee) => employee.id) },
        workDate: {
          gte: fromUtc,
          lte: toUtc,
        },
      },
      orderBy: [{ employeeId: 'asc' }, { workDate: 'asc' }],
    });

    const tipsByEmployee = new Map<string, typeof tips>();
    for (const tip of tips) {
      const list = tipsByEmployee.get(tip.employeeId) || [];
      list.push(tip);
      tipsByEmployee.set(tip.employeeId, list);
    }

    return {
      range: { from: input.from, to: input.to },
      employees: employees.map((employee) => {
        const rows = (tipsByEmployee.get(employee.id) || []).map((tip) => {
          const cashTips = Number(tip.cashTips.toFixed(2));
          const creditCardTips = Number(tip.creditCardTips.toFixed(2));
          return {
            date: tip.workDate.toISOString().slice(0, 10),
            cashTips,
            creditCardTips,
            totalTips: Number((cashTips + creditCardTips).toFixed(2)),
          } satisfies DayTips;
        });

        const totals = rows.reduce(
          (acc, row) => {
            acc.cashTips += row.cashTips;
            acc.creditCardTips += row.creditCardTips;
            return acc;
          },
          { cashTips: 0, creditCardTips: 0 },
        );

        return {
          id: employee.id,
          name: employee.displayName || employee.fullName,
          totalCashTips: Number(totals.cashTips.toFixed(2)),
          totalCreditCardTips: Number(totals.creditCardTips.toFixed(2)),
          totalTips: Number(
            (totals.cashTips + totals.creditCardTips).toFixed(2),
          ),
          days: rows,
        };
      }),
    };
  }

  async getSalesReport(
    authUser: AuthUser,
    input: {
      from: string;
      to: string;
    },
  ) {
    await this.tenancy.requireAnyFeature(authUser, ['reports', 'salesCapture']);
    const { tenant } = await this.requireDailySalesReporting(authUser);
    const fromUtc = parseIsoDateOnly(input.from, 'from');
    const toUtc = parseIsoDateOnly(input.to, 'to');
    if (fromUtc.getTime() > toUtc.getTime()) {
      throw new BadRequestException('from must be less than or equal to to.');
    }
    const toExclusiveUtc = new Date(toUtc);
    toExclusiveUtc.setUTCDate(toExclusiveUtc.getUTCDate() + 1);

    const reports = await this.prisma.dailySalesReport.findMany({
      where: {
        tenantId: tenant.id,
        reportDate: {
          gte: fromUtc,
          lt: toExclusiveUtc,
        },
      },
      orderBy: { reportDate: 'desc' },
      include: {
        submittedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    const expenses = await this.prisma.dailyExpense.findMany({
      where: {
        tenantId: tenant.id,
        expenseDate: {
          gte: fromUtc,
          lt: toExclusiveUtc,
        },
      },
      orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        expenseDate: true,
        companyName: true,
        paymentMethod: true,
        invoiceNumber: true,
        amount: true,
        checkNumber: true,
        payToCompany: true,
        notes: true,
        receiptUploadedAt: true,
        createdAt: true,
        updatedAt: true,
        submittedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    const rows = reports.map((report) => this.toDailySalesReportRow(report));
    const expenseRows = expenses.map((expense) =>
      this.toDailyExpenseRow(expense),
    );
    const totals = rows.reduce(
      (acc, row) => {
        acc.foodSales += row.foodSales;
        acc.liquorSales += row.liquorSales;
        acc.totalSales += row.totalSales;
        acc.cashPayments += row.cashPayments;
        acc.checkPayments += row.checkPayments;
        acc.creditCardPayments += row.creditCardPayments;
        acc.otherPayments += row.otherPayments;
        acc.totalPayments += row.totalPayments;
        return acc;
      },
      {
        foodSales: 0,
        liquorSales: 0,
        totalSales: 0,
        cashPayments: 0,
        checkPayments: 0,
        creditCardPayments: 0,
        otherPayments: 0,
        totalPayments: 0,
      },
    );

    const expenseTotals = expenseRows.reduce(
      (acc, row) => {
        acc.totalExpenses += row.amount;
        if (row.paymentMethod === ExpensePaymentMethod.CASH) {
          acc.cashExpenses += row.amount;
        } else if (row.paymentMethod === ExpensePaymentMethod.DEBIT_CARD) {
          acc.debitCardExpenses += row.amount;
        } else if (row.paymentMethod === ExpensePaymentMethod.CHECK) {
          acc.checkExpenses += row.amount;
        }
        return acc;
      },
      {
        totalExpenses: 0,
        cashExpenses: 0,
        debitCardExpenses: 0,
        checkExpenses: 0,
      },
    );

    const totalSales = toMoney(totals.totalSales);
    const totalPayments = toMoney(totals.totalPayments);

    return {
      range: { from: input.from, to: input.to },
      totals: {
        foodSales: toMoney(totals.foodSales),
        liquorSales: toMoney(totals.liquorSales),
        totalSales,
        cashPayments: toMoney(totals.cashPayments),
        checkPayments: toMoney(totals.checkPayments),
        creditCardPayments: toMoney(totals.creditCardPayments),
        otherPayments: toMoney(totals.otherPayments),
        totalPayments,
        balance: toMoney(totalSales - totalPayments),
      },
      reports: rows,
      expenseTotals: {
        totalExpenses: toMoney(expenseTotals.totalExpenses),
        cashExpenses: toMoney(expenseTotals.cashExpenses),
        debitCardExpenses: toMoney(expenseTotals.debitCardExpenses),
        checkExpenses: toMoney(expenseTotals.checkExpenses),
      },
      expenses: expenseRows,
    };
  }

  async upsertDailySalesReport(
    authUser: AuthUser,
    input: {
      date: string;
      foodSales: number;
      liquorSales: number;
      cashPayments: number;
      bankDepositBatch?: string;
      checkPayments: number;
      creditCardPayments: number;
      otherPayments: number;
      notes?: string;
    },
  ) {
    await this.tenancy.requireFeature(authUser, 'salesCapture');
    const { tenant, user, membership, settings } =
      await this.requireDailySalesReporting(authUser);
    const reportDate = parseIsoDateOnly(input.date, 'date');
    const reportDateKey = reportDate.toISOString().slice(0, 10);
    const todayKey = getDateKeyInTimeZone(new Date(), settings.timezone);
    const hasOverridePermission = this.canOverrideDailySalesDateLock(
      membership.role,
    );

    if (reportDateKey !== todayKey && !hasOverridePermission) {
      throw new ForbiddenException(
        `Daily sales reports are locked to today's date (${todayKey}). Ask an admin to authorize modifications for other dates.`,
      );
    }

    const row = await this.prisma.dailySalesReport.upsert({
      where: {
        tenantId_reportDate: {
          tenantId: tenant.id,
          reportDate,
        },
      },
      update: {
        foodSales: input.foodSales,
        liquorSales: input.liquorSales,
        cashPayments: input.cashPayments,
        bankDepositBatch: input.bankDepositBatch?.trim().slice(0, 80) || null,
        checkPayments: input.checkPayments,
        creditCardPayments: input.creditCardPayments,
        otherPayments: input.otherPayments,
        notes: input.notes || null,
        submittedByUserId: user.id,
      },
      create: {
        tenantId: tenant.id,
        reportDate,
        foodSales: input.foodSales,
        liquorSales: input.liquorSales,
        cashPayments: input.cashPayments,
        bankDepositBatch: input.bankDepositBatch?.trim().slice(0, 80) || null,
        checkPayments: input.checkPayments,
        creditCardPayments: input.creditCardPayments,
        otherPayments: input.otherPayments,
        notes: input.notes || null,
        submittedByUserId: user.id,
      },
      include: {
        submittedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    const report = this.toDailySalesReportRow(row);

    return {
      ok: true,
      report,
    };
  }

  async createDailyExpense(
    authUser: AuthUser,
    input: {
      date: string;
      companyName: string;
      paymentMethod: ExpensePaymentMethod;
      amount: number;
      invoiceNumber: string;
      checkNumber?: string;
      payToCompany?: string;
      notes?: string;
    },
  ) {
    await this.tenancy.requireFeature(authUser, 'salesCapture');
    const { tenant, user } = await this.requireDailySalesReporting(authUser);
    const expenseDate = parseIsoDateOnly(input.date, 'date');

    const companyName = input.companyName.trim();
    if (!companyName) {
      throw new BadRequestException('companyName is required.');
    }

    const invoiceNumber = input.invoiceNumber.trim();
    if (!invoiceNumber) {
      throw new BadRequestException('invoiceNumber is required.');
    }

    if (!Number.isFinite(input.amount) || input.amount < 0) {
      throw new BadRequestException('amount must be a non-negative number.');
    }

    const checkNumber = input.checkNumber?.trim() || '';
    const payToCompany = input.payToCompany?.trim() || '';

    if (input.paymentMethod === ExpensePaymentMethod.CHECK) {
      if (!checkNumber) {
        throw new BadRequestException(
          'checkNumber is required when payment method is CHECK.',
        );
      }
      if (!payToCompany) {
        throw new BadRequestException(
          'payToCompany is required when payment method is CHECK.',
        );
      }
    }

    const row = await this.prisma.dailyExpense.create({
      data: {
        tenantId: tenant.id,
        expenseDate,
        companyName: companyName.slice(0, 160),
        paymentMethod: input.paymentMethod,
        amount: toMoney(input.amount),
        invoiceNumber: invoiceNumber.slice(0, 80),
        checkNumber:
          input.paymentMethod === ExpensePaymentMethod.CHECK
            ? checkNumber.slice(0, 40)
            : null,
        payToCompany:
          input.paymentMethod === ExpensePaymentMethod.CHECK
            ? payToCompany.slice(0, 160)
            : null,
        notes: input.notes?.trim().slice(0, 500) || null,
        submittedByUserId: user.id,
      },
      select: {
        id: true,
        expenseDate: true,
        companyName: true,
        paymentMethod: true,
        invoiceNumber: true,
        amount: true,
        checkNumber: true,
        payToCompany: true,
        notes: true,
        receiptUploadedAt: true,
        createdAt: true,
        updatedAt: true,
        submittedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      ok: true,
      expense: this.toDailyExpenseRow(row),
    };
  }

  async uploadDailyExpenseReceipt(
    authUser: AuthUser,
    expenseId: string,
    input: {
      fileName: string;
      mimeType: string;
      size: number;
      buffer: Buffer;
    },
  ) {
    await this.tenancy.requireFeature(authUser, 'salesCapture');
    const { tenant } = await this.requireDailySalesReporting(authUser);
    const trimmedExpenseId = expenseId.trim();
    if (!trimmedExpenseId) {
      throw new BadRequestException('expenseId is required.');
    }

    if (!input.buffer || input.buffer.length === 0) {
      throw new BadRequestException('Receipt file is required.');
    }

    if (input.size > MAX_RECEIPT_SIZE_BYTES) {
      throw new PayloadTooLargeException(
        'Receipt file is too large. Max size is 6 MB.',
      );
    }

    const mimeType = input.mimeType.trim().toLowerCase();
    if (!ALLOWED_RECEIPT_MIME_TYPES.has(mimeType)) {
      throw new UnsupportedMediaTypeException(
        'Unsupported file type. Allowed types: JPG, PNG, WEBP, PDF.',
      );
    }

    const existing = await this.prisma.dailyExpense.findFirst({
      where: {
        id: trimmedExpenseId,
        tenantId: tenant.id,
      },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Expense not found.');
    }

    const row = await this.prisma.dailyExpense.update({
      where: { id: existing.id },
      data: {
        receiptData: input.buffer,
        receiptMimeType: mimeType.slice(0, 120),
        receiptFileName: (input.fileName || 'receipt').trim().slice(0, 180),
        receiptUploadedAt: new Date(),
      },
      select: {
        id: true,
        expenseDate: true,
        companyName: true,
        paymentMethod: true,
        invoiceNumber: true,
        amount: true,
        checkNumber: true,
        payToCompany: true,
        notes: true,
        receiptUploadedAt: true,
        createdAt: true,
        updatedAt: true,
        submittedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      ok: true,
      expense: this.toDailyExpenseRow(row),
    };
  }

  async getDailyExpenseReceipt(authUser: AuthUser, expenseId: string) {
    await this.tenancy.requireFeature(authUser, 'salesCapture');
    const { tenant } = await this.requireDailySalesReporting(authUser);
    const trimmedExpenseId = expenseId.trim();
    if (!trimmedExpenseId) {
      throw new BadRequestException('expenseId is required.');
    }

    const expense = await this.prisma.dailyExpense.findFirst({
      where: {
        id: trimmedExpenseId,
        tenantId: tenant.id,
      },
      select: {
        id: true,
        expenseDate: true,
        receiptData: true,
        receiptMimeType: true,
        receiptFileName: true,
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found.');
    }

    if (!expense.receiptData || !expense.receiptMimeType) {
      throw new NotFoundException('Receipt not found for this expense.');
    }

    const fallbackName = `expense-${expense.expenseDate
      .toISOString()
      .slice(0, 10)}.${extensionFromMimeType(expense.receiptMimeType)}`;

    return {
      mimeType: expense.receiptMimeType,
      fileName: expense.receiptFileName?.trim() || fallbackName,
      data: expense.receiptData,
    };
  }

  private async requireDailySalesReporting(authUser: AuthUser) {
    const context = await this.tenancy.requireTenantAndUser(authUser);
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: context.tenant.id },
      select: {
        reportsEnabled: true,
        dailySalesReportingEnabled: true,
        timezone: true,
      },
    });

    if (settings?.reportsEnabled === false) {
      throw new ForbiddenException('Reports are disabled.');
    }

    if (!(settings?.dailySalesReportingEnabled ?? false)) {
      throw new ForbiddenException(
        'Daily sales reporting is disabled for this tenant.',
      );
    }

    return {
      ...context,
      settings: {
        reportsEnabled: settings?.reportsEnabled ?? true,
        dailySalesReportingEnabled:
          settings?.dailySalesReportingEnabled ?? false,
        timezone: settings?.timezone || 'America/New_York',
      },
    };
  }

  private canOverrideDailySalesDateLock(role: Role) {
    return role === Role.OWNER || role === Role.ADMIN;
  }

  private toDailySalesReportRow(report: {
    id: string;
    reportDate: Date;
    foodSales: number;
    liquorSales: number;
    cashPayments: number;
    bankDepositBatch: string | null;
    checkPayments: number;
    creditCardPayments: number;
    otherPayments: number;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    submittedBy: { name: string | null; email: string } | null;
  }): DailySalesReportRow {
    const foodSales = toMoney(report.foodSales);
    const liquorSales = toMoney(report.liquorSales);
    const cashPayments = toMoney(report.cashPayments);
    const checkPayments = toMoney(report.checkPayments);
    const creditCardPayments = toMoney(report.creditCardPayments);
    const otherPayments = toMoney(report.otherPayments);
    const totalSales = toMoney(foodSales + liquorSales);
    const totalPayments = toMoney(
      cashPayments + checkPayments + creditCardPayments + otherPayments,
    );

    return {
      id: report.id,
      date: report.reportDate.toISOString().slice(0, 10),
      foodSales,
      liquorSales,
      totalSales,
      cashPayments,
      bankDepositBatch: report.bankDepositBatch || '',
      checkPayments,
      creditCardPayments,
      otherPayments,
      totalPayments,
      balance: toMoney(totalSales - totalPayments),
      notes: report.notes || '',
      submittedBy:
        report.submittedBy?.name || report.submittedBy?.email || null,
      submittedAt: report.updatedAt.toISOString(),
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
    };
  }

  private toDailyExpenseRow(expense: {
    id: string;
    expenseDate: Date;
    companyName: string;
    paymentMethod: ExpensePaymentMethod;
    invoiceNumber: string;
    amount: number;
    checkNumber: string | null;
    payToCompany: string | null;
    notes: string | null;
    receiptUploadedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    submittedBy: { name: string | null; email: string } | null;
  }): DailyExpenseRow {
    return {
      id: expense.id,
      date: expense.expenseDate.toISOString().slice(0, 10),
      companyName: expense.companyName,
      paymentMethod: expense.paymentMethod,
      invoiceNumber: expense.invoiceNumber,
      amount: toMoney(expense.amount),
      checkNumber: expense.checkNumber || null,
      payToCompany: expense.payToCompany || null,
      hasReceipt: Boolean(expense.receiptUploadedAt),
      notes: expense.notes || '',
      submittedBy:
        expense.submittedBy?.name || expense.submittedBy?.email || null,
      submittedAt: expense.updatedAt.toISOString(),
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    };
  }

  private async getPunchContext(
    authUser: AuthUser,
    input: {
      from: string;
      to: string;
      tzOffset: number;
      employeeId?: string;
      officeId?: string;
      groupId?: string;
    },
  ) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: tenant.id },
    });

    const offsetMs = (input.tzOffset || 0) * 60 * 1000;
    const rangeStartUtc =
      new Date(`${input.from}T00:00:00.000Z`).getTime() - offsetMs;
    const rangeEndUtc =
      new Date(`${input.to}T23:59:59.999Z`).getTime() - offsetMs;

    const employees = await this.prisma.employee.findMany({
      where: {
        tenantId: tenant.id,
        id: input.employeeId,
        ...this.scopedOfficeFilter(input.officeId),
        groupId: input.groupId,
      },
      orderBy: { fullName: 'asc' },
    });

    if (employees.length === 0) {
      return {
        tenant,
        employees,
        punchesByEmployee: new Map(),
        lastBeforeMap: new Map(),
        offsetMs,
        rangeStartUtc,
        rangeEndUtc,
        reportsEnabled: settings?.reportsEnabled ?? true,
      };
    }

    const employeeIds = employees.map((employee) => employee.id);
    const rangeStartDate = new Date(rangeStartUtc);
    const rangeEndDate = new Date(rangeEndUtc);

    const punchesInRange = await this.prisma.employeePunch.findMany({
      where: {
        tenantId: tenant.id,
        employeeId: { in: employeeIds },
        occurredAt: { gte: rangeStartDate, lte: rangeEndDate },
      },
      orderBy: { occurredAt: 'asc' },
    });

    const lastBeforeRange = await this.prisma.employeePunch.findMany({
      where: {
        tenantId: tenant.id,
        employeeId: { in: employeeIds },
        occurredAt: { lt: rangeStartDate },
      },
      orderBy: { occurredAt: 'desc' },
      distinct: ['employeeId'],
    });

    const lastBeforeMap = new Map(
      lastBeforeRange.map((punch) => [punch.employeeId, punch]),
    );

    const punchesByEmployee = new Map<string, typeof punchesInRange>();
    for (const punch of punchesInRange) {
      const list = punchesByEmployee.get(punch.employeeId) || [];
      list.push(punch);
      punchesByEmployee.set(punch.employeeId, list);
    }

    return {
      tenant,
      employees,
      punchesByEmployee,
      lastBeforeMap,
      offsetMs,
      rangeStartUtc,
      rangeEndUtc,
      reportsEnabled: settings?.reportsEnabled ?? true,
    };
  }
}

function getDateKeyInTimeZone(date: Date, timeZone: string) {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;
    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch {
    // Fall through to UTC fallback.
  }
  return date.toISOString().slice(0, 10);
}

function extensionFromMimeType(mimeType: string) {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'application/pdf':
      return 'pdf';
    default:
      return 'bin';
  }
}

function dayKeyFromUtc(timestamp: number, offsetMs: number) {
  const local = new Date(timestamp + offsetMs);
  return local.toISOString().slice(0, 10);
}

function nextDayStartUtc(timestamp: number, offsetMs: number) {
  const dayKey = dayKeyFromUtc(timestamp, offsetMs);
  const dayStartUtc = new Date(`${dayKey}T00:00:00.000Z`).getTime() - offsetMs;
  return dayStartUtc + 24 * 60 * 60 * 1000;
}

function roundMinutes(minutes: number, roundTo: number) {
  if (!roundTo) {
    return Math.round(minutes * 100) / 100;
  }
  return Math.round(minutes / roundTo) * roundTo;
}

function toMoney(value: number) {
  return Number(value.toFixed(2));
}

function parseIsoDateOnly(raw: string, field: string) {
  const value = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException(`${field} must be in YYYY-MM-DD format.`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new BadRequestException(`${field} is not a valid date.`);
  }
  return parsed;
}

function toHoursDecimal(minutes: number) {
  return Number((minutes / 60).toFixed(2));
}

function formatHoursMinutes(minutes: number) {
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const mins = Math.abs(rounded % 60);
  return `${hours}:${String(mins).padStart(2, '0')}`;
}

function buildDailySummary({
  punches,
  before,
  rangeStartUtc,
  rangeEndUtc,
  offsetMs,
  roundTo,
  includeInOutTimes,
}: {
  punches: Array<{ occurredAt: Date; type: PunchType; notes?: string | null }>;
  before?: { type: PunchType } | null;
  rangeStartUtc: number;
  rangeEndUtc: number;
  offsetMs: number;
  roundTo: number;
  includeInOutTimes?: boolean;
}) {
  const intervals: Array<{ start: number; end: number }> = [];
  let currentStart: number | null = null;

  if (before && WORKING_TYPES.has(before.type)) {
    currentStart = rangeStartUtc;
  }

  for (const punch of punches) {
    const timestamp = punch.occurredAt.getTime();
    const isWorking = WORKING_TYPES.has(punch.type);

    if (isWorking) {
      if (currentStart === null) {
        currentStart = timestamp;
      }
    } else if (currentStart !== null) {
      if (timestamp > currentStart) {
        intervals.push({ start: currentStart, end: timestamp });
      }
      currentStart = null;
    }
  }

  if (currentStart !== null && rangeEndUtc > currentStart) {
    intervals.push({ start: currentStart, end: rangeEndUtc });
  }

  const minutesByDay = new Map<string, number>();
  const penaltyByDay = new Map<string, number>();

  for (const interval of intervals) {
    let cursor = interval.start;
    while (cursor < interval.end) {
      const dayKey = dayKeyFromUtc(cursor, offsetMs);
      const dayEndUtc = nextDayStartUtc(cursor, offsetMs);
      const segmentEnd = Math.min(interval.end, dayEndUtc);
      const minutes = (segmentEnd - cursor) / 60000;
      minutesByDay.set(dayKey, (minutesByDay.get(dayKey) || 0) + minutes);
      cursor = segmentEnd;
    }
  }

  const punchesByDay = new Map<string, typeof punches>();
  for (const punch of punches) {
    const dayKey = dayKeyFromUtc(punch.occurredAt.getTime(), offsetMs);
    const list = punchesByDay.get(dayKey) || [];
    list.push(punch);
    punchesByDay.set(dayKey, list);

    if (punch.type !== PunchType.OUT || !punch.notes) {
      continue;
    }
    if (!punch.notes.includes(AUTO_SCHEDULE_OUT_TOKEN)) {
      continue;
    }
    const penaltyMatch = /\[PENALTY_MINUTES:(\d+)\]/i.exec(punch.notes);
    if (!penaltyMatch) {
      continue;
    }
    const penaltyMinutes = Number(penaltyMatch[1] || '0');
    if (!Number.isFinite(penaltyMinutes) || penaltyMinutes <= 0) {
      continue;
    }
    penaltyByDay.set(dayKey, (penaltyByDay.get(dayKey) || 0) + penaltyMinutes);
  }

  const dayKeys = new Set<string>();
  minutesByDay.forEach((_value, key) => dayKeys.add(key));
  punchesByDay.forEach((_value, key) => dayKeys.add(key));

  const days: DayHours[] = Array.from(dayKeys)
    .sort()
    .map((date) => {
      const minutes = minutesByDay.get(date) || 0;
      const penaltyMinutes = penaltyByDay.get(date) || 0;
      const adjustedMinutes = Math.max(0, minutes - penaltyMinutes);
      const roundedMinutes = roundMinutes(adjustedMinutes, roundTo);

      let firstIn: string | null = null;
      let lastOut: string | null = null;

      if (includeInOutTimes) {
        const dayPunches = punchesByDay.get(date) || [];
        const firstInPunch = dayPunches.find(
          (punch) => punch.type === PunchType.IN,
        );
        const lastOutPunch = [...dayPunches]
          .reverse()
          .find((punch) => punch.type !== PunchType.IN);

        firstIn = firstInPunch?.occurredAt.toISOString() ?? null;
        lastOut = lastOutPunch?.occurredAt.toISOString() ?? null;
      }

      return {
        date,
        minutes: roundedMinutes,
        hoursDecimal: toHoursDecimal(roundedMinutes),
        hoursFormatted: formatHoursMinutes(roundedMinutes),
        firstIn,
        lastOut,
      };
    });

  const totalMinutes = days.reduce((sum, day) => sum + day.minutes, 0);

  return { days, totalMinutes };
}

function getWeekStart(dateKey: string, weekStartsOn: number) {
  const start = Number.isFinite(weekStartsOn) ? weekStartsOn : 1;
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  const day = date.getUTCDay();
  const diff = (day - start + 7) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  return date.toISOString().slice(0, 10);
}
