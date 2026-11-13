/** Campus timezone helpers for event schedule fields (Asia/Almaty, fixed UTC+5). */

export const CAMPUS_TIME_ZONE = "Asia/Almaty";
/** Kazakhstan does not observe DST; campus wall clock is UTC+5 year-round. */
export const CAMPUS_UTC_OFFSET = "+05:00";

const pad2 = (n: number) => String(n).padStart(2, "0");

export type EventTimePreset = "upcoming" | "today" | "week" | "month";

/**
 * Build the active range for an events-list preset in campus time and return
 * UTC instants for the API. The lower bound is the current client instant;
 * the upper bound is exclusive so adjacent ranges never overlap.
 */
export function getEventTimeRange(preset: EventTimePreset): {
  from_datetime: string;
  to_datetime?: string;
} {
  const now = new Date();
  if (preset === "upcoming") return { from_datetime: now.toISOString() };

  const campusNow = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  const year = campusNow.getUTCFullYear();
  const month = campusNow.getUTCMonth();
  const day = campusNow.getUTCDate();
  const campusWeekday = campusNow.getUTCDay();

  let endYear = year;
  let endMonth = month;
  let endDay = day + 1;
  if (preset === "week") {
    endDay = day + (((8 - campusWeekday) % 7) || 7);
  } else if (preset === "month") {
    endMonth += 1;
    endDay = 1;
  }

  const campusMidnightUtc = Date.UTC(endYear, endMonth, endDay) - 5 * 60 * 60 * 1000;
  return {
    from_datetime: now.toISOString(),
    to_datetime: new Date(campusMidnightUtc).toISOString(),
  };
}

/**
 * Build an ISO-8601 string for a campus wall-clock date/time (form fields).
 * Example: 2026-08-29 19:00 → "2026-08-29T19:00:00+05:00"
 */
export function campusWallClockToIso(
  date: Date,
  timeHhMm: string
): string {
  const [hoursStr, minutesStr] = timeHhMm ? timeHhMm.split(":") : ["0", "0"];
  const hours = Number.parseInt(hoursStr, 10) || 0;
  const minutes = Number.parseInt(minutesStr, 10) || 0;
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}T${pad2(hours)}:${pad2(minutes)}:00${CAMPUS_UTC_OFFSET}`;
}

/**
 * Split an API instant (ISO with offset) into campus calendar date + HH:mm for the form.
 */
export function isoToCampusWallClock(iso: string): { date: Date; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAMPUS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  let hour = Number(get("hour"));
  // en-CA hourCycle can yield "24" for midnight in some engines
  if (hour === 24) hour = 0;
  const minute = Number(get("minute"));

  return {
    date: new Date(year, month - 1, day),
    time: `${pad2(hour)}:${pad2(minute)}`,
  };
}

/** Format event date/time for display in campus timezone. */
export function formatInCampusTime(
  iso: string,
  options: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: CAMPUS_TIME_ZONE,
    ...options,
  }).format(new Date(iso));
}
