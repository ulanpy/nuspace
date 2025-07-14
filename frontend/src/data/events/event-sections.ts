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
    link: "/apps/nu-events/featured",
    events: featuredEvents,
  },
  {
    title: "Today's Events",
    link: "/apps/nu-events/today",
    events: todayEvents,
  },
  {
    title: "Academic Events",
    link: "/apps/nu-events/Academic",
    events: academicEvents,
  },
  {
    title: "Cultural Events",
    link: "/apps/nu-events/cultural",
    events: culturalEvents,
  },
  {
    title: "Sport Events",
    link: "/apps/nu-events/sports",
    events: sportsEvents,
  },
  {
    title: "Social & Recreational Events",
    link: "/apps/nu-events/social",
    events: socialEvents,
  },
];
