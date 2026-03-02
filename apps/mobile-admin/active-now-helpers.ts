type ActiveNowRow = { id: string; name: string; status: string };

export const normalizeRecentPunchRows = (
  rows: Array<{ id: string; name: string; status: string | null }> | undefined,
): ActiveNowRow[] =>
  (rows || []).map((row) => ({
    id: row.id,
    name: row.name,
    status: (row.status || "OUT").toUpperCase(),
  }));

export const filterActiveNowRows = (rows: ActiveNowRow[]): ActiveNowRow[] =>
  rows.filter((row) => ["IN", "BREAK", "LUNCH"].includes(row.status));
