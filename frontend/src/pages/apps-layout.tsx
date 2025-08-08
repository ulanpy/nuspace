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

export default function AppsLayout() {
  const { user, login, isLoading } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Check if the current path is for Kupi&Prodai
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
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg">
          <div className="container flex h-12 sm:h-14 items-center justify-between px-3 sm:px-4">
            <BackButton label="Back" />
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <LoginButton />
            </div>
          </div>
        </header>
        <main className="flex-1 container py-4 sm:py-6 px-3 sm:px-4">
          <Outlet />

          {/* Login Requirement Modal */}
          {showLoginModal && (
            <LoginRequirementModal
              title="Login Required"
              description="You need to login to create or manage listings in the Kupi&Prodai marketplace. Browsing is available to everyone."
              onLogin={handleLogin}
              onDismiss={handleDismiss}
            />
          )}
        </main>
      </div>
    </BackNavigationProvider>
  );
}
