"use client";

import { Outlet, useLocation } from "react-router-dom";
import { ThemeToggle } from "../components/molecules/theme-toggle";
import { LoginButton } from "../components/molecules/buttons/login-button";
import { ROUTES } from "@/data/routes";
import { BackNavigationProvider } from "@/context/BackNavigationContext";
import { BackButton } from "@/components/molecules/BackButton";
import { Header } from "@/components/atoms/header";

export default function AppsLayout() {
  const location = useLocation();

  return (
    <BackNavigationProvider>
      <div className="min-h-screen bg-background flex flex-col pb-[calc(56px+env(safe-area-inset-bottom))]">
        <Header
          left={<BackButton label={location.pathname === ROUTES.HOME ? "Close" : "Back"} />}
          right={
            <div className="flex gap-2">
              <ThemeToggle />
              <LoginButton />
            </div>
          }
          showMainNav
        />
        <main className="flex-1 container py-4 sm:py-6 px-3 sm:px-4">
          <Outlet />
        </main>
      </div>
    </BackNavigationProvider>
  );
}
