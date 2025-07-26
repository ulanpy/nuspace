import {
  academicEvents,
  culturalEvents,
  featuredEvents,
  socialEvents,
  sportsEvents,
  todayEvents,
} from "./mock-events-data";

export const eventSections = [
  {
    title: "Featured Events",
    link: "/apps/campuscurrent/featured",
    events: featuredEvents,
  },
  {
    title: "Today's Events",
    link: "/apps/campuscurrent/today",
    events: todayEvents,
  },
  {
    title: "Academic Events",
    link: "/apps/campuscurrent/Academic",
    events: academicEvents,
  },
  {
    title: "Cultural Events",
    link: "/apps/campuscurrent/cultural",
    events: culturalEvents,
  },
  {
    title: "Sport Events",
    link: "/apps/campuscurrent/sports",
    events: sportsEvents,
  },
  {
    title: "Social & Recreational Events",
    link: "/apps/campuscurrent/social",
    events: socialEvents,
  },
];
