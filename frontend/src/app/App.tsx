import { LazyRoutes, ROUTES } from "../data/routes";
// import AdminLayout from "../pages/admin/admin-layout";
// import AdminPage from "../pages/admin/admin-page";
import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "../pages/home";
import AppsLayout from "../pages/apps-layout";
import { Toasts } from "../components/atoms/toast";
import { ListingProvider } from "../context/ListingContext";
import { MediaUploadProvider } from "../context/MediaUploadContext";
import { MediaEditProvider } from "../context/MediaEditContext";
import { Layout } from "../features/campuscurrent/pages/layout";


import { Footer } from "@/components/ui/footer";
import { MobileBottomNav } from "@/components/molecules/MobileBottomNav";

function App() {
  return (
    <ListingProvider>
      <MediaUploadProvider>
        <MediaEditProvider>
          <Routes>
            <Route path={ROUTES.HOME} element={<HomePage />} />
            {/* <Route path={ROUTES.ADMIN.ROOT} element={<AdminLayout />}>
              <Route index element={<AdminPage />} />
              {LazyRoutes.ADMINS.map(({ path, Component }) => (
                <Route key={path} path={path} element={<Component />} />
              ))} */}
            {/* </Route> */}
            <Route path={ROUTES.APPS.ROOT} element={<AppsLayout />}>
              <Route index element={<Navigate to={ROUTES.HOME} replace />} />
              {LazyRoutes.APPS.BASIC.map(({ path, Component }) => (
                <Route key={path} path={path} element={<Component />} />
              ))}
              <Route path={ROUTES.APPS.CAMPUS_CURRENT.ROOT} element={<Navigate to={ROUTES.APPS.CAMPUS_CURRENT.EVENTS} replace />} />
              <Route element={<Layout />}>
                {LazyRoutes.APPS.EVENTS.map(({ path, Component }) => (
                  <Route key={path} path={path} element={<Component />} />
                ))}
              </Route>
            </Route>
          </Routes>
          {/* <Footer note="About Nuspace" /> */}
          <MobileBottomNav />
          <Toasts />
        </MediaEditProvider>
      </MediaUploadProvider>
    </ListingProvider>
  );
}

export default App;
