import { ACTIVE_SHIFT_STATUSES } from "./app-helpers";
import type { WorkingNowRow } from "./types";

type RawWorkingNowRow = {
  id?: string;
  name?: string;
  status?: string | null;
  office?: string | null;
  group?: string | null;
};

export const buildWorkingNowQuerySuffix = (
  selectedOfficeId: string | null,
): string => {
  const query = new URLSearchParams();
  if (selectedOfficeId) {
    query.set("officeId", selectedOfficeId);
  }
  const suffix = query.toString();
  return suffix ? `?${suffix}` : "";
};

export const normalizeWorkingNowRows = (
  rows: RawWorkingNowRow[] | undefined,
): WorkingNowRow[] => {
  const sourceRows = Array.isArray(rows) ? rows : [];
  return sourceRows
    .map((row) => {
      const id = typeof row.id === "string" ? row.id.trim() : "";
      const name = typeof row.name === "string" ? row.name.trim() : "";
      const status = (
        typeof row.status === "string" ? row.status : "OUT"
      ).toUpperCase() as "IN" | "OUT" | "BREAK" | "LUNCH";
      if (!id || !name || !ACTIVE_SHIFT_STATUSES.has(status)) {
        return null;
      }
      const workingStatus = status as WorkingNowRow["status"];
      return {
        id,
        name,
        status: workingStatus,
        office:
          typeof row.office === "string" && row.office.trim() ? row.office : null,
        group: typeof row.group === "string" && row.group.trim() ? row.group : null,
      } satisfies WorkingNowRow;
    })
    .filter((row): row is WorkingNowRow => Boolean(row));
};
