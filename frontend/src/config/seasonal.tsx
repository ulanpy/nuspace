"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useTheme } from '@/context/theme-provider-context';

const snowFlag = process.env.NEXT_PUBLIC_ENABLE_SNOWFALL;

// Toggle for temporary New Year snow effect. Default on; set VITE_ENABLE_SNOWFALL=false to disable.
export const ENABLE_SNOWFALL = snowFlag === undefined ? true : snowFlag === "true";

type SnowContextValue = {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  toggle: () => void;
};

const SnowContext = createContext<SnowContextValue | undefined>(undefined);

const STORAGE_KEY = "snow-enabled";

export function SnowProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();

  const [enabled, setEnabledState] = useState<boolean>(false);

  useEffect(() => {
    if (!ENABLE_SNOWFALL) {
      setEnabledState(false);
      return;
    }
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      setEnabledState(saved === "true");
      return;
    }
    // Default: on for dark theme when allowed by env flag
    setEnabledState(theme === "dark");
  }, [theme]);

  useEffect(() => {
    if (!ENABLE_SNOWFALL) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, String(enabled));
  }, [enabled]);

  const value = useMemo(
    () => ({
      enabled: ENABLE_SNOWFALL && enabled,
      setEnabled: (value: boolean) => {
        if (!ENABLE_SNOWFALL) return;
        setEnabledState(value);
      },
      toggle: () => {
        if (!ENABLE_SNOWFALL) return;
        setEnabledState((v) => !v);
      },
    }),
    [enabled],
  );

  return <SnowContext.Provider value={value}>{children}</SnowContext.Provider>;
}

export const useSnow = () => {
  const ctx = useContext(SnowContext);
  if (!ctx) {
    throw new Error("useSnow must be used within a SnowProvider");
  }
  return ctx;
};

export const useSnowEnabled = () => {
  const { enabled } = useSnow();
  return enabled;
};
