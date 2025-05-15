import { withSuspense } from "@/components/molecules/hoc/with-suspense";
import { lazy } from "react";

const APPS = "apps";
const KP = "kupi-prodai";
const APPSKP = `${APPS}/${KP}`;
const NU_EVENTS = "nu-events";
const DORM_EATS = "dorm-eats";
const ABOUT = "about";
const ADMIN = "admin";
const PRODUCT = "product";
const PRODUCTS = "products";
const USERS = "users";
const USER = "user";
export const ROUTES = {
  HOME: "/",
  APPS: {
    BASEURL: APPS,
    KP: `${APPSKP}`,
    KP_PRODUCT_ID: `${APPSKP}/product`,
    NU_EVENTS: `${APPSKP}/${NU_EVENTS}`,
    DORM_EATS: `${APPSKP}/${DORM_EATS}`,
    ABOUT: `${APPSKP}/${ABOUT}`,
  },
  ADMIN: {
    BASEURL: `/${ADMIN}`,
    PRODUCTS: `/${ADMIN}/${PRODUCTS}`,
    PRODUCT: `/${ADMIN}/${PRODUCT}`,
    USERS: `/${ADMIN}/${USERS}`,
    USER: `/${ADMIN}/${USER}`,
  },
};

export const SUBROUTES = {
  APPS: {
    KP,
    NU_EVENTS,
    DORM_EATS,
    ABOUT,
    KP_PRODUCT_ID: `${KP}/${PRODUCT}/:id`,
  },
  ADMIN: {
    BASEURL: ADMIN,
    PRODUCTS: `${PRODUCTS}`,
    PRODUCT_ID: `${PRODUCT}/:id`,
    USERS: `${USERS}`,
    USER_ID: `${USER}/:id`,
  },
};

export const LazyRoutes = {
  APPS: [
    {
      path: SUBROUTES.APPS.KP,
      Component: withSuspense(lazy(() => import("@/pages/apps/kupi-prodai"))),
    },
    {
      path: SUBROUTES.APPS.KP_PRODUCT_ID,
      Component: withSuspense(
        lazy(() => import("@/pages/apps/kupi-prodai/product/[id]"))
      ),
    },
    {
      path: SUBROUTES.APPS.ABOUT,
      Component: withSuspense(lazy(() => import("@/pages/apps/about"))),
    },
    {
      path: SUBROUTES.APPS.NU_EVENTS,
      Component: withSuspense(lazy(() => import("@/pages/apps/nu-events"))),
    },
    {
      path: SUBROUTES.APPS.DORM_EATS,
      Component: withSuspense(lazy(() => import("@/pages/apps/dorm-eats"))),
    },
  ],
  ADMINS: [
    {
      path: SUBROUTES.ADMIN.PRODUCT_ID,
      Component: withSuspense(
        lazy(() => import("@/pages/admin/product-detail-page"))
      ),
    },
    {
      path: SUBROUTES.ADMIN.PRODUCTS,
      Component: withSuspense(
        lazy(() => import("@/pages/admin/products-page"))
      ),
    },
    {
      path: SUBROUTES.ADMIN.USERS,
      Component: withSuspense(lazy(() => import("@/pages/admin/users-page"))),
    },
    {
      path: SUBROUTES.ADMIN.USER_ID,
      Component: withSuspense(
        lazy(() => import("@/pages/admin/user-page"))
      ),
    },
  ],
};
