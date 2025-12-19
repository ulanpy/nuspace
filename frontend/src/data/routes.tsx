import { withSuspense } from "@/components/molecules/hoc/with-suspense";
import { lazy } from "react";
import type { ComponentType, LazyExoticComponent } from "react";
import { Megaphone, Package, Users } from "lucide-react";

// --- Path Segments ---
export const ADMIN = "admin";
export const PRODUCTS = "products";
export const PRODUCT = "product";
export const USERS = "users";
export const USER = "user";
export const ABOUT = "about";
export const PROFILE = "profile";
export const CONTACTS = "contacts";
export const COURSES = "courses";
export const DEGREE_AUDIT_INFO = "degree-audit-info";
export const DORM_EATS = "dorm-eats";
export const EVENTS = "events";
export const COMMUNITIES = "communities";
export const SGOTINISH = "sgotinish";
export const STUDENT = "student";
export const SG = "sg";
export const TICKET = "ticket";
export const ANNOUNCEMENTS = "announcements";
export const PRIVACY_POLICY = "privacy-policy";

// --- Helper to build paths ---
const buildPath = (...args: string[]) => `/${args.filter(Boolean).join("/")}`;

export const ROUTES = {
  HOME: buildPath(""),
  ANNOUNCEMENTS: buildPath(ANNOUNCEMENTS),
  PRIVACY_POLICY: buildPath(PRIVACY_POLICY),
  ABOUT: buildPath(ABOUT),
  PROFILE: buildPath(PROFILE),
  CONTACTS: buildPath(CONTACTS),
  COURSES: buildPath(COURSES),
  DEGREE_AUDIT_INFO: buildPath(DEGREE_AUDIT_INFO),
  DORM_EATS: buildPath(DORM_EATS),
  EVENTS: {
    ROOT: buildPath(EVENTS),
    DETAIL: buildPath(EVENTS, ":id"),
    DETAIL_FN: (id: string) => buildPath(EVENTS, id),
  },
  COMMUNITIES: {
    ROOT: buildPath(COMMUNITIES),
    DETAIL: buildPath(COMMUNITIES, ":id"),
    DETAIL_FN: (id: string) => buildPath(COMMUNITIES, id),
  },
  SGOTINISH: {
    ROOT: buildPath(SGOTINISH),
    STUDENT: {
      ROOT: buildPath(SGOTINISH, STUDENT),
      TICKET: {
        DETAIL: buildPath(SGOTINISH, STUDENT, TICKET, ":id"),
        DETAIL_FN: (id: string) => buildPath(SGOTINISH, STUDENT, TICKET, id),
      },
    },
    SG: {
      ROOT: buildPath(SGOTINISH, SG),
      TICKET: {
        DETAIL: buildPath(SGOTINISH, SG, TICKET, ":id"),
        DETAIL_FN: (id: string) => buildPath(SGOTINISH, SG, TICKET, id),
      },
    },
  },
  ADMIN: {
    ROOT: buildPath(ADMIN),
    ANNOUNCEMENTS: {
      path: buildPath(ADMIN),
      icon: <Megaphone size={20} />,
      label: "Announcements",
    },
    PRODUCTS: {
      path: buildPath(ADMIN, PRODUCTS),
      icon: <Package size={20} />,
      label: "Products",
      DETAIL: buildPath(ADMIN, PRODUCT, ":id"),
      DETAIL_FN: (id: string) => buildPath(ADMIN, PRODUCT, id),
    },
    USERS: {
      path: buildPath(ADMIN, USERS),
      icon: <Users size={20} />,
      label: "Users",
      DETAIL: buildPath(ADMIN, USER, ":id"),
      DETAIL_FN: (id: string) => buildPath(ADMIN, USER, id),
    },
  },
};

type LazyRoute = {
  path: string;
  Component: LazyExoticComponent<ComponentType<any>>;
};

const withLazy = (importer: () => Promise<{ default: ComponentType<any> }>) =>
  withSuspense(lazy(importer));

export const LazyRoutes: {
  MAIN: LazyRoute[];
  EVENTS: LazyRoute[];
  ADMINS: LazyRoute[];
} = {
  MAIN: [
    {
      path: ROUTES.ABOUT,
      Component: withLazy(() => import("@/pages/about")),
    },
    {
      path: ROUTES.PROFILE,
      Component: withLazy(() => import("@/pages/profile")),
    },
    {
      path: ROUTES.COURSES,
      Component: withLazy(
        () => import("@/features/courses/pages/GradeStatisticsPage"),
      ),
    },
    {
      path: ROUTES.DEGREE_AUDIT_INFO,
      Component: withLazy(
        () => import("@/features/courses/pages/DegreeAuditInfoPage"),
      ),
    },
    {
      path: ROUTES.DORM_EATS,
      Component: withLazy(() => import("@/pages/apps/dorm-eats")),
    },
    {
      path: ROUTES.CONTACTS,
      Component: withLazy(() => import("@/pages/apps/contacts")),
    },
    {
      path: ROUTES.SGOTINISH.ROOT,
      Component: withLazy(
        () => import("@/features/sgotinish/pages/SgotinishPage"),
      ),
    },
    {
      path: ROUTES.SGOTINISH.STUDENT.ROOT,
      Component: withLazy(
        () => import("@/features/sgotinish/components/StudentDashboard"),
      ),
    },
    {
      path: ROUTES.SGOTINISH.STUDENT.TICKET.DETAIL,
      Component: withLazy(
        () => import("@/features/sgotinish/components/TicketDetail"),
      ),
    },
    {
      path: ROUTES.SGOTINISH.SG.ROOT,
      Component: withLazy(
        () => import("@/features/sgotinish/components/SGDashboard"),
      ),
    },
    {
      path: ROUTES.SGOTINISH.SG.TICKET.DETAIL,
      Component: withLazy(
        () => import("@/features/sgotinish/components/TicketDetail"),
      ),
    },
    {
      path: ROUTES.COMMUNITIES.ROOT,
      Component: withLazy(() => import("@/features/communities/pages/list")),
    },
    {
      path: ROUTES.COMMUNITIES.DETAIL,
      Component: withLazy(() => import("@/features/communities/pages/single")),
    },
  ],
  EVENTS: [
    {
      path: ROUTES.EVENTS.ROOT,
      Component: withLazy(() => import("@/features/events/pages/list")),
    },
    {
      path: ROUTES.EVENTS.DETAIL,
      Component: withLazy(() => import("@/features/events/pages/single")),
    },
  ],
  ADMINS: [],
};
