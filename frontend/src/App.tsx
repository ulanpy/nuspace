import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/home";
import AppsLayout from "./layouts/apps-layout";
import { Toasts } from "./components/atoms/toast";
import { ListingProvider } from "./context/listing-context";
import { ImageProvider } from "./context/image-context";
import { MediaProvider } from "./context/media-context";
import ProductsPage from "./pages/apps/admin/products/products-page";
import UsersPage from "./pages/apps/admin/users/users-page";
import UserProductsPage from "./pages/apps/admin/users/user/user-products-page";
import { LazyRoutes, ROUTES, SUBROUTES } from "./data/routes";
import AdminLayout from "./layouts/admin-layout";
import AdminPage from "./pages/apps/admin/dashboard/admin-page";
import ProductDetailPage from "./pages/apps/admin/product-detail/product-detail-page";

function App() {
  return (
    <ListingProvider>
      <ImageProvider>
        <MediaProvider>
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
                path={SUBROUTES.ADMIN.USER_ID}
                element={<UserProductsPage />}
              />
            </Route>

            <Route path={ROUTES.APPS.BASEURL} element={<AppsLayout />}>
              {LazyRoutes.APPS.map(({ path, Component }) => (
                <Route path={path} element={<Component />} />
              ))}
            </Route>
          </Routes>
          <Toasts />
        </MediaProvider>
      </ImageProvider>
    </ListingProvider>
  );
}

export default App;
