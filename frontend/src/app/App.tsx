import type { ComponentType } from "react";
import { LazyRoutes, ROUTES } from "../data/routes";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toasts } from "../components/atoms/toast";

// Layouts
import { PublicLayout } from "../layouts/PublicLayout";
import { LoggedInLayout } from "../layouts/LoggedInLayout";
import { CampusLayout } from "../components/CampusLayout";

// Route guards
import { ProtectedRoute } from "../components/layout/ProtectedRoute";
import { PublicRoute } from "../components/layout/PublicRoute";

// Pages
import LandingPage from "../pages/LandingPage";
import Announcements from "../pages/Announcements";

function App() {
  return (
    <>
      <Routes>
        {/* Public routes (Landing Page for guests) */}
        <Route element={<PublicRoute />}>
          <Route element={<PublicLayout />}>
            <Route path={ROUTES.HOME} element={<LandingPage />} />
          </Route>
        </Route>

        {/* Protected routes (Announcements for authenticated users) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<LoggedInLayout />}>
            <Route path={ROUTES.ANNOUNCEMENTS} element={<Announcements />} />

            {/* Main app routes */}
            {LazyRoutes.MAIN.map(({ path, Component }) => {
              const Screen = Component as ComponentType<any>;
              return <Route key={path} path={path} element={<Screen />} />;
            })}

            {/* Events with CampusLayout wrapper (content-only, no header) */}
            <Route element={<CampusLayout />}>
              {LazyRoutes.EVENTS.map(({ path, Component }) => {
                const Screen = Component as ComponentType<any>;
                return <Route key={path} path={path} element={<Screen />} />;
              })}
            </Route>
          </Route>
        </Route>

        {/* Catch-all: redirect to home */}
        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
      </Routes>

      {/* Global toasts (outside layouts for consistent positioning) */}
      <Toasts />
    </>
  );
}

export default App;
