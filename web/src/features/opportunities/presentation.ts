import { CAMPUS_TIME_ZONE } from "../../lib/datetime.ts"

export type DeadlineKind = "year-round" | "open" | "closing-soon" | "closed"

export interface DeadlinePresentation {
  kind: DeadlineKind
  label: string
  relative: string | null
}

const DAY = 24 * 60 * 60 * 1000
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

function roundedDays(milliseconds: number): number {
  return Math.max(1, Math.ceil(Math.abs(milliseconds) / DAY))
}

function campusDateOrdinal(now: number): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAMPUS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(now))
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)

  return Date.UTC(value("year"), value("month") - 1, value("day"))
}

function dateOnlyPresentation(
  match: RegExpExecArray,
  now: number
): DeadlinePresentation {
  const deadlineOrdinal = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  )
  const days = Math.round((deadlineOrdinal - campusDateOrdinal(now)) / DAY)

  if (days < 0) {
    const elapsed = Math.abs(days)
    return {
      kind: "closed",
      label: "Closed",
      relative: `Closed ${String(elapsed)} ${
        elapsed === 1 ? "day" : "days"
      } ago`,
    }
  }

  return {
    kind: days <= 7 ? "closing-soon" : "open",
    label: days <= 7 ? "Closing soon" : "Open",
    relative:
      days === 0
        ? "Closes today"
        : `Closes in ${String(days)} ${days === 1 ? "day" : "days"}`,
  }
}

export function getDeadlinePresentation(
  deadline: string | null | undefined,
  now = Date.now()
): DeadlinePresentation {
  if (!deadline) {
    return { kind: "year-round", label: "Year-round", relative: null }
  }

  const dateOnly = DATE_ONLY.exec(deadline)
  if (dateOnly) return dateOnlyPresentation(dateOnly, now)

  const deadlineTime = new Date(deadline).getTime()
  if (Number.isNaN(deadlineTime)) {
    return { kind: "year-round", label: "Year-round", relative: null }
  }

  const remaining = deadlineTime - now
  if (remaining < 0) {
    const days = roundedDays(remaining)
    return {
      kind: "closed",
      label: "Closed",
      relative: `Closed ${String(days)} ${days === 1 ? "day" : "days"} ago`,
    }
  }

  const days = roundedDays(remaining)
  return {
    kind: remaining <= 7 * DAY ? "closing-soon" : "open",
    label: remaining <= 7 * DAY ? "Closing soon" : "Open",
    relative: `Closes in ${String(days)} ${days === 1 ? "day" : "days"}`,
  }
}
