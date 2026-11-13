/** Schedule comfort metrics from selected section days/times (no subjective score). */

export const LUNCH_WINDOW_START = 12 * 60; // 12:00
export const LUNCH_WINDOW_END = 15 * 60; // 15:00
/** Full lunch: eat + walk. */
export const MIN_LUNCH_MINUTES = 30;
/** Short grab-and-go / coffee between classes. */
export const MIN_QUICK_BREAK_MINUTES = 15;

const DAY_ORDER = ["M", "T", "W", "R", "F", "S", "U"] as const;
const DAY_KEYS = new Set<string>(DAY_ORDER);
const DAY_LABEL: Record<string, string> = {
  M: "Mon",
  T: "Tue",
  W: "Wed",
  R: "Thu",
  F: "Fri",
  S: "Sat",
  U: "Sun",
};

/** Registrar days often arrive as "T R" / "M W F" — only keep real day letters. */
export function parseSectionDays(days: string | null | undefined): string[] {
  if (!days) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const ch of days.toUpperCase()) {
    if (!DAY_KEYS.has(ch) || seen.has(ch)) continue;
    seen.add(ch);
    out.push(ch);
  }
  return out;
}

/** True when two sections share a day and overlapping clock time (exclusive ends). */
export function sectionsTimeConflict(
  a: { days?: string | null; times?: string | null },
  b: { days?: string | null; times?: string | null },
): boolean {
  const [aStart, aEnd] = parseTimeRange(a.times ?? "");
  const [bStart, bEnd] = parseTimeRange(b.times ?? "");
  if (aStart == null || aEnd == null || bStart == null || bEnd == null) return false;
  const aDays = new Set(parseSectionDays(a.days));
  if (!parseSectionDays(b.days).some((day) => aDays.has(day))) return false;
  return aStart < bEnd && bStart < aEnd;
}

export type TimeBlock = { day: string; start: number; end: number };

export type LunchKind = "lunch" | "quick" | "none";

export type DayLunchWindow = {
  day: string;
  dayLabel: string;
  /** Best contiguous free slot inside 12:00–15:00, or null if none. */
  start: number | null;
  end: number | null;
  durationMinutes: number;
  kind: LunchKind;
};

export type ScheduleQuality = {
  hasClash: boolean;
  campusDays: number;
  totalClassMinutes: number;
  longestGapMinutes: number | null;
  longestGapDay: { day: string; dayLabel: string } | null;
  earliestStart: number | null;
  latestStart: number | null;
  latestEnd: number | null;
  heaviestDay: { day: string; dayLabel: string; minutes: number } | null;
  lightestDay: { day: string; dayLabel: string; minutes: number } | null;
  lunch: {
    daysWithLunch: number;
    daysWithQuick: number;
    daysWithNone: number;
    daysWithClasses: number;
    byDay: DayLunchWindow[];
  };
};

export type SectionLike = {
  days?: string | null;
  times?: string | null;
};

export function computeScheduleQuality(sections: SectionLike[]): ScheduleQuality {
  const blocks = collectBlocks(sections);
  const byDay = groupByDay(blocks);

  const hasClash = detectClash(byDay);
  const dayKeys = DAY_ORDER.filter((d) => (byDay.get(d)?.length ?? 0) > 0);

  let totalClassMinutes = 0;
  let longestGapMinutes: number | null = null;
  let longestGapDayKey: string | null = null;
  let earliestStart: number | null = null;
  let latestStart: number | null = null;
  let latestEnd: number | null = null;
  const dayLoads: { day: string; minutes: number }[] = [];

  for (const day of dayKeys) {
    const dayBlocks = [...(byDay.get(day) ?? [])].sort((a, b) => a.start - b.start);
    let dayMinutes = 0;
    for (const b of dayBlocks) {
      dayMinutes += b.end - b.start;
      earliestStart = earliestStart == null ? b.start : Math.min(earliestStart, b.start);
      latestStart = latestStart == null ? b.start : Math.max(latestStart, b.start);
      latestEnd = latestEnd == null ? b.end : Math.max(latestEnd, b.end);
    }
    totalClassMinutes += dayMinutes;
    dayLoads.push({ day, minutes: dayMinutes });

    for (let i = 0; i < dayBlocks.length - 1; i++) {
      const gap = dayBlocks[i + 1].start - dayBlocks[i].end;
      if (gap > 0 && (longestGapMinutes == null || gap > longestGapMinutes)) {
        longestGapMinutes = gap;
        longestGapDayKey = day;
      }
    }
  }

  dayLoads.sort((a, b) => b.minutes - a.minutes);
  const heaviest = dayLoads[0];
  const lightest = dayLoads.length > 1 ? dayLoads[dayLoads.length - 1] : dayLoads[0];

  const lunchByDay: DayLunchWindow[] = dayKeys.map((day) => {
    const dayBlocks = [...(byDay.get(day) ?? [])].sort((a, b) => a.start - b.start);
    const best = bestLunchSlot(dayBlocks);
    const durationMinutes = best?.duration ?? 0;
    return {
      day,
      dayLabel: DAY_LABEL[day] ?? day,
      start: best?.start ?? null,
      end: best?.end ?? null,
      durationMinutes,
      kind: lunchKind(durationMinutes),
    };
  });

  return {
    hasClash,
    campusDays: dayKeys.length,
    totalClassMinutes,
    longestGapMinutes,
    longestGapDay: longestGapDayKey
      ? { day: longestGapDayKey, dayLabel: DAY_LABEL[longestGapDayKey] ?? longestGapDayKey }
      : null,
    earliestStart,
    latestStart,
    latestEnd,
    heaviestDay: heaviest
      ? { day: heaviest.day, dayLabel: DAY_LABEL[heaviest.day] ?? heaviest.day, minutes: heaviest.minutes }
      : null,
    lightestDay: lightest
      ? { day: lightest.day, dayLabel: DAY_LABEL[lightest.day] ?? lightest.day, minutes: lightest.minutes }
      : null,
    lunch: {
      daysWithLunch: lunchByDay.filter((d) => d.kind === "lunch").length,
      daysWithQuick: lunchByDay.filter((d) => d.kind === "quick").length,
      daysWithNone: lunchByDay.filter((d) => d.kind === "none").length,
      daysWithClasses: dayKeys.length,
      byDay: lunchByDay,
    },
  };
}

export function lunchKind(durationMinutes: number): LunchKind {
  if (durationMinutes >= MIN_LUNCH_MINUTES) return "lunch";
  if (durationMinutes >= MIN_QUICK_BREAK_MINUTES) return "quick";
  return "none";
}

export function lunchKindLabel(kind: LunchKind): string {
  switch (kind) {
    case "lunch":
      return "Lunch break";
    case "quick":
      return "Quick break";
    case "none":
      return "No lunch break";
  }
}

function collectBlocks(sections: SectionLike[]): TimeBlock[] {
  const out: TimeBlock[] = [];
  for (const section of sections) {
    const [start, end] = parseTimeRange(section.times ?? "");
    if (start == null || end == null || start >= end) continue;
    for (const day of parseSectionDays(section.days)) {
      out.push({ day, start, end });
    }
  }
  return out;
}

function groupByDay(blocks: TimeBlock[]): Map<string, TimeBlock[]> {
  const map = new Map<string, TimeBlock[]>();
  for (const b of blocks) {
    const list = map.get(b.day) ?? [];
    list.push(b);
    map.set(b.day, list);
  }
  return map;
}

function detectClash(byDay: Map<string, TimeBlock[]>): boolean {
  for (const dayBlocks of byDay.values()) {
    const sorted = [...dayBlocks].sort((a, b) => a.start - b.start);
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[i].start < sorted[j].end && sorted[j].start < sorted[i].end) {
          return true;
        }
      }
    }
  }
  return false;
}

/** Longest free interval inside the lunch window, given class blocks that day. */
function bestLunchSlot(
  dayBlocks: TimeBlock[],
): { start: number; end: number; duration: number } | null {
  const occupied = dayBlocks
    .map((b) => ({
      start: Math.max(b.start, LUNCH_WINDOW_START),
      end: Math.min(b.end, LUNCH_WINDOW_END),
    }))
    .filter((b) => b.start < b.end)
    .sort((a, b) => a.start - b.start);

  const merged: { start: number; end: number }[] = [];
  for (const b of occupied) {
    const last = merged[merged.length - 1];
    if (last && b.start <= last.end) {
      last.end = Math.max(last.end, b.end);
    } else {
      merged.push({ ...b });
    }
  }

  let cursor = LUNCH_WINDOW_START;
  let best: { start: number; end: number; duration: number } | null = null;
  const consider = (start: number, end: number) => {
    const duration = end - start;
    if (duration <= 0) return;
    if (!best || duration > best.duration) {
      best = { start, end, duration };
    }
  };

  for (const b of merged) {
    consider(cursor, b.start);
    cursor = Math.max(cursor, b.end);
  }
  consider(cursor, LUNCH_WINDOW_END);
  return best;
}

export function parseTimeRange(value: string): [number | null, number | null] {
  if (!value.includes("-")) return [null, null];
  const [startRaw, endRaw] = value.split("-");
  return [parseClock(startRaw.trim()), parseClock(endRaw.trim())];
}

function parseClock(value: string): number | null {
  const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const modifier = match[3].toUpperCase();
  if (modifier === "AM") {
    hour = hour % 12;
  } else {
    hour = (hour % 12) + 12;
  }
  return hour * 60 + minute;
}

export function formatMinutesClock(total: number): string {
  const hour24 = Math.floor(total / 60) % 24;
  const minute = total % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = ((hour24 + 11) % 12) + 1;
  return `${hour12}:${minute.toString().padStart(2, "0")} ${suffix}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatHoursTotal(minutes: number): string {
  const hours = minutes / 60;
  if (Number.isInteger(hours)) return `${hours}h`;
  return `${hours.toFixed(1).replace(/\.0$/, "")}h`;
}
