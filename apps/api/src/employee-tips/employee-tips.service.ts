import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import type { AuthUser } from '../auth/auth.types';
import type { SubmitEmployeeTipDto } from './dto/submit-employee-tip.dto';
import { NotificationsService } from '../notifications/notifications.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const TIP_EDIT_WINDOW_DAYS = 7;

const toCurrency = (value: number) => Number(value.toFixed(2));

@Injectable()
export class EmployeeTipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly notifications: NotificationsService,
  ) {}

  async submitTip(
    authUser: AuthUser,
    employeeId: string,
    dto: SubmitEmployeeTipDto,
  ) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: tenant.id },
      select: { timezone: true },
    });
    const timeZone = settings?.timezone || 'UTC';

    const employee = await this.prisma.employee.findFirst({
      where: { tenantId: tenant.id, id: employeeId, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        displayName: true,
        isServer: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found.');
    }
    if (!employee.isServer) {
      throw new ForbiddenException(
        'Tips can only be submitted for server users.',
      );
    }

    const workDateKey =
      dto.workDate || this.toLocalDateKey(new Date(), timeZone);
    const workDateUtc = this.dateKeyToUtc(workDateKey);

    this.assertWithinEditWindow(workDateUtc, timeZone);

    const cashTips = toCurrency(dto.cashTips);
    const creditCardTips = toCurrency(dto.creditCardTips);

    const existingTip = await this.prisma.employeeTip.findUnique({
      where: {
        tenantId_employeeId_workDate: {
          tenantId: tenant.id,
          employeeId: employee.id,
          workDate: workDateUtc,
        },
      },
      select: { id: true },
    });
    if (existingTip) {
      throw new ForbiddenException('Tips already submitted for this work date.');
    }

    const tip = await this.prisma.employeeTip.create({
      data: {
        tenantId: tenant.id,
        employeeId: employee.id,
        workDate: workDateUtc,
        cashTips,
        creditCardTips,
      },
    });

    const summary = await this.getTrailingSevenDaySummary(
      tenant.id,
      employee.id,
      workDateUtc,
    );

    await this.notifications.notifyTipSummary(
      tenant.id,
      {
        id: employee.id,
        fullName: employee.fullName,
        displayName: employee.displayName,
      },
      {
        workDate: workDateKey,
        fromDate: summary.fromDate,
        toDate: summary.toDate,
        cashTips: summary.cashTips,
        creditCardTips: summary.creditCardTips,
        totalTips: summary.totalTips,
      },
    );

    return this.toTipResponse(tip);
  }

  async listTips(
    authUser: AuthUser,
    employeeId: string,
    options: { from?: string; to?: string },
  ) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: tenant.id },
      select: { timezone: true },
    });
    const timeZone = settings?.timezone || 'UTC';

    const employee = await this.prisma.employee.findFirst({
      where: { tenantId: tenant.id, id: employeeId, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        displayName: true,
        isServer: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found.');
    }
    if (!employee.isServer) {
      return {
        employee: {
          id: employee.id,
          name: employee.displayName || employee.fullName,
        },
        tips: [],
        totals: {
          cashTips: 0,
          creditCardTips: 0,
          totalTips: 0,
        },
      };
    }

    const todayKey = this.toLocalDateKey(new Date(), timeZone);
    const toKey = options.to || todayKey;
    const fromKey = options.from || this.shiftDateKey(toKey, -6);
    const fromUtc = this.dateKeyToUtc(fromKey);
    const toUtc = this.dateKeyToUtc(toKey);

    if (fromUtc.getTime() > toUtc.getTime()) {
      throw new BadRequestException('from must be before or equal to to.');
    }

    const tips = await this.prisma.employeeTip.findMany({
      where: {
        tenantId: tenant.id,
        employeeId: employee.id,
        workDate: {
          gte: fromUtc,
          lte: toUtc,
        },
      },
      orderBy: { workDate: 'desc' },
    });

    const totals = tips.reduce(
      (acc, tip) => {
        acc.cashTips += tip.cashTips;
        acc.creditCardTips += tip.creditCardTips;
        return acc;
      },
      { cashTips: 0, creditCardTips: 0 },
    );

    return {
      employee: {
        id: employee.id,
        name: employee.displayName || employee.fullName,
      },
      tips: tips.map((tip) => this.toTipResponse(tip)),
      totals: {
        cashTips: toCurrency(totals.cashTips),
        creditCardTips: toCurrency(totals.creditCardTips),
        totalTips: toCurrency(totals.cashTips + totals.creditCardTips),
      },
    };
  }

  private async getTrailingSevenDaySummary(
    tenantId: string,
    employeeId: string,
    workDateUtc: Date,
  ) {
    const toDate = workDateUtc.toISOString().slice(0, 10);
    const fromDate = this.shiftDateKey(toDate, -(TIP_EDIT_WINDOW_DAYS - 1));
    const tips = await this.prisma.employeeTip.findMany({
      where: {
        tenantId,
        employeeId,
        workDate: {
          gte: this.dateKeyToUtc(fromDate),
          lte: this.dateKeyToUtc(toDate),
        },
      },
    });

    const totals = tips.reduce(
      (acc, tip) => {
        acc.cashTips += tip.cashTips;
        acc.creditCardTips += tip.creditCardTips;
        return acc;
      },
      { cashTips: 0, creditCardTips: 0 },
    );

    return {
      fromDate,
      toDate,
      cashTips: toCurrency(totals.cashTips),
      creditCardTips: toCurrency(totals.creditCardTips),
      totalTips: toCurrency(totals.cashTips + totals.creditCardTips),
    };
  }

  private assertWithinEditWindow(workDateUtc: Date, timeZone: string) {
    const todayUtc = this.dateKeyToUtc(
      this.toLocalDateKey(new Date(), timeZone),
    );
    const deltaDays = Math.round(
      (todayUtc.getTime() - workDateUtc.getTime()) / DAY_MS,
    );
    if (deltaDays < 0) {
      throw new BadRequestException(
        'Tips cannot be submitted for future dates.',
      );
    }
    if (deltaDays > TIP_EDIT_WINDOW_DAYS - 1) {
      throw new ForbiddenException(
        'Tips can only be edited within the last 7 days.',
      );
    }
  }

  private toTipResponse(tip: {
    id: string;
    workDate: Date;
    cashTips: number;
    creditCardTips: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const cashTips = toCurrency(tip.cashTips);
    const creditCardTips = toCurrency(tip.creditCardTips);
    return {
      id: tip.id,
      workDate: tip.workDate.toISOString().slice(0, 10),
      cashTips,
      creditCardTips,
      totalTips: toCurrency(cashTips + creditCardTips),
      createdAt: tip.createdAt.toISOString(),
      updatedAt: tip.updatedAt.toISOString(),
    };
  }

  private toLocalDateKey(date: Date, timeZone: string) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;
    if (!year || !month || !day) {
      return date.toISOString().slice(0, 10);
    }
    return `${year}-${month}-${day}`;
  }

  private dateKeyToUtc(dateKey: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      throw new BadRequestException('Date must use YYYY-MM-DD format.');
    }
    return new Date(`${dateKey}T00:00:00.000Z`);
  }

  private shiftDateKey(dateKey: string, days: number) {
    const base = this.dateKeyToUtc(dateKey);
    base.setUTCDate(base.getUTCDate() + days);
    return base.toISOString().slice(0, 10);
  }
}
