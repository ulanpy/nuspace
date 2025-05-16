import { withSuspense } from "@/components/molecules/hoc/with-suspense";
import { lazy } from "react";
import { LayoutDashboard, Package, Users } from "lucide-react";
const APPS = "apps";
const KP = "kupi-prodai";
const APPSKP = `${APPS}/${KP}`;

export const ROUTES = {
  HOME: "/",
  APPS: {
    BASEURL: "/apps",
    KP: `/${APPSKP}`,
    KP_PRODUCT_ID: `/${APPSKP}/product`,
    NU_EVENTS: `/${APPSKP}/nu-events`,
    DORM_EATS: `/${APPSKP}/dorm-eats`,
    ABOUT: `/${APPSKP}/about`,
  },
  ADMIN: {
    BASE: {
      path: "/admin",
      icon: <LayoutDashboard size={20} />,
      label: "Dashboard",
    },
    PRODUCTS: {
      path: "/admin/products",
      icon: <Package size={20} />,
      label: "Products",
      child: "/admin/product",
    },
    USERS: {
      path: "/admin/users",
      icon: <Users size={20} />,
      label: "Users",
      child: "/admin/user",
    },
  },
};

export const LazyRoutes = {
  APPS: [
    {
      path: "kupi-prodai",
      Component: withSuspense(lazy(() => import("@/pages/apps/kupi-prodai"))),
    },
    {
      path: "kupi-prodai/product/:id",
      Component: withSuspense(
        lazy(() => import("@/pages/apps/kupi-prodai/product/[id]"))
      ),
    },
    {
      path: "about",
      Component: withSuspense(lazy(() => import("@/pages/apps/about"))),
    },
    {
      path: "nu-events",
      Component: withSuspense(lazy(() => import("@/pages/apps/nu-events"))),
    },
    {
      path: "dorm-eats",
      Component: withSuspense(lazy(() => import("@/pages/apps/dorm-eats"))),
    },
  ],
  ADMINS: [
    {
      path: "products",
      Component: withSuspense(
        lazy(() => import("@/pages/admin/products-page"))
      ),
    },
    {
      path: "product/:id",
      Component: withSuspense(
        lazy(() => import("@/pages/admin/product-detail-page"))
      ),
    },
    {
      path: "users",
      Component: withSuspense(lazy(() => import("@/pages/admin/users-page"))),
    },
    {
      path: "user/:id",
      Component: withSuspense(lazy(() => import("@/pages/admin/user-page"))),
    }
  ],
};
