import type { ScheduleItem, StudentSchedule } from "./types"

export interface ScheduleDay {
  label: string
  items: ScheduleItem[]
}

const DAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const

function minutes(item: ScheduleItem): number {
  return item.time.start.hh * 60 + item.time.start.mm
}

function identity(item: ScheduleItem): string {
  return [
    item.course_code,
    item.label,
    item.title,
    item.teacher,
    item.cab,
    item.time.start.hh,
    item.time.start.mm,
    item.time.end.hh,
    item.time.end.mm,
  ].join("|")
}

export function scheduleDays(schedule: StudentSchedule): ScheduleDay[] {
  return DAY_LABELS.map((label, index) => {
    const unique = new Map<string, ScheduleItem>()
    for (const item of schedule.schedule.data[index] ?? []) {
      unique.set(identity(item), item)
    }
    return {
      label,
      items: [...unique.values()].sort((a, b) => minutes(a) - minutes(b)),
    }
  })
}

export function formatScheduleTime(item: ScheduleItem): string {
  const format = ({ hh, mm }: { hh: number; mm: number }) =>
    `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`
  return `${format(item.time.start)}–${format(item.time.end)}`
}
