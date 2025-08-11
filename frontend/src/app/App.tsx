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
import { EventsLayout } from "../features/campuscurrent/pages/layout";


import { LoginButton } from "../components/molecules/buttons/login-button";
import { ThemeToggle } from "../components/molecules/theme-toggle";
import { Header } from "@/components/atoms/header";
import { Footer } from "@/components/ui/footer";

function App() {
  return (
    <ListingProvider>
      <MediaUploadProvider>
        <MediaEditProvider>
          <Header
            right={
              <>
                <ThemeToggle />
                <LoginButton />
              </>
            }
          ></Header>
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
              <Route element={<EventsLayout />}>
                {LazyRoutes.APPS.EVENTS.map(({ path, Component }) => (
                  <Route key={path} path={path} element={<Component />} />
                ))}
              </Route>
            </Route>
          </Routes>
          <Footer note="About Nuspace" />
          <Toasts />
        </MediaEditProvider>
      </MediaUploadProvider>
    </ListingProvider>
  );
}

export default App;
