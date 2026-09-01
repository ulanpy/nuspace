/**
 * Datetime handling at the API boundary.
 *
 * The backend treats a naive datetime as Almaty local time and converts it to
 * UTC on the way in (`almaty_to_utc` in backend/common/datetime_utils.py). So
 * a value sent without an offset is interpreted in Almaty, not in the user's
 * timezone and not in UTC.
 *
 * Conversions belong here rather than in components, so there is exactly one
 * place where a mistake can hide.
 */

export const CAMPUS_TIME_ZONE = "Asia/Almaty"

/**
 * Formats an instant in campus time. Events happen on campus, so a student
 * travelling abroad should still see the local start time of the event.
 */
export function formatCampusDateTime(
  iso: string,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  }
): string {
  return new Intl.DateTimeFormat("en-GB", {
    ...options,
    timeZone: CAMPUS_TIME_ZONE,
  }).format(new Date(iso))
}

export function formatCampusDate(iso: string): string {
  return formatCampusDateTime(iso, { dateStyle: "medium" })
}

export function formatCampusTime(iso: string): string {
  return formatCampusDateTime(iso, { timeStyle: "short" })
}

/**
 * Splits an instant into the calendar fields a date/time input expects,
 * expressed in campus time — `new Date().toISOString().slice(0, 16)` would
 * silently use the browser's timezone instead.
 */
export function toCampusInputValue(iso: string): {
  date: string
  time: string
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAMPUS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso))

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00"

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    // Intl renders midnight as "24" in some engines.
    time: `${get("hour") === "24" ? "00" : get("hour")}:${get("minute")}`,
  }
}

/**
 * Builds the naive datetime string the backend expects from form fields.
 * Deliberately carries no offset: the backend applies Almaty itself, and
 * appending "Z" here would shift every submitted time by the UTC offset.
 */
export function toCampusNaiveDateTime(date: string, time: string): string {
  return `${date}T${time.length === 5 ? `${time}:00` : time}`
}

/** Whether an instant has already passed. */
export function isPast(iso: string): boolean {
  return new Date(iso).getTime() < Date.now()
}

/**
 * Coarse relative time ("in 3 days", "2 hours ago") via Intl, so it localises
 * correctly rather than through hand-written string concatenation.
 */
const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 1000 * 60 * 60 * 24 * 365],
  ["month", 1000 * 60 * 60 * 24 * 30],
  ["day", 1000 * 60 * 60 * 24],
  ["hour", 1000 * 60 * 60],
  ["minute", 1000 * 60],
]

export function formatRelative(iso: string, now: number = Date.now()): string {
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
  const diff = new Date(iso).getTime() - now

  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(diff) >= ms) {
      return formatter.format(Math.round(diff / ms), unit)
    }
  }
  return formatter.format(Math.round(diff / 1000), "second")
}
