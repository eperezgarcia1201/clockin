import {
  filterActiveNowRows,
  normalizeRecentPunchRows,
} from "./active-now-helpers";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export const loadActiveNowRows = async (params: {
  fetchJson: FetchJson;
  appendOfficeScope: (path: string) => string;
}): Promise<
  | {
      ok: true;
      recentPunchRows: { id: string; name: string; status: string }[];
      activeNowRows: { id: string; name: string; status: string }[];
    }
  | {
      ok: false;
      error: string;
    }
> => {
  try {
    const data = (await params.fetchJson(
      params.appendOfficeScope("/employee-punches/recent"),
    )) as {
      rows: { id: string; name: string; status: string | null }[];
    };
    const recentPunchRows = normalizeRecentPunchRows(data.rows);
    return {
      ok: true,
      recentPunchRows,
      activeNowRows: filterActiveNowRows(recentPunchRows),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to load active users.",
    };
  }
};
