import { withSuspense } from "@/components/molecules/hoc/with-suspense";
import { lazy } from "react";
import { LayoutDashboard, Package, Users } from "lucide-react";

// --- Path Segments ---
export const ADMIN = "admin";
export const APPS = "apps";
export const PRODUCTS = "products";
export const USERS = "users";
export const PRODUCT = "product";
export const USER = "user";
export const MARKETPLACE = "marketplace";
export const CAMPUS_CURRENT = "campuscurrent";
export const COURSES = "courses";
export const DORM_EATS = "dorm-eats";
export const CONTACTS = "contacts";
export const POSTS = "posts";
export const PROFILE = "profile";
export const ABOUT = "about";
export const EVENTS = "events";
export const EVENT = "event";
export const COMMUNITY = "community";
export const COMMUNITIES = "communities";
export const CREATE = "create";
export const SGOTINISH = "sgotinish";
export const STUDENT = "student";
export const SG = "sg";
export const TICKET = "ticket";


// --- Helper to build paths ---
const buildPath = (...args: string[]) => `/${args.filter(Boolean).join("/")}`;

export const ROUTES = {
  HOME: buildPath(""),
  ADMIN: {
    ROOT: buildPath(ADMIN),
    DASHBOARD: {
      path: buildPath(ADMIN),
      icon: <LayoutDashboard size={20} />,
      label: "Dashboard",
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
  APPS: {
    ROOT: buildPath(APPS),
    ABOUT: buildPath(APPS, ABOUT),
    PROFILE: buildPath(APPS, PROFILE),
    CONTACTS: {
      ROOT: buildPath(APPS, CONTACTS),
    },
    MARKETPLACE: {
      ROOT: buildPath(APPS, MARKETPLACE),
      CREATE: buildPath(APPS, MARKETPLACE, CREATE),
      PRODUCT: {
        DETAIL: buildPath(APPS, MARKETPLACE, PRODUCT, ":id"),
        DETAIL_FN: (id: string) =>
          buildPath(APPS, MARKETPLACE, PRODUCT, id),
      },
    },
    CAMPUS_CURRENT: {
      ROOT: buildPath(APPS, CAMPUS_CURRENT),
      EVENTS: buildPath(APPS, CAMPUS_CURRENT, EVENTS),
      EVENT: {
        DETAIL: buildPath(APPS, CAMPUS_CURRENT, EVENT, ":id"),
        DETAIL_FN: (id: string) =>
          buildPath(APPS, CAMPUS_CURRENT, EVENT, id),
      },
      COMMUNITIES: buildPath(APPS, CAMPUS_CURRENT, COMMUNITIES),
      COMMUNITY: {
        DETAIL: buildPath(APPS, CAMPUS_CURRENT, COMMUNITY, ":id"),
        DETAIL_FN: (id: string) => buildPath(APPS, CAMPUS_CURRENT, COMMUNITY, id),
      },
      POSTS: buildPath(APPS, CAMPUS_CURRENT, POSTS),
    },
    COMMUNITIES: {
      ROOT: buildPath(APPS, COMMUNITIES),
      COMMUNITY: {
        DETAIL: buildPath(APPS, COMMUNITIES, COMMUNITY, ":id"),
        DETAIL_FN: (id: string) => buildPath(APPS, COMMUNITIES, COMMUNITY, id),
      },
    },
    COURSES: {
      ROOT: buildPath(APPS, COURSES),
    },
    DORM_EATS: {
      ROOT: buildPath(APPS, DORM_EATS),
    },
    SGOTINISH: {
      ROOT: buildPath(APPS, SGOTINISH),
      STUDENT: {
        ROOT: buildPath(APPS, SGOTINISH, STUDENT),
        TICKET: {
          DETAIL: buildPath(APPS, SGOTINISH, STUDENT, TICKET, ":id"),
          DETAIL_FN: (id: string) => buildPath(APPS, SGOTINISH, STUDENT, TICKET, id),
        },
      },
      SG: {
        ROOT: buildPath(APPS, SGOTINISH, SG),
        TICKET: {
          DETAIL: buildPath(APPS, SGOTINISH, SG, TICKET, ":id"),
          DETAIL_FN: (id: string) => buildPath(APPS, SGOTINISH, SG, TICKET, id),
        },
      },
    }
  },
};

// For lazy loading, we use relative paths
const LAZY_ROUTES_REL = {
  ADMIN: {
    PRODUCTS: PRODUCTS,
    PRODUCT_DETAIL: `${PRODUCT}/:id`,
    USERS: USERS,
    USER_DETAIL: `${USER}/:id`,
  },
  APPS: {
    PROFILE: PROFILE,
    CONTACTS: CONTACTS,
    MARKETPLACE_ROOT: MARKETPLACE,
    MARKETPLACE_CREATE: `${MARKETPLACE}/${CREATE}`,
    MARKETPLACE_PRODUCT_DETAIL: `${MARKETPLACE}/${PRODUCT}/:id`,
    ABOUT: ABOUT,
    COURSES: COURSES,
    DORM_EATS: DORM_EATS,
    SGOTINISH: SGOTINISH,
    SGOTINISH_STUDENT_ROOT: `${SGOTINISH}/${STUDENT}`,
    SGOTINISH_STUDENT_TICKET_DETAIL: `${SGOTINISH}/${STUDENT}/${TICKET}/:id`,
    SGOTINISH_SG_ROOT: `${SGOTINISH}/${SG}`,
    SGOTINISH_SG_TICKET_DETAIL: `${SGOTINISH}/${SG}/${TICKET}/:id`,
    CAMPUS_CURRENT_ROOT: CAMPUS_CURRENT,
    CAMPUS_CURRENT_EVENTS: `${CAMPUS_CURRENT}/${EVENTS}`,
    CAMPUS_CURRENT_EVENT_DETAIL: `${CAMPUS_CURRENT}/${EVENT}/:id`,
    CAMPUS_CURRENT_COMMUNITY_DETAIL: `${CAMPUS_CURRENT}/${COMMUNITY}/:id`,
    CAMPUS_CURRENT_COMMUNITIES: `${CAMPUS_CURRENT}/${COMMUNITIES}`,
    CAMPUS_CURRENT_POSTS: `${CAMPUS_CURRENT}/${POSTS}`,
    COMMUNITIES_ROOT: COMMUNITIES,
    COMMUNITIES_COMMUNITY_DETAIL: `${COMMUNITIES}/${COMMUNITY}/:id`,
  },
};
export const LazyRoutes = {
  APPS: {
    BASIC: [
      {
        path: LAZY_ROUTES_REL.APPS.MARKETPLACE_ROOT,
        Component: withSuspense(lazy(() => import("@/features/marketplace/pages/home"))),
      },

      {
        path: LAZY_ROUTES_REL.APPS.MARKETPLACE_PRODUCT_DETAIL,
        Component: withSuspense(
          lazy(() => import("@/features/marketplace/pages/product/[id]")),
        ),
      },
      {
        path: LAZY_ROUTES_REL.APPS.ABOUT,
        Component: withSuspense(lazy(() => import("@/pages/about"))),
      },
      {
        path: LAZY_ROUTES_REL.APPS.PROFILE,
        Component: withSuspense(lazy(() => import("@/pages/profile"))),
      },
      {
        path: LAZY_ROUTES_REL.APPS.COURSES,
        Component: withSuspense(lazy(() => import("@/features/courses/pages/GradeStatisticsPage"))),
      },
      {
        path: LAZY_ROUTES_REL.APPS.DORM_EATS,
        Component: withSuspense(lazy(() => import("@/pages/apps/dorm-eats"))),
      },
      {
        path: LAZY_ROUTES_REL.APPS.CONTACTS,
        Component: withSuspense(lazy(() => import("@/pages/apps/contacts"))),
      },
      {
        path: LAZY_ROUTES_REL.APPS.SGOTINISH,
        Component: withSuspense(lazy(() => import("@/features/sgotinish/pages/SgotinishPage"))),
      },
      {
        path: LAZY_ROUTES_REL.APPS.SGOTINISH_STUDENT_ROOT,
        Component: withSuspense(lazy(() => import("@/features/sgotinish/components/StudentDashboard"))),
      },
      {
        path: LAZY_ROUTES_REL.APPS.SGOTINISH_STUDENT_TICKET_DETAIL,
        Component: withSuspense(lazy(() => import("@/features/sgotinish/components/TicketDetail"))),
      },
      {
        path: LAZY_ROUTES_REL.APPS.SGOTINISH_SG_ROOT,
        Component: withSuspense(lazy(() => import("@/features/sgotinish/components/SGDashboard"))),
      },
      {
        path: LAZY_ROUTES_REL.APPS.SGOTINISH_SG_TICKET_DETAIL,
        Component: withSuspense(lazy(() => import("@/features/sgotinish/components/TicketDetail"))),
      },
      {
        path: LAZY_ROUTES_REL.APPS.CAMPUS_CURRENT_POSTS,
        Component: withSuspense(
          lazy(() => import("@/features/subspace/pages/list")),
        ),
      },
      {
        path: LAZY_ROUTES_REL.APPS.COMMUNITIES_ROOT,
        Component: withSuspense(
          lazy(() => import("@/features/communities/pages/list")),
        ),
      },
      {
        path: LAZY_ROUTES_REL.APPS.COMMUNITIES_COMMUNITY_DETAIL,
        Component: withSuspense(
          lazy(() => import("@/features/communities/pages/single")),
        ),
      },
    ],
    EVENTS: [
      {
        path: LAZY_ROUTES_REL.APPS.CAMPUS_CURRENT_EVENTS,
        Component: withSuspense(
          lazy(() => import("@/features/events/pages/list")),
        ),
      },
      {
        path: LAZY_ROUTES_REL.APPS.CAMPUS_CURRENT_EVENT_DETAIL,
        Component: withSuspense(
          lazy(() => import("@/features/events/pages/single")),
        ),
      },
      {
        path: LAZY_ROUTES_REL.APPS.CAMPUS_CURRENT_COMMUNITY_DETAIL,
        Component: withSuspense(
          lazy(() => import("@/features/communities/pages/single")),
        ),
      },
      {
        path: LAZY_ROUTES_REL.APPS.CAMPUS_CURRENT_COMMUNITIES,
        Component: withSuspense(
          lazy(() => import("@/features/communities/pages/list")),
        ),
      },
      {
        path: LAZY_ROUTES_REL.APPS.CAMPUS_CURRENT_COMMUNITIES,
        Component: withSuspense(
          lazy(() => import("@/features/communities/pages/list")),
        ),
      },
    ],
  },
  ADMINS: [
    {
      path: LAZY_ROUTES_REL.ADMIN.PRODUCTS,
      Component: withSuspense(
        lazy(() => import("@/pages/admin/products-page")),
      ),
    },
    {
      path: LAZY_ROUTES_REL.ADMIN.PRODUCT_DETAIL,
      Component: withSuspense(
        lazy(() => import("@/pages/admin/product-detail-page")),
      ),
    },
    {
      path: LAZY_ROUTES_REL.ADMIN.USERS,
      Component: withSuspense(lazy(() => import("@/pages/admin/users-page"))),
    },
    {
      path: LAZY_ROUTES_REL.ADMIN.USER_DETAIL,
      Component: withSuspense(lazy(() => import("@/pages/admin/user-page"))),
    },
  ],
};
