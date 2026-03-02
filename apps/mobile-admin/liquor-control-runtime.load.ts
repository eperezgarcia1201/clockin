import { previousMonthKey, todayDateKey } from "./app-helpers";
import {
  normalizeLiquorBottleScans,
  normalizeLiquorCatalogItems,
  normalizeLiquorCounts,
  normalizeLiquorKinds,
  normalizeLiquorMovements,
} from "./liquor-control-normalizers";
import type {
  LiquorBottleScanRow,
  LiquorCatalogItem,
  LiquorCountRow,
  LiquorMonthlyReport,
  LiquorMovementRow,
  LiquorMovementType,
  LiquorYearlyControl,
} from "./types";

export const buildLiquorFeedQueryString = ({
  officeId,
  limit = 400,
}: {
  officeId: string;
  limit?: number;
}): string => {
  const feedQuery = new URLSearchParams();
  feedQuery.set("limit", String(limit));
  if (officeId) {
    feedQuery.set("officeId", officeId);
  }
  return feedQuery.toString();
};

export const buildLiquorAnalyticsQueryStrings = ({
  officeId,
  month,
  year,
  targetCostPct,
}: {
  officeId: string;
  month: string;
  year: string;
  targetCostPct: string;
}): { monthly: string; monthlyPrevious: string; yearly: string } => {
  const resolvedMonth = month || todayDateKey().slice(0, 7);
  const resolvedYear = year || todayDateKey().slice(0, 4);

  const monthlyQuery = new URLSearchParams();
  monthlyQuery.set("month", resolvedMonth);
  const monthlyPreviousQuery = new URLSearchParams();
  monthlyPreviousQuery.set("month", previousMonthKey(resolvedMonth));
  const yearlyQuery = new URLSearchParams();
  yearlyQuery.set("year", resolvedYear);

  if (officeId) {
    monthlyQuery.set("officeId", officeId);
    monthlyPreviousQuery.set("officeId", officeId);
    yearlyQuery.set("officeId", officeId);
  }

  const parsedTargetCostPct = Number(targetCostPct);
  if (
    Number.isFinite(parsedTargetCostPct) &&
    parsedTargetCostPct >= 0 &&
    parsedTargetCostPct <= 1
  ) {
    monthlyQuery.set("targetCostPct", String(parsedTargetCostPct));
    monthlyPreviousQuery.set("targetCostPct", String(parsedTargetCostPct));
    yearlyQuery.set("targetCostPct", String(parsedTargetCostPct));
  }

  return {
    monthly: monthlyQuery.toString(),
    monthlyPrevious: monthlyPreviousQuery.toString(),
    yearly: yearlyQuery.toString(),
  };
};

export type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export const loadLiquorControlSnapshot = async (params: {
  fetchJson: FetchJson;
  hasLiquorPremiumAccess: boolean;
  officeId: string;
  month: string;
  year: string;
  targetCostPct: string;
  movementTypes: LiquorMovementType[];
}): Promise<{
  kinds: string[];
  items: LiquorCatalogItem[];
  counts: LiquorCountRow[];
  movements: LiquorMovementRow[];
  scans: LiquorBottleScanRow[];
  monthly: LiquorMonthlyReport | null;
  monthlyPrevious: LiquorMonthlyReport | null;
  yearly: LiquorYearlyControl | null;
}> => {
  const feedQueryString = buildLiquorFeedQueryString({
    officeId: params.officeId,
    limit: 400,
  });
  const analyticsQueryStrings = buildLiquorAnalyticsQueryStrings({
    officeId: params.officeId,
    month: params.month,
    year: params.year,
    targetCostPct: params.targetCostPct,
  });

  const scanRequest = params.hasLiquorPremiumAccess
    ? (params.fetchJson(
        `/liquor-inventory/bottle-scans?${feedQueryString}`,
      ) as Promise<{
        scans?: Array<Record<string, unknown>>;
      }>)
    : Promise.resolve({ scans: [] });

  const [
    kindsPayload,
    catalogPayload,
    countPayload,
    movementPayload,
    scanPayload,
    monthlyPayload,
    monthlyPreviousPayload,
    yearlyPayload,
  ] = await Promise.all([
    params.fetchJson("/liquor-inventory/kinds") as Promise<{
      kinds?: Array<string>;
    }>,
    params.fetchJson("/liquor-inventory/catalog?includeInactive=1") as Promise<{
      items?: Array<Record<string, unknown>>;
    }>,
    params.fetchJson(`/liquor-inventory/counts?${feedQueryString}`) as Promise<{
      counts?: Array<Record<string, unknown>>;
    }>,
    params.fetchJson(
      `/liquor-inventory/movements?${feedQueryString}`,
    ) as Promise<{
      movements?: Array<Record<string, unknown>>;
    }>,
    scanRequest,
    params.fetchJson(
      `/liquor-inventory/report/monthly?${analyticsQueryStrings.monthly}`,
    ) as Promise<LiquorMonthlyReport>,
    params.fetchJson(
      `/liquor-inventory/report/monthly?${analyticsQueryStrings.monthlyPrevious}`,
    ) as Promise<LiquorMonthlyReport>,
    params.fetchJson(
      `/liquor-inventory/control/yearly?${analyticsQueryStrings.yearly}`,
    ) as Promise<LiquorYearlyControl>,
  ]);

  return {
    kinds: normalizeLiquorKinds(kindsPayload),
    items: normalizeLiquorCatalogItems(catalogPayload),
    counts: normalizeLiquorCounts(countPayload, todayDateKey()),
    movements: normalizeLiquorMovements(movementPayload, params.movementTypes),
    scans: normalizeLiquorBottleScans(scanPayload),
    monthly: monthlyPayload || null,
    monthlyPrevious: monthlyPreviousPayload || null,
    yearly: yearlyPayload || null,
  };
};
