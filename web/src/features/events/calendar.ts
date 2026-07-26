interface CalendarEvent {
  name: string
  start_datetime: string
  end_datetime: string
  place: string
  description?: string | null
}

function googleInstant(value: string): string {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z")
}

export function eventGoogleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.name,
    dates: `${googleInstant(event.start_datetime)}/${googleInstant(event.end_datetime)}`,
    location: event.place,
  })
  if (event.description) params.set("details", event.description)
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
