import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  RestaurantPosCreatePayoutInput,
  RestaurantPosCreatePayoutResponse,
  RestaurantPosEmployeeSchedule,
  RestaurantPosHoursReport,
  RestaurantPosMutationState,
  RestaurantPosPayrollInput,
  RestaurantPosPayrollReport,
  RestaurantPosPayoutsReport,
  RestaurantPosQueryState,
  RestaurantPosScopedRangeInput,
  RestaurantPosTodaySchedulesResponse,
  RestaurantPosTipsReport,
  RestaurantPosConnectionResponse,
} from './types';
import type { RestaurantPosClient } from './client';

const useRestaurantPosQuery = <T,>(
  loader: () => Promise<T>,
  deps: readonly unknown[],
): RestaurantPosQueryState<T> => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await loader();
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Request failed.'));
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loader()
      .then((next) => {
        if (!active) return;
        setData(next);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err : new Error('Request failed.'));
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, deps);

  return { data, error, loading, reload };
};

const useRestaurantPosMutation = <TInput, TResult>(
  runner: (input: TInput) => Promise<TResult>,
): RestaurantPosMutationState<TInput, TResult> => {
  const [data, setData] = useState<TResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async (input: TInput) => {
    setLoading(true);
    setError(null);
    try {
      const result = await runner(input);
      setData(result);
      return result;
    } catch (err) {
      const nextError = err instanceof Error ? err : new Error('Request failed.');
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, [runner]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, error, loading, execute, reset };
};

const stableKey = (value: unknown) => JSON.stringify(value ?? null);

export const useRestaurantPosConnection = (
  client: RestaurantPosClient,
  officeId?: string,
): RestaurantPosQueryState<RestaurantPosConnectionResponse> =>
  useRestaurantPosQuery(
    () => client.getConnection(officeId),
    [client, officeId],
  );

export const useRestaurantPosHoursReport = (
  client: RestaurantPosClient,
  input: RestaurantPosScopedRangeInput,
): RestaurantPosQueryState<RestaurantPosHoursReport> => {
  const key = useMemo(() => stableKey(input), [input]);
  return useRestaurantPosQuery(() => client.getHoursReport(input), [client, key]);
};

export const useRestaurantPosPayrollReport = (
  client: RestaurantPosClient,
  input: RestaurantPosPayrollInput,
): RestaurantPosQueryState<RestaurantPosPayrollReport> => {
  const key = useMemo(() => stableKey(input), [input]);
  return useRestaurantPosQuery(() => client.getPayrollReport(input), [client, key]);
};

export const useRestaurantPosTipsReport = (
  client: RestaurantPosClient,
  input: Omit<RestaurantPosScopedRangeInput, 'roundMinutes' | 'tzOffset'>,
): RestaurantPosQueryState<RestaurantPosTipsReport> => {
  const key = useMemo(() => stableKey(input), [input]);
  return useRestaurantPosQuery(() => client.getTipsReport(input), [client, key]);
};

export const useRestaurantPosTodaySchedules = (
  client: RestaurantPosClient,
  officeId?: string,
): RestaurantPosQueryState<RestaurantPosTodaySchedulesResponse> =>
  useRestaurantPosQuery(
    () => client.getTodaySchedules(officeId),
    [client, officeId],
  );

export const useRestaurantPosEmployeeSchedule = (
  client: RestaurantPosClient,
  employeeId?: string,
): RestaurantPosQueryState<RestaurantPosEmployeeSchedule> => {
  const loader = useCallback(() => {
    if (!employeeId) {
      return Promise.reject(new Error('employeeId is required.'));
    }
    return client.getEmployeeSchedule(employeeId);
  }, [client, employeeId]);

  return useRestaurantPosQuery(loader, [loader]);
};

export const useRestaurantPosPayoutsReport = (
  client: RestaurantPosClient,
  input: Pick<RestaurantPosScopedRangeInput, 'from' | 'to'>,
): RestaurantPosQueryState<RestaurantPosPayoutsReport> => {
  const key = useMemo(() => stableKey(input), [input]);
  return useRestaurantPosQuery(() => client.getPayouts(input), [client, key]);
};

export const useRestaurantPosScheduleMutation = (
  client: RestaurantPosClient,
  employeeId: string,
) =>
  useRestaurantPosMutation<
    Pick<RestaurantPosEmployeeSchedule, 'days'>,
    RestaurantPosEmployeeSchedule
  >((input) => client.updateEmployeeSchedule(employeeId, input));

export const useRestaurantPosCreatePayoutMutation = (
  client: RestaurantPosClient,
) =>
  useRestaurantPosMutation<
    RestaurantPosCreatePayoutInput,
    RestaurantPosCreatePayoutResponse
  >((input) => client.createPayout(input));
