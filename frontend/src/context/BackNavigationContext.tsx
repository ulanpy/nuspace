"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "@/data/routes";

type BackHandler = () => void;

interface BackNavigationContextValue {
  register: (handler: BackHandler) => () => void;
  triggerBack: () => void;
  hasHandlers: boolean;
}

export const BackNavigationContext = createContext<BackNavigationContextValue | undefined>(
  undefined,
);

export function BackNavigationProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const handlersRef = useRef<BackHandler[]>([]);
  const backListenerRef = useRef<(() => void) | null>(null);

  const register = useCallback((handler: BackHandler) => {
    handlersRef.current.push(handler);
    return () => {
      const idx = handlersRef.current.lastIndexOf(handler);
      if (idx !== -1) handlersRef.current.splice(idx, 1);
    };
  }, []);

  const triggerBack = useCallback(() => {
    const handlers = handlersRef.current;
    if (handlers.length > 0) {
      const handler = handlers.pop();
      if (handler) handler();
      return;
    }
    
    // If on Home, close the MiniApp instead of navigating
    if (location.pathname === ROUTES.HOME) {
      const tg = (window as any)?.Telegram?.WebApp;
      try {
        tg?.close?.();
      } catch {}
      return;
    }

    // Layered parent path resolution
    const path = location.pathname;

    const parent = (() => {
      // CampusCurrent
      const EVENT_DETAIL_PREFIX = ROUTES.APPS.CAMPUS_CURRENT.EVENT.DETAIL.replace(
        ":id",
        "",
      );
      if (path.startsWith(EVENT_DETAIL_PREFIX)) {
        return ROUTES.APPS.CAMPUS_CURRENT.EVENTS;
      }

      const COMMUNITY_DETAIL_PREFIX = ROUTES.APPS.CAMPUS_CURRENT.COMMUNITY.DETAIL.replace(
        ":id",
        "",
      );
      if (path.startsWith(COMMUNITY_DETAIL_PREFIX)) {
        return ROUTES.APPS.CAMPUS_CURRENT.COMMUNITIES;
      }

      if (
        path.startsWith(ROUTES.APPS.CAMPUS_CURRENT.EVENTS) ||
        path.startsWith(ROUTES.APPS.CAMPUS_CURRENT.COMMUNITIES) ||
        path.startsWith(ROUTES.APPS.CAMPUS_CURRENT.POSTS) ||
        path.startsWith(ROUTES.APPS.CAMPUS_CURRENT.PROFILE)
      ) {
        // From any sub-section, jump back to Home directly
        return ROUTES.HOME;
      }

      if (path.startsWith(ROUTES.APPS.CAMPUS_CURRENT.ROOT)) {
        return ROUTES.HOME;
      }

      // Marketplace
      const PRODUCT_DETAIL_PREFIX = ROUTES.APPS.KUPI_PRODAI.PRODUCT.DETAIL.replace(
        ":id",
        "",
      );
      if (path.startsWith(PRODUCT_DETAIL_PREFIX)) {
        return ROUTES.APPS.KUPI_PRODAI.ROOT;
      }

      if (path.startsWith(ROUTES.APPS.KUPI_PRODAI.CREATE)) {
        return ROUTES.APPS.KUPI_PRODAI.ROOT;
      }
      if (path.startsWith(ROUTES.APPS.KUPI_PRODAI.ROOT)) {
        return ROUTES.HOME;
      }

      // Dorm Eats and other apps
      if (path.startsWith(ROUTES.APPS.DORM_EATS.ROOT)) {
        return ROUTES.HOME;
      }

      // Apps root -> Home
      if (path.startsWith(ROUTES.APPS.ROOT)) {
        return ROUTES.HOME;
      }

      // Default -> Home
      return ROUTES.HOME;
    })();

    navigate(parent);
  }, [location.pathname, navigate]);

  // Hook Telegram native back button to our back logic
  useEffect(() => {
    const tg = (window as any)?.Telegram?.WebApp;
    if (!tg?.BackButton) return;
    const onBack = () => triggerBack();
    backListenerRef.current = onBack;
    try {
      tg.BackButton.onClick?.(onBack);
      tg.BackButton.show?.();
    } catch {}
    return () => {
      try {
        if (backListenerRef.current) tg.BackButton.offClick?.(backListenerRef.current);
        tg.BackButton.hide?.();
      } catch {}
      backListenerRef.current = null;
    };
  }, [triggerBack]);

  const value = useMemo(
    () => ({
      register,
      triggerBack,
      hasHandlers: handlersRef.current.length > 0,
    }),
    [register, triggerBack],
  );

  return (
    <BackNavigationContext.Provider value={value}>
      {children}
    </BackNavigationContext.Provider>
  );
}

export function useBackNavigation() {
  const ctx = useContext(BackNavigationContext);
  if (!ctx) throw new Error("useBackNavigation must be used within BackNavigationProvider");
  return ctx;
}

export function useMaybeBackNavigation() {
  return useContext(BackNavigationContext);
}


