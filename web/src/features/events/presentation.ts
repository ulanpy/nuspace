export type EventTimingKind = "upcoming" | "ongoing" | "finished"

export interface EventTiming {
  kind: EventTimingKind
  label: string
  detail: string
}

function formatDuration(milliseconds: number): string {
  const minutes = Math.max(0, Math.floor(milliseconds / 60_000))
  const days = Math.floor(minutes / (24 * 60))
  const hours = Math.floor((minutes % (24 * 60)) / 60)
  const remainingMinutes = minutes % 60

  if (days > 0)
    return `${String(days)}d${hours > 0 ? ` ${String(hours)}h` : ""}`
  if (hours > 0) {
    return `${String(hours)}h${
      remainingMinutes > 0 ? ` ${String(remainingMinutes)}m` : ""
    }`
  }
  return `${String(Math.max(1, remainingMinutes))}m`
}

export function getEventTiming(
  start: string,
  end: string,
  now = Date.now()
): EventTiming {
  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()

  if (endTime <= now) {
    return {
      kind: "finished",
      label: "Finished",
      detail: `Ended ${formatDuration(now - endTime)} ago`,
    }
  }

  if (startTime <= now) {
    return {
      kind: "ongoing",
      label: "Happening now",
      detail: `${formatDuration(endTime - now)} left`,
    }
  }

  return {
    kind: "upcoming",
    label: "Starts in",
    detail: formatDuration(startTime - now),
  }
}

export function eventPolicyLabel(policy: "open" | "registration"): string {
  return policy === "registration" ? "Registration required" : "Open entry"
}
