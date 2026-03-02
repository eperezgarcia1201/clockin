import { parseDateInputToIso } from "./app-helpers";
import type { ReportType } from "./types";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export type ReportQueryResult =
  | { ok: false; error: string }
  | { ok: true; queryString: string };

export const buildReportQueryString = (params: {
  fromDate: string;
  toDate: string;
  reportEmployeeId: string;
  tzOffsetMinutes?: number;
}): ReportQueryResult => {
  if (!params.fromDate.trim() || !params.toDate.trim()) {
    return { ok: false, error: "From and To dates are required." };
  }
  const fromIso = parseDateInputToIso(params.fromDate);
  const toIso = parseDateInputToIso(params.toDate);
  if (!fromIso || !toIso) {
    return { ok: false, error: "Use MM/DD/YYYY dates." };
  }
  if (fromIso > toIso) {
    return {
      ok: false,
      error: '"From" date must be before or equal to "To" date.',
    };
  }

  const tzOffset =
    params.tzOffsetMinutes !== undefined
      ? params.tzOffsetMinutes
      : new Date().getTimezoneOffset();
  const query = new URLSearchParams({
    from: fromIso,
    to: toIso,
    round: "0",
    tzOffset: String(tzOffset),
  });
  if (params.reportEmployeeId) {
    query.set("employeeId", params.reportEmployeeId);
  }
  return { ok: true, queryString: query.toString() };
};

export const resolveReportRowsAndStatus = (
  reportType: ReportType,
  data: any,
): { rows: any[]; status: string } => {
  if (reportType === "audit") {
    const rows = data.records || [];
    return {
      rows,
      status: `Generated ${rows.length} audit rows.`,
    };
  }
  const rows = data.employees || [];
  return {
    rows,
    status: `Generated ${rows.length} employee report rows.`,
  };
};

export const runReportRequest = async (params: {
  fetchJson: FetchJson;
  reportType: ReportType;
  fromDate: string;
  toDate: string;
  reportEmployeeId: string;
}): Promise<
  | { ok: true; rows: any[]; status: string }
  | { ok: false; error: string }
> => {
  const queryResult = buildReportQueryString({
    fromDate: params.fromDate,
    toDate: params.toDate,
    reportEmployeeId: params.reportEmployeeId,
  });
  if (queryResult.ok === false) {
    return { ok: false, error: queryResult.error };
  }

  try {
    const data = await params.fetchJson(
      `/reports/${params.reportType}?${queryResult.queryString}`,
    );
    const resolved = resolveReportRowsAndStatus(params.reportType, data);
    return { ok: true, rows: resolved.rows, status: resolved.status };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Report failed.",
    };
  }
};
