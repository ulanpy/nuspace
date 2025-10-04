"use client";

import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ThemeToggle } from "../components/molecules/theme-toggle";
import { LoginButton } from "../components/molecules/buttons/login-button";
import { LoginRequirementModal } from "../components/molecules/login-requirement-modal";
import { useUser } from "@/hooks/use-user";
import { ROUTES } from "@/data/routes";
import { BackNavigationProvider } from "@/context/BackNavigationContext";
import { BackButton } from "@/components/molecules/BackButton";
import { Header } from "@/components/atoms/header";
import { useTelegramMiniApp } from "@/hooks/useTelegramMiniApp";

export default function AppsLayout() {
  const { user, login, isLoading } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { isMiniApp } = useTelegramMiniApp();

  // Check if the current path is for Marketplace
  const isKupiProdaiPath = location.pathname.includes(
    ROUTES.APPS.KUPI_PRODAI.ROOT,
  );

  // Show login modal ONLY when trying to create/sell (not for browsing or viewing)
  useEffect(() => {
    if (!user && !isLoading && isKupiProdaiPath) {
      const isCreatePath = location.pathname.includes("/create");
      setShowLoginModal(isCreatePath);
    } else {
      setShowLoginModal(false);
    }
  }, [user, isKupiProdaiPath, isLoading, location.pathname]);

  // Handle login from the modal
  const handleLogin = () => {
    login();
    setShowLoginModal(false);
  };

  // Handle modal dismissal
  const handleDismiss = () => {
    setShowLoginModal(false);
    navigate("/");
  };

  return (
    <BackNavigationProvider>
      <div className="min-h-screen bg-background flex flex-col pb-[calc(56px+env(safe-area-inset-bottom))]">
        <Header
          left={!isMiniApp ? <BackButton label={location.pathname === ROUTES.HOME ? "Close" : "Back"} /> : undefined}
          right={!isMiniApp ? (
            <div className="flex gap-2">
              <ThemeToggle />
              <LoginButton />
            </div>
          ) : undefined}
          titleClassName={isMiniApp ? "text-gradient-primary" : undefined}
          showMainNav={!isMiniApp}
        />
        <main className="flex-1 container py-4 sm:py-6 px-3 sm:px-4">
          <Outlet />

          {/* Login Requirement Modal */}
          {showLoginModal && (
            <LoginRequirementModal
              title="Login Required"
              description="You need to login to create or manage listings in the Marketplace. Browsing is available to everyone."
              onLogin={handleLogin}
              onDismiss={handleDismiss}
            />
          )}
        </main>
      </div>
    </BackNavigationProvider>
  );
}
