import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/home";
import ProductDetailPage from "./pages/apps/kupi-prodai/product/[id]";
import AppsLayout from "./layouts/apps-layout";
import { Toasts } from "./components/atoms/toast";
import { ListingProvider } from "./context/listing-context";
import { ImageProvider } from "./context/image-context";
import { MediaProvider } from "./context/media-context";
import { lazy, Suspense } from "react";

import ProductsPage from "./pages/apps/admin/products/products-page";
import UsersPage from "./pages/apps/admin/users/users-page";
import UserProductsPage from "./pages/apps/admin/users/user/user-products-page";
import { ROUTES, SUBROUTES } from "./data/routes";
import AdminLayout from "./layouts/admin-layout";
import AdminPage from "./pages/apps/admin/dashboard/admin-page";

const About = lazy(() =>
  import("@/pages/apps/about").then((module) => ({ default: module.About }))
);
const KupiProdaiPage = lazy(() => import("./pages/apps/kupi-prodai"));
const NUEventsPage = lazy(() => import("./pages/apps/nu-events"));
const DormEatsPage = lazy(() => import("./pages/apps/dorm-eats"));
function App() {
  return (
    <ListingProvider>
      <ImageProvider>
        <MediaProvider>
          <Suspense fallback={<div>Загружается ...</div>}>
            <Routes>
              <Route path={ROUTES.HOME} element={<HomePage />} />
              <Route path={ROUTES.ADMIN.BASEURL} element={<AdminLayout />}>
                <Route index element={<AdminPage />} />
                <Route
                  path={SUBROUTES.ADMIN.PRODUCTS}
                  element={<ProductsPage />}
                />
                <Route
                  path={SUBROUTES.ADMIN.PRODUCT_ID}
                  element={<ProductDetailPage />}
                />
                <Route path={SUBROUTES.ADMIN.USERS} element={<UsersPage />} />
                <Route
                  path={SUBROUTES.ADMIN.USER}
                  element={<UserProductsPage />}
                />
              </Route>
              <Route path={ROUTES.APPS.BASEURL} element={<AppsLayout />}>
                <Route path={SUBROUTES.APPS.KP} element={<KupiProdaiPage />} />
                <Route
                  path={SUBROUTES.APPS.KP_PRODUCT_ID}
                  element={<ProductDetailPage />}
                />
                <Route path={SUBROUTES.APPS.ABOUT} element={<About />} />
                <Route path={SUBROUTES.APPS.NU_EVENTS} element={<NUEventsPage />} />
                <Route path={SUBROUTES.APPS.DORM_EATS} element={<DormEatsPage />} />
              </Route>
            </Routes>
          </Suspense>
          <Toasts />
        </MediaProvider>
      </ImageProvider>
    </ListingProvider>
  );
}

export default App;
