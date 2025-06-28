import { CalendarDays, Home, Users } from "lucide-react";

export const navTabs = [
    {
      label: "Home",
      path: "/apps/nu-events",
      icon: <Home className="h-4 w-4" />,
    },
    {
      label: "Events",
      path: "/apps/nu-events/events",
      icon: <CalendarDays className="h-4 w-4" />,
    },
    {
      label: "Clubs",
      path: "/apps/nu-events/clubs",
      icon: <Users className="h-4 w-4" />,
    },
  ];