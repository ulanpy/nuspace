/** Deterministic pseudo-random from course id (stable across reloads). */
function seededUnit(seed: number, salt: number) {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export type WeekDayHours = {
  key: string;
  label: string;
  hours: number;
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Mock weekly target from credits, with a small seeded wobble. */
export function mockWeeklyTargetHours(courseId: number, credits?: number | null) {
  const base = Math.max(4, (credits ?? 4) * 2);
  const wobble = Math.round(seededUnit(courseId, 1) * 4) - 1;
  return Math.max(4, base + wobble);
}

/** Seven daily values that roughly sum toward a realistic week total. */
export function mockWeekDayHours(courseId: number, weekTotal: number): WeekDayHours[] {
  const weights = DAY_LABELS.map((_, index) => {
    // Weekdays higher than weekends
    const weekdayBoost = index < 5 ? 1.2 : 0.55;
    return seededUnit(courseId, index + 3) * weekdayBoost + 0.15;
  });
  const weightSum = weights.reduce((a, b) => a + b, 0);

  return DAY_LABELS.map((label, index) => {
    const raw = (weights[index] / weightSum) * weekTotal;
    // Round to 0.5h
    const hours = Math.round(raw * 2) / 2;
    return { key: `${courseId}-${label}`, label, hours };
  });
}

export function mockInitialWeekTotal(courseId: number, target: number) {
  const ratio = 0.35 + seededUnit(courseId, 2) * 0.55;
  return Math.round(target * ratio * 2) / 2;
}

export function sumDayHours(days: WeekDayHours[]) {
  return Math.round(days.reduce((acc, day) => acc + day.hours, 0) * 2) / 2;
}
