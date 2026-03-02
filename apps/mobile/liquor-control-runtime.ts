import { todayDateKey } from "./app-helpers";
import {
  normalizeLiquorBottleScans,
  normalizeLiquorCatalogItems,
  normalizeLiquorCounts,
} from "./liquor-control-normalizers";
import type {
  LiquorBottleScanRow,
  LiquorCatalogItem,
  LiquorCountRow,
} from "./types";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export const loadLiquorControlSnapshot = async (params: {
  fetchJson: FetchJson;
  hasLiquorPremiumAccess: boolean;
  selectedOfficeId: string;
  liquorHeaders?: Record<string, string>;
}): Promise<{
  items: LiquorCatalogItem[];
  counts: LiquorCountRow[];
  scans: LiquorBottleScanRow[];
}> => {
  const query = new URLSearchParams();
  query.set("limit", "300");
  query.set("officeId", params.selectedOfficeId);

  const scanRequest = params.hasLiquorPremiumAccess
    ? (params.fetchJson(`/liquor-inventory/bottle-scans?${query.toString()}`, {
        headers: params.liquorHeaders,
      }) as Promise<{
        scans?: Array<Record<string, unknown>>;
      }>)
    : Promise.resolve({ scans: [] as Array<Record<string, unknown>> });
  const [catalogPayload, countPayload, scanPayload] = await Promise.all([
    params.fetchJson("/liquor-inventory/catalog?includeInactive=1", {
      headers: params.liquorHeaders,
    }) as Promise<{
      items?: Array<Record<string, unknown>>;
    }>,
    params.fetchJson(`/liquor-inventory/counts?${query.toString()}`, {
      headers: params.liquorHeaders,
    }) as Promise<{
      counts?: Array<Record<string, unknown>>;
    }>,
    scanRequest,
  ]);

  return {
    items: normalizeLiquorCatalogItems(catalogPayload),
    counts: normalizeLiquorCounts(countPayload, todayDateKey()),
    scans: normalizeLiquorBottleScans(scanPayload),
  };
};
