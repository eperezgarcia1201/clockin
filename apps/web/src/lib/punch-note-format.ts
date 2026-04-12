import type { UiLang } from "./ui-language";

const SYSTEM_NOTE_TOKEN_PATTERN = /\[([A-Z0-9_]+)(?::([^\]]*))?\]/g;
const SYSTEM_NOTE_STRIP_PATTERN = /\s*\[[^\]]+\]/g;

const translate = (lang: UiLang, en: string, es: string) =>
  lang === "es" ? es : en;

const formatWorkDate = (value: string, lang: UiLang) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
};

const parseSystemNoteTokens = (note: string) => {
  const tokens = new Map<string, string>();
  for (const match of note.matchAll(SYSTEM_NOTE_TOKEN_PATTERN)) {
    const key = (match[1] || "").trim();
    const value = (match[2] || "").trim();
    if (!key) {
      continue;
    }
    tokens.set(key, value);
  }
  return tokens;
};

const stripSystemNoteTokens = (note: string) =>
  note.replace(SYSTEM_NOTE_STRIP_PATTERN, "").replace(/\s+/g, " ").trim();

const buildAutoClockOutSummary = (note: string, lang: UiLang) => {
  const cleaned = stripSystemNoteTokens(note);
  const tokens = parseSystemNoteTokens(note);
  const segments: string[] = [];

  const scheduledEndMatch = /schedule ended \+(\d+)m/i.exec(cleaned);
  const noScheduleMatch =
    /no schedule on file; closed at end of day \+(\d+)m/i.exec(cleaned);

  if (scheduledEndMatch) {
    const minutes = Number(scheduledEndMatch[1] || "0");
    segments.push(
      translate(
        lang,
        `Clocked out automatically ${minutes} minutes after the scheduled shift ended.`,
        `Salida automática ${minutes} minutos después de terminar el turno programado.`,
      ),
    );
  } else if (noScheduleMatch) {
    const minutes = Number(noScheduleMatch[1] || "0");
    segments.push(
      translate(
        lang,
        `Clocked out automatically at the end of the day because no schedule was on file, with a ${minutes}-minute grace period.`,
        `Salida automática al final del día porque no había horario registrado, con ${minutes} minutos de gracia.`,
      ),
    );
  } else if (cleaned) {
    segments.push(cleaned);
  }

  const weeklyCount = Number(tokens.get("AUTO_OUT_WEEKLY_COUNT") || "0");
  if (Number.isFinite(weeklyCount) && weeklyCount > 0) {
    segments.push(
      translate(
        lang,
        `Automatic clock-out count this week: ${weeklyCount}.`,
        `Total de salidas automáticas esta semana: ${weeklyCount}.`,
      ),
    );
  }

  const penaltyMinutes = Number(tokens.get("PENALTY_MINUTES") || "0");
  if (Number.isFinite(penaltyMinutes) && penaltyMinutes > 0) {
    segments.push(
      translate(
        lang,
        `A ${penaltyMinutes}-minute penalty was applied.`,
        `Se aplicó una penalización de ${penaltyMinutes} minutos.`,
      ),
    );
  }

  if (tokens.get("AWAY_FROM_LOCATION") === "YES") {
    segments.push(
      translate(
        lang,
        "Marked as outside the assigned location.",
        "Marcado como fuera de la ubicación asignada.",
      ),
    );
  }

  const tipsPending = tokens.get("TIPS_PENDING") || "";
  if (tipsPending && tipsPending !== "NONE") {
    segments.push(
      translate(
        lang,
        `Tips for ${formatWorkDate(tipsPending, lang)} are still pending.`,
        `Las propinas de ${formatWorkDate(tipsPending, lang)} siguen pendientes.`,
      ),
    );
  }

  if (!segments.length) {
    return translate(
      lang,
      "System-generated clock-out note.",
      "Nota de salida generada por el sistema.",
    );
  }

  return segments.join(" ");
};

export const formatPunchNoteForDisplay = (
  note: string | null | undefined,
  lang: UiLang,
) => {
  const raw = (note || "").trim();
  if (!raw) {
    return "";
  }

  if (raw.includes("[AUTO_SCHEDULE_OUT]")) {
    return buildAutoClockOutSummary(raw, lang);
  }

  if (raw === "Auto clock-in: missed scheduled start after late reminders.") {
    return translate(
      lang,
      "Clocked in automatically after the scheduled start was missed and reminder alerts were ignored.",
      "Entrada automática después de perder la hora programada y no responder a los recordatorios.",
    );
  }

  if (raw === "Auto clock-in: admin approved schedule override.") {
    return translate(
      lang,
      "Clocked in automatically after a manager approved the schedule override.",
      "Entrada automática después de que un gerente aprobó el ajuste de horario.",
    );
  }

  const cleaned = stripSystemNoteTokens(raw);
  if (cleaned) {
    return cleaned;
  }

  return translate(
    lang,
    "System-generated note.",
    "Nota generada por el sistema.",
  );
};
