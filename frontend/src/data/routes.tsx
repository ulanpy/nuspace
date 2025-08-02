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
export const KUPI_PRODAI = "kupi-prodai";
export const CAMPUS_CURRENT = "campuscurrent";
export const DORM_EATS = "dorm-eats";
export const POSTS = "posts";
export const ABOUT = "about";
export const EVENTS = "events";
export const EVENT = "event";
export const COMMUNITY = "community";
export const COMMUNITIES = "communities";

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
    KUPI_PRODAI: {
      ROOT: buildPath(APPS, KUPI_PRODAI),
      PRODUCT: {
        DETAIL: buildPath(APPS, KUPI_PRODAI, PRODUCT, ":id"),
        DETAIL_FN: (id: string) =>
          buildPath(APPS, KUPI_PRODAI, PRODUCT, id),
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
    DORM_EATS: {
      ROOT: buildPath(APPS, DORM_EATS),
    },
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
    KUPI_PRODAI_ROOT: KUPI_PRODAI,
    KUPI_PRODAI_PRODUCT_DETAIL: `${KUPI_PRODAI}/${PRODUCT}/:id`,
    ABOUT: ABOUT,
    DORM_EATS: DORM_EATS,
    CAMPUS_CURRENT_ROOT: CAMPUS_CURRENT,
    CAMPUS_CURRENT_EVENTS: `${CAMPUS_CURRENT}/${EVENTS}`,
    CAMPUS_CURRENT_EVENT_DETAIL: `${CAMPUS_CURRENT}/${EVENT}/:id`,
    CAMPUS_CURRENT_COMMUNITY_DETAIL: `${CAMPUS_CURRENT}/${COMMUNITY}/:id`,
    CAMPUS_CURRENT_COMMUNITIES: `${CAMPUS_CURRENT}/${COMMUNITIES}`,
  },
};
export const LazyRoutes = {
  APPS: {
    BASIC: [
      {
        path: LAZY_ROUTES_REL.APPS.KUPI_PRODAI_ROOT,
        Component: withSuspense(lazy(() => import("@/modules/kupi-prodai/pages/kupi-prodai"))),
      },
      {
        path: LAZY_ROUTES_REL.APPS.KUPI_PRODAI_PRODUCT_DETAIL,
        Component: withSuspense(
          lazy(() => import("@/modules/kupi-prodai/pages/product/[id]")),
        ),
      },
      {
        path: LAZY_ROUTES_REL.APPS.ABOUT,
        Component: withSuspense(lazy(() => import("@/pages/apps/about"))),
      },
      {
        path: LAZY_ROUTES_REL.APPS.DORM_EATS,
        Component: withSuspense(lazy(() => import("@/pages/apps/dorm-eats"))),
      },
    ],
    EVENTS: [
      {
        path: LAZY_ROUTES_REL.APPS.CAMPUS_CURRENT_ROOT,
        Component: withSuspense(
          lazy(() => import("@/pages/apps/campuscurrent")),
        ),
      },
      {
        path: LAZY_ROUTES_REL.APPS.CAMPUS_CURRENT_EVENTS,
        Component: withSuspense(
          lazy(() => import("@/pages/apps/campuscurrent/events")),
        ),
      },
      {
        path: LAZY_ROUTES_REL.APPS.CAMPUS_CURRENT_EVENT_DETAIL,
        Component: withSuspense(
          lazy(() => import("@/pages/apps/campuscurrent/event/[id]")),
        ),
      },
      {
        path: LAZY_ROUTES_REL.APPS.CAMPUS_CURRENT_COMMUNITY_DETAIL,
        Component: withSuspense(
          lazy(() => import("@/pages/apps/campuscurrent/club/[id]")),
        ),
      },
      {
        path: LAZY_ROUTES_REL.APPS.CAMPUS_CURRENT_COMMUNITIES,
        Component: withSuspense(
          lazy(() => import("@/pages/apps/campuscurrent/clubs")),
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
