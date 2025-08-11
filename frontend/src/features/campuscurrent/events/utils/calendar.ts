import { Event } from "../../types/types";

export const addToGoogleCalendar = (event: Event) => {
  const eventDate = new Date(event.event_datetime);
  const endDate = new Date(eventDate.getTime() + event.duration * 60000);

  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    event.name,
  )}&dates=${eventDate
    .toISOString()
    .replace(/-|:|\.\d+/g, "")}/${endDate
    .toISOString()
    .replace(/-|:|\.\d+/g, "")}&details=${encodeURIComponent(
    event.description,
  )}&location=${encodeURIComponent(event.place)}`;

  window.open(googleCalendarUrl, "_blank");
};
