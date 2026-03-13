import { Injectable } from '@nestjs/common';
import type { ExpensePaymentMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/auth.types';
import { ReportsService } from '../reports/reports.service';
import { EmployeeSchedulesService } from '../employee-schedules/employee-schedules.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { managerFeaturesToMap } from '../tenancy/manager-features';
import type {
  RestaurantPosCreatePayoutInput,
  RestaurantPosPayrollQuery,
  RestaurantPosScopedRangeQuery,
  RestaurantPosTodaySchedulesQuery,
} from './restaurant-pos-integration.query';

@Injectable()
export class RestaurantPosIntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly reports: ReportsService,
    private readonly schedules: EmployeeSchedulesService,
  ) {}

  private normalizePayout(expense: {
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
  }) {
    return {
      payoutId: expense.id,
      expenseId: expense.id,
      date: expense.date,
      vendor: expense.companyName,
      companyName: expense.companyName,
      paymentMethod: expense.paymentMethod,
      invoiceNumber: expense.invoiceNumber,
      amount: expense.amount,
      checkNumber: expense.checkNumber,
      payToCompany: expense.payToCompany,
      hasReceipt: expense.hasReceipt,
      notes: expense.notes,
      submittedBy: expense.submittedBy,
      submittedAt: expense.submittedAt,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    };
  }

  async getConnection(authUser: AuthUser, officeId?: string) {
    const access = await this.tenancy.resolveAdminAccess(authUser);
    const officeScope = this.tenancy.resolveOfficeScope(access, officeId);
    const offices = await this.prisma.office.findMany({
      where: {
        tenantId: access.tenant.id,
        ...(access.allowedOfficeId ? { id: access.allowedOfficeId } : {}),
      },
      orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        geofenceRadiusMeters: true,
      },
    });

    const reportsEnabled = access.featurePermissions.includes('reports');
    const salesCaptureEnabled = access.featurePermissions.includes('salesCapture');
    const schedulesEnabled = access.featurePermissions.includes('schedules');

    return {
      provider: 'clockin' as const,
      configured: true,
      tenant: {
        id: access.tenant.id,
        name: access.tenant.name,
        slug: access.tenant.slug,
        tenantExternalId: access.tenant.authOrgId,
      },
      actor: {
        actorType: access.actorType,
        displayName: access.displayName,
        membershipRole: access.membership.role,
        authUserId: access.user.authUserId,
        userId: access.user.id,
        allowedOfficeId: access.allowedOfficeId,
      },
      settings: {
        websysPosEnabled: access.settings.websysPosEnabled,
        multiLocationEnabled: access.settings.multiLocationEnabled,
        companyOrdersEnabled: access.settings.companyOrdersEnabled,
        liquorInventoryEnabled: access.settings.liquorInventoryEnabled,
        premiumFeaturesEnabled: access.settings.premiumFeaturesEnabled,
      },
      capabilities: {
        scheduleManagement: schedulesEnabled,
        hoursReporting: reportsEnabled,
        payrollReporting: reportsEnabled,
        tipReporting: reportsEnabled,
        payoutReporting: reportsEnabled || salesCaptureEnabled,
        payoutWriteback: salesCaptureEnabled,
      },
      resolvedScope: {
        requestedOfficeId: officeId?.trim() || null,
        officeId: officeScope.officeId || null,
        expensesScope: 'tenant' as const,
      },
      permissions: managerFeaturesToMap(access.featurePermissions),
      offices: offices.map((entry) => ({
        id: entry.id,
        name: entry.name,
        latitude: entry.latitude,
        longitude: entry.longitude,
        geofenceRadiusMeters: entry.geofenceRadiusMeters,
      })),
      integrationNotes: [
        'Use tenantExternalId as the tenant identifier; do not send the display name.',
        'Owner-created Websys POS tenants keep reports and daily sales reporting enabled by default.',
        'Hours, payroll, tips, and schedules can be office-filtered when an officeId is provided.',
        'Payouts/daily expenses are tenant-wide and ignore office filtering.',
      ],
    };
  }

  async getHoursReport(authUser: AuthUser, query: RestaurantPosScopedRangeQuery) {
    const payload = await this.reports.getHoursReport(authUser, {
      ...query,
      includeDetails: false,
    });

    const employees = payload.employees.map((employee) => ({
      employeeId: employee.id,
      name: employee.name,
      totalMinutes: employee.totalMinutes,
      totalHoursDecimal: employee.totalHoursDecimal,
      totalHoursFormatted: employee.totalHoursFormatted,
      shifts: Array.isArray(employee.days) ? employee.days.length : 0,
      days: employee.days,
    }));

    return {
      provider: 'clockin' as const,
      range: payload.range,
      roundMinutes: payload.roundMinutes,
      employees,
    };
  }

  async getPayrollReport(authUser: AuthUser, query: RestaurantPosPayrollQuery) {
    const payload = await this.reports.getPayrollReport(authUser, {
      ...query,
      includeDetails: false,
    });
    const employees = payload.employees.map((employee) => ({
      employeeId: employee.id,
      name: employee.name,
      hourlyRate: employee.hourlyRate,
      totalMinutes: employee.totalMinutes,
      totalHoursDecimal: employee.totalHoursDecimal,
      totalHoursFormatted: employee.totalHoursFormatted,
      totalPay: employee.totalPay,
      weeks: employee.weeks,
    }));

    return {
      provider: 'clockin' as const,
      range: payload.range,
      roundMinutes: payload.roundMinutes,
      weekStartsOn: payload.weekStartsOn,
      overtimeThreshold: payload.overtimeThreshold,
      overtimeMultiplier: payload.overtimeMultiplier,
      totals: {
        totalHoursDecimal: Number(
          employees
            .reduce((sum, employee) => sum + employee.totalHoursDecimal, 0)
            .toFixed(2),
        ),
        totalPay: Number(
          employees.reduce((sum, employee) => sum + employee.totalPay, 0).toFixed(2),
        ),
      },
      employees,
    };
  }

  async getTipsReport(
    authUser: AuthUser,
    query: Pick<RestaurantPosScopedRangeQuery, 'from' | 'to' | 'employeeId' | 'officeId' | 'groupId'>,
  ) {
    const payload = await this.reports.getTipsReport(authUser, query);
    const employees = payload.employees.map((employee) => ({
      employeeId: employee.id,
      name: employee.name,
      cashTips: employee.totalCashTips,
      creditCardTips: employee.totalCreditCardTips,
      totalTips: employee.totalTips,
      days: employee.days,
    }));

    return {
      provider: 'clockin' as const,
      range: payload.range,
      totals: {
        cashTips: Number(
          employees.reduce((sum, employee) => sum + employee.cashTips, 0).toFixed(2),
        ),
        creditCardTips: Number(
          employees
            .reduce((sum, employee) => sum + employee.creditCardTips, 0)
            .toFixed(2),
        ),
        totalTips: Number(
          employees.reduce((sum, employee) => sum + employee.totalTips, 0).toFixed(2),
        ),
      },
      employees,
    };
  }

  async getTodaySchedules(
    authUser: AuthUser,
    query: RestaurantPosTodaySchedulesQuery,
  ) {
    const payload = await this.schedules.getTodaySchedule(authUser, query);
    return {
      provider: 'clockin' as const,
      editable: true,
      date: payload.date,
      weekday: payload.weekday,
      weekdayLabel: payload.weekdayLabel,
      timezone: payload.timezone,
      rows: payload.rows,
    };
  }

  async getEmployeeSchedule(authUser: AuthUser, employeeId: string) {
    const payload = await this.schedules.getSchedule(authUser, employeeId);
    return {
      provider: 'clockin' as const,
      editable: true,
      ...payload,
    };
  }

  async updateEmployeeSchedule(
    authUser: AuthUser,
    employeeId: string,
    dto: Parameters<EmployeeSchedulesService['updateSchedule']>[2],
  ) {
    const payload = await this.schedules.updateSchedule(authUser, employeeId, dto);
    return {
      provider: 'clockin' as const,
      editable: true,
      ...payload,
    };
  }

  async getPayouts(
    authUser: AuthUser,
    query: {
      from: string;
      to: string;
    },
  ) {
    const payload = await this.reports.getSalesReport(authUser, query);
    const payouts = payload.expenses.map((expense) => this.normalizePayout(expense));

    return {
      provider: 'clockin' as const,
      range: payload.range,
      scope: 'tenant' as const,
      totals: payload.expenseTotals,
      payouts,
      expenses: payouts,
    };
  }

  async createPayout(authUser: AuthUser, input: RestaurantPosCreatePayoutInput) {
    const payload = await this.reports.createDailyExpense(authUser, input);
    const payout = this.normalizePayout(payload.expense);

    return {
      provider: 'clockin' as const,
      ok: payload.ok,
      payout,
      expense: payout,
    };
  }
}
