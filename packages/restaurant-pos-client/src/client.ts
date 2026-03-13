import type {
  RestaurantPosClientConfig,
  RestaurantPosConnectionResponse,
  RestaurantPosCreatePayoutInput,
  RestaurantPosCreatePayoutResponse,
  RestaurantPosEmployeeSchedule,
  RestaurantPosHoursReport,
  RestaurantPosPayrollInput,
  RestaurantPosPayrollReport,
  RestaurantPosPayoutsReport,
  RestaurantPosScopedRangeInput,
  RestaurantPosTodaySchedulesResponse,
  RestaurantPosTipsReport,
} from './types';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const buildSearch = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '') {
      return;
    }
    search.set(key, String(value));
  });
  const serialized = search.toString();
  return serialized ? `?${serialized}` : '';
};

const resolveBearerToken = async (
  token: RestaurantPosClientConfig['bearerToken'],
) => {
  if (!token) {
    return undefined;
  }
  if (typeof token === 'function') {
    return token();
  }
  return token;
};

export const buildRestaurantPosDevHeaders = (
  devAuth: RestaurantPosClientConfig['devAuth'],
): HeadersInit => {
  if (!devAuth?.tenantExternalId) {
    return {};
  }

  return {
    'x-dev-tenant-id': devAuth.tenantExternalId,
    'x-dev-user-id': devAuth.actorId || 'restaurant-pos-integration',
    'x-dev-name': devAuth.actorName || 'Websys POS',
    'x-dev-email': devAuth.actorEmail || 'restaurant-pos@clockin.local',
  };
};

export const createRestaurantPosClient = (config: RestaurantPosClientConfig) => {
  const baseUrl = trimTrailingSlash(config.baseUrl);
  const fetchImpl = config.fetchImpl || fetch;

  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const headers = new Headers(init?.headers || {});
    headers.set('Accept', 'application/json');

    const devHeaders = buildRestaurantPosDevHeaders(config.devAuth);
    Object.entries(devHeaders).forEach(([key, value]) => {
      if (typeof value === 'string' && value) {
        headers.set(key, value);
      }
    });

    const bearerToken = await resolveBearerToken(config.bearerToken);
    if (bearerToken) {
      headers.set('Authorization', `Bearer ${bearerToken}`);
    }

    const extraHeaders = await config.getHeaders?.();
    if (extraHeaders) {
      new Headers(extraHeaders).forEach((value, key) => {
        headers.set(key, value);
      });
    }

    if (init?.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers,
    });

    const text = await response.text();
    const payload = text ? safeParseJson(text) : null;

    if (!response.ok) {
      const message =
        typeof payload === 'string'
          ? payload
          : (payload as { message?: string } | null)?.message ||
            `Websys POS request failed (${response.status}).`;
      throw new Error(message);
    }

    return payload as T;
  };

  return {
    getConnection(officeId?: string) {
      return request<RestaurantPosConnectionResponse>(
        `/integrations/restaurant-pos/connection${buildSearch({ officeId })}`,
      );
    },
    getHoursReport(input: RestaurantPosScopedRangeInput) {
      return request<RestaurantPosHoursReport>(
        `/integrations/restaurant-pos/workforce/hours${buildSearch({
          from: input.from,
          to: input.to,
          employeeId: input.employeeId,
          officeId: input.officeId,
          groupId: input.groupId,
          round: input.roundMinutes,
          tzOffset: input.tzOffset,
        })}`,
      );
    },
    getPayrollReport(input: RestaurantPosPayrollInput) {
      return request<RestaurantPosPayrollReport>(
        `/integrations/restaurant-pos/workforce/payroll${buildSearch({
          from: input.from,
          to: input.to,
          employeeId: input.employeeId,
          officeId: input.officeId,
          groupId: input.groupId,
          round: input.roundMinutes,
          tzOffset: input.tzOffset,
          weekStartsOn: input.weekStartsOn,
          overtimeThreshold: input.overtimeThreshold,
        })}`,
      );
    },
    getTipsReport(input: Omit<RestaurantPosScopedRangeInput, 'roundMinutes' | 'tzOffset'>) {
      return request<RestaurantPosTipsReport>(
        `/integrations/restaurant-pos/workforce/tips${buildSearch({
          from: input.from,
          to: input.to,
          employeeId: input.employeeId,
          officeId: input.officeId,
          groupId: input.groupId,
        })}`,
      );
    },
    getTodaySchedules(officeId?: string) {
      return request<RestaurantPosTodaySchedulesResponse>(
        `/integrations/restaurant-pos/workforce/schedules/today${buildSearch({ officeId })}`,
      );
    },
    getEmployeeSchedule(employeeId: string) {
      return request<RestaurantPosEmployeeSchedule>(
        `/integrations/restaurant-pos/workforce/schedules/${encodeURIComponent(employeeId)}`,
      );
    },
    updateEmployeeSchedule(
      employeeId: string,
      input: Pick<RestaurantPosEmployeeSchedule, 'days'>,
    ) {
      return request<RestaurantPosEmployeeSchedule>(
        `/integrations/restaurant-pos/workforce/schedules/${encodeURIComponent(employeeId)}`,
        {
          method: 'PUT',
          body: JSON.stringify({ days: input.days }),
        },
      );
    },
    getPayouts(input: Pick<RestaurantPosScopedRangeInput, 'from' | 'to'>) {
      return request<RestaurantPosPayoutsReport>(
        `/integrations/restaurant-pos/payouts${buildSearch({
          from: input.from,
          to: input.to,
        })}`,
      );
    },
    createPayout(input: RestaurantPosCreatePayoutInput) {
      return request<RestaurantPosCreatePayoutResponse>(
        '/integrations/restaurant-pos/payouts',
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
      );
    },
  };
};

const safeParseJson = (value: string): unknown => {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
};

export type RestaurantPosClient = ReturnType<typeof createRestaurantPosClient>;
