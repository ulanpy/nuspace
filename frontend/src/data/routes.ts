/**
 * Route constants for the application.
 * These are simple path strings used for navigation with Next.js.
 */

// API path segments (used for API calls)
export const EVENTS = "events";
export const COMMUNITIES = "communities";

export const ROUTES = {
  HOME: "/",
  ANNOUNCEMENTS: "/announcements",
  PRIVACY_POLICY: "/privacy-policy",
  TERMS_OF_SERVICE: "/terms-of-service",
  ABOUT: "/about",
  PROFILE: "/profile",
  CONTACTS: "/contacts",
  COURSES: "/courses",
  DEGREE_AUDIT_INFO: "/degree-audit-info",
  DORM_EATS: "/dorm-eats",
  EVENTS: {
    ROOT: "/events",
    DETAIL: "/events/:id",
    DETAIL_FN: (id: string | number) => `/events/${id}`,
  },
  OPPORTUNITIES: {
    ROOT: "/opportunities",
  },
  COMMUNITIES: {
    ROOT: "/communities",
    DETAIL: "/communities/:id",
    DETAIL_FN: (id: string | number) => `/communities/${id}`,
  },
  SGOTINISH: {
    ROOT: "/sgotinish",
    STUDENT: {
      ROOT: "/sgotinish/student",
      TICKET: {
        DETAIL: "/sgotinish/student/ticket/:id",
        DETAIL_FN: (id: string | number) => `/sgotinish/student/ticket/${id}`,
      },
    },
    SG: {
      ROOT: "/sgotinish/sg",
      TICKET: {
        DETAIL: "/sgotinish/sg/ticket/:id",
        DETAIL_FN: (id: string | number) => `/sgotinish/sg/ticket/${id}`,
      },
    },
  },
};

export default ROUTES;
