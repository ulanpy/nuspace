import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";

export const addToGoogleCalendar = (
  event: NuEvents.Event,
  setPendingAction: (action: () => void) => void,
  setShowLoginModal: (show: boolean) => void
) => {
  const { toast } = useToast();
  const user = useUser();
  if (!user) {
    setPendingAction(() =>
      addToGoogleCalendar(event, setPendingAction, setShowLoginModal)
    );
    setShowLoginModal(true);
    return;
  }

  const eventDate = new Date(event.event_datetime);
  const endDate = new Date(eventDate.getTime() + event.duration * 60000);

  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    event.name
  )}&dates=${eventDate
    .toISOString()
    .replace(/-|:|\.\d+/g, "")
    .slice(0, -1)}/${endDate
    .toISOString()
    .replace(/-|:|\.\d+/g, "")
    .slice(0, -1)}&details=${encodeURIComponent(
    event.description
  )}&location=${encodeURIComponent(event.place)}`;

  window.open(googleCalendarUrl, "_blank");

  toast({
    title: "Success",
    description: "Event added to your Google Calendar",
  });
};
