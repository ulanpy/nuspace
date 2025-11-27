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
      const EVENT_DETAIL_PREFIX = ROUTES.EVENTS.DETAIL.replace(":id", "");
      if (path.startsWith(EVENT_DETAIL_PREFIX)) {
        return ROUTES.EVENTS.ROOT;
      }
      if (path.startsWith(ROUTES.EVENTS.ROOT)) {
        return ROUTES.HOME;
      }

      const COMMUNITY_DETAIL_PREFIX = ROUTES.COMMUNITIES.DETAIL.replace(":id", "");
      if (path.startsWith(COMMUNITY_DETAIL_PREFIX)) {
        return ROUTES.COMMUNITIES.ROOT;
      }
      if (path.startsWith(ROUTES.COMMUNITIES.ROOT)) {
        return ROUTES.HOME;
      }

      const SG_STUDENT_DETAIL_PREFIX = ROUTES.SGOTINISH.STUDENT.TICKET.DETAIL.replace(":id", "");
      if (path.startsWith(SG_STUDENT_DETAIL_PREFIX)) {
        return ROUTES.SGOTINISH.STUDENT.ROOT;
      }
      const SG_MEMBER_DETAIL_PREFIX = ROUTES.SGOTINISH.SG.TICKET.DETAIL.replace(":id", "");
      if (path.startsWith(SG_MEMBER_DETAIL_PREFIX)) {
        return ROUTES.SGOTINISH.SG.ROOT;
      }
      if (path.startsWith(ROUTES.SGOTINISH.STUDENT.ROOT) || path.startsWith(ROUTES.SGOTINISH.SG.ROOT)) {
        return ROUTES.SGOTINISH.ROOT;
      }
      if (path.startsWith(ROUTES.SGOTINISH.ROOT)) {
        return ROUTES.HOME;
      }

      if (
        path.startsWith(ROUTES.DORM_EATS) ||
        path.startsWith(ROUTES.COURSES) ||
        path.startsWith(ROUTES.CONTACTS) ||
        path.startsWith(ROUTES.PROFILE) ||
        path.startsWith(ROUTES.ABOUT)
      ) {
        return ROUTES.HOME;
      }

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


