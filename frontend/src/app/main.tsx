import { QueryClientProvider } from "@tanstack/react-query";

import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { BackNavigationProvider } from "@/context/BackNavigationContext";
import { ThemeProvider } from "@/context/ThemeProviderContext";
import "./index.css";
import { queryClient } from "../utils/query-client";
import { Snowfall } from "@/components/animations/Snowfall";
import { SnowProvider, useSnowEnabled } from "@/config/seasonal";

const SnowIfEnabled = () => {
  const enabled = useSnowEnabled();
  return enabled ? <Snowfall /> : null;
};

const ServiceWorkerCleanup = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const FLAG_KEY = "sw-cleaned-2026-01";
    if (localStorage.getItem(FLAG_KEY)) return;
    localStorage.setItem(FLAG_KEY, "1");

    const cleanup = async () => {
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((reg) => reg.unregister()));
        }
        if (window.caches) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
      } catch {
        // ignore cleanup errors
      }
    };

    cleanup();
  }, []);

  return null;
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider defaultTheme="light">
          {/* Provider is already used inside AppsLayout where needed; keep here for any global consumers */}
          <SnowProvider>
            <BackNavigationProvider>
              <ServiceWorkerCleanup />
              <SnowIfEnabled />
              <App />
            </BackNavigationProvider>
          </SnowProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
