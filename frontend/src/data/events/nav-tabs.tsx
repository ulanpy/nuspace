import { CalendarDays, Home, Users } from "lucide-react";

export const navTabs = [
  {
    label: "Home",
    path: "/apps/campuscurrent",
    icon: <Home className="h-4 w-4" />,
  },
  {
    label: "Events",
    path: "/apps/campuscurrent/events",
    icon: <CalendarDays className="h-4 w-4" />,
  },
  {
    label: "Clubs",
    path: "/apps/campuscurrent/clubs",
    icon: <Users className="h-4 w-4" />,
  },
];
