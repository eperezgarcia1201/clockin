import { BadRequestException } from '@nestjs/common';
import { ExpensePaymentMethod } from '@prisma/client';
import type { UpdateEmployeeScheduleDto } from '../employee-schedules/dto/update-employee-schedule.dto';

const allowedRoundMinutes = new Set([0, 5, 10, 15, 20, 30]);

const asTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const asOptionalString = (value: unknown): string | undefined => {
  const normalized = asTrimmedString(value);
  return normalized || undefined;
};

const asNumber = (value: unknown, fallback: number): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export type RestaurantPosScopedRangeQuery = {
  from: string;
  to: string;
  roundMinutes: number;
  tzOffset: number;
  employeeId?: string;
  officeId?: string;
  groupId?: string;
};

export type RestaurantPosPayrollQuery = RestaurantPosScopedRangeQuery & {
  weekStartsOn: number;
  overtimeThreshold: number;
};

export type RestaurantPosTodaySchedulesQuery = {
  officeId?: string;
};

export type RestaurantPosCreatePayoutInput = {
  date: string;
  companyName: string;
  paymentMethod: ExpensePaymentMethod;
  amount: number;
  invoiceNumber: string;
  checkNumber?: string;
  payToCompany?: string;
  notes?: string;
};

const parseRequiredDateRange = (query: Record<string, unknown>) => {
  const from = asTrimmedString(query.from);
  const to = asTrimmedString(query.to);
  if (!from || !to) {
    throw new BadRequestException('from and to are required (YYYY-MM-DD)');
  }
  return { from, to };
};

export const parseRestaurantPosHoursQuery = (
  query: Record<string, unknown>,
): RestaurantPosScopedRangeQuery => {
  const { from, to } = parseRequiredDateRange(query);
  const roundCandidate = asNumber(query.round ?? query.roundMinutes, 0);
  const roundMinutes = allowedRoundMinutes.has(roundCandidate)
    ? roundCandidate
    : 0;

  return {
    from,
    to,
    roundMinutes,
    tzOffset: asNumber(query.tzOffset, 0),
    employeeId: asOptionalString(query.employeeId),
    officeId: asOptionalString(query.officeId),
    groupId: asOptionalString(query.groupId),
  };
};

export const parseRestaurantPosPayrollQuery = (
  query: Record<string, unknown>,
): RestaurantPosPayrollQuery => {
  const base = parseRestaurantPosHoursQuery(query);
  const weekStartsOnCandidate = asNumber(query.weekStartsOn, 1);
  const weekStartsOn = weekStartsOnCandidate === 0 ? 0 : 1;
  const overtimeThreshold = Math.max(1, asNumber(query.overtimeThreshold, 40));

  return {
    ...base,
    weekStartsOn,
    overtimeThreshold,
  };
};

export const parseRestaurantPosTipsQuery = (
  query: Record<string, unknown>,
): Omit<RestaurantPosScopedRangeQuery, 'roundMinutes' | 'tzOffset'> => {
  const { from, to } = parseRequiredDateRange(query);
  return {
    from,
    to,
    employeeId: asOptionalString(query.employeeId),
    officeId: asOptionalString(query.officeId),
    groupId: asOptionalString(query.groupId),
  };
};

export const parseRestaurantPosPayoutsQuery = (
  query: Record<string, unknown>,
) => {
  const { from, to } = parseRequiredDateRange(query);
  return { from, to };
};

export const parseRestaurantPosTodaySchedulesQuery = (
  query: Record<string, unknown>,
): RestaurantPosTodaySchedulesQuery => ({
  officeId: asOptionalString(query.officeId),
});

export const parseRestaurantPosScheduleUpdateBody = (
  body: Record<string, unknown>,
): UpdateEmployeeScheduleDto => {
  if (!Array.isArray(body.days)) {
    throw new BadRequestException('days is required.');
  }

  const days = body.days.map((day, index) => {
    if (!day || typeof day !== 'object') {
      throw new BadRequestException(`days[${index}] is invalid.`);
    }

    const record = day as Record<string, unknown>;
    const weekday = asNumber(record.weekday, Number.NaN);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      throw new BadRequestException(`days[${index}].weekday must be 0-6.`);
    }

    const enabled = Boolean(record.enabled);
    const startTime = asOptionalString(record.startTime);
    const endTime = asOptionalString(record.endTime);

    return {
      weekday,
      enabled,
      startTime: enabled ? startTime : undefined,
      endTime: enabled ? endTime : undefined,
    };
  });

  if (!days.length || days.length > 7) {
    throw new BadRequestException('days must include between 1 and 7 rows.');
  }

  return { days };
};

export const parseRestaurantPosCreatePayoutBody = (
  body: Record<string, unknown>,
): RestaurantPosCreatePayoutInput => {
  const date = asTrimmedString(body.date);
  if (!date) {
    throw new BadRequestException('date is required (YYYY-MM-DD).');
  }

  const companyName = asTrimmedString(body.companyName);
  if (!companyName) {
    throw new BadRequestException('companyName is required.');
  }

  const paymentMethodRaw = asTrimmedString(body.paymentMethod).toUpperCase();
  if (
    !Object.values(ExpensePaymentMethod).includes(
      paymentMethodRaw as ExpensePaymentMethod,
    )
  ) {
    throw new BadRequestException(
      'paymentMethod must be CHECK, DEBIT_CARD, or CASH.',
    );
  }

  const amountCandidate = asNumber(body.amount, Number.NaN);
  if (!Number.isFinite(amountCandidate) || amountCandidate < 0) {
    throw new BadRequestException('amount must be a non-negative number.');
  }

  return {
    date,
    companyName,
    paymentMethod: paymentMethodRaw as ExpensePaymentMethod,
    amount: Number(amountCandidate.toFixed(2)),
    invoiceNumber: asTrimmedString(body.invoiceNumber),
    checkNumber: asOptionalString(body.checkNumber),
    payToCompany: asOptionalString(body.payToCompany),
    notes: asOptionalString(body.notes),
  };
};
