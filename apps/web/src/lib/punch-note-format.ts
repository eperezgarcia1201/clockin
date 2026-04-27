type TokenMap = Record<string, string | true>;

const SYSTEM_TOKEN_PATTERN = /\[([A-Z_]+)(?::([^\]]*))?\]/g;

function extractTokens(note: string): TokenMap {
  const tokens: TokenMap = {};
  for (const match of note.matchAll(SYSTEM_TOKEN_PATTERN)) {
    tokens[match[1].toUpperCase()] = match[2] ?? true;
  }
  return tokens;
}

function stripSystemTokens(note: string): string {
  return note.replace(/\s*\[[^\]]+\]/g, "").replace(/\s+/g, " ").trim();
}

function formatShortDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return value;
  return `${match[2]}/${match[3]}/${match[1]}`;
}

function tokenValue(tokens: TokenMap, key: string): string | null {
  const value = tokens[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function formatAutoScheduleOut(note: string, tokens: TokenMap): string {
  const offsetMatch = /schedule ended\s*\+(\d+)m/i.exec(note);
  const offsetMinutes = offsetMatch?.[1];
  const weeklyCount = tokenValue(tokens, "AUTO_OUT_WEEKLY_COUNT");
  const penaltyMinutes = Number(tokenValue(tokens, "PENALTY_MINUTES") ?? 0);
  const awayFromLocation = tokenValue(tokens, "AWAY_FROM_LOCATION");
  const tipsPending = tokenValue(tokens, "TIPS_PENDING");

  const sentences = [
    offsetMinutes
      ? `Clocked out automatically ${offsetMinutes} minutes after the scheduled shift ended.`
      : "Clocked out automatically after the scheduled shift ended.",
  ];

  if (weeklyCount) {
    sentences.push(`Automatic clock-out count this week: ${weeklyCount}.`);
  }

  if (Number.isFinite(penaltyMinutes) && penaltyMinutes > 0) {
    sentences.push(`A ${penaltyMinutes}-minute penalty was applied.`);
  }

  if (awayFromLocation === "YES") {
    sentences.push("The employee was away from their assigned location.");
  }

  if (tipsPending && tipsPending !== "NONE") {
    sentences.push(`Tips are still pending for ${formatShortDate(tipsPending)}.`);
  }

  return sentences.join(" ");
}

export function formatPunchNoteForDisplay(note: string | null | undefined) {
  const rawNote = note?.trim() ?? "";
  if (!rawNote) return "";

  const tokens = extractTokens(rawNote);
  const plainNote = stripSystemTokens(rawNote);

  if (tokens.AUTO_SCHEDULE_OUT || /auto clock-out/i.test(plainNote)) {
    return formatAutoScheduleOut(rawNote, tokens);
  }

  if (/auto clock-in:\s*missed scheduled start after late reminders\.?/i.test(plainNote)) {
    return "Clocked in automatically after the scheduled start was missed and reminder alerts were ignored.";
  }

  return plainNote || rawNote;
}
