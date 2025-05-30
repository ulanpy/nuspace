import { LazyRoutes, ROUTES } from "./data/routes";
import AdminLayout from "./layouts/admin-layout";
import AdminPage from "./pages/admin/admin-page";
import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/home";
import AppsLayout from "./layouts/apps-layout";
import { Toasts } from "./components/atoms/toast";
import { ListingProvider } from "./context/listing-context";

function App() {
  return (
    <ListingProvider>
      <Routes>
        <Route path={ROUTES.HOME} element={<HomePage />} />
        <Route path={ROUTES.ADMIN.BASE.path} element={<AdminLayout />}>
          <Route index element={<AdminPage />} />
          {LazyRoutes.ADMINS.map(({ path, Component }) => (
            <Route key={path} path={path} element={<Component />} />
          ))}
        </Route>

        <Route path={ROUTES.APPS.BASEURL} element={<AppsLayout />}>
          {LazyRoutes.APPS.map(({ path, Component }) => (
            <Route key={path} path={path} element={<Component />} />
          ))}
        </Route>
      </Routes>
      <Toasts />
    </ListingProvider>
  );
}

export default App;
