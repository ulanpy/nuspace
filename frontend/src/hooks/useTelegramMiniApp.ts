/*
  Minimal Telegram Mini App detector and initializer.
  - Detects the presence of window.Telegram.WebApp
  - Expands the app to full height
  - Exposes a simple boolean flag for conditional UI
*/

import { useCallback, useEffect, useMemo, useState } from "react";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initDataUnsafe?: unknown;
        isExpanded?: boolean;
        platform?: string;
        expand?: () => void;
        colorScheme?: "light" | "dark";
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        ready?: () => void;
        enableVerticalSwipes?: () => void;
        disableVerticalSwipes?: () => void;
        isVerticalSwipesEnabled?: boolean;
        hideKeyboard?: () => void; // Bot API 9.1+
        BackButton?: {
          isVisible?: boolean;
          show?: () => void;
          hide?: () => void;
          onClick?: (cb: () => void) => void;
          offClick?: (cb: () => void) => void;
        };
      };
    };
  }
}

export function useTelegramMiniApp() {
  const [isMiniApp, setIsMiniApp] = useState(false);

  useEffect(() => {
    const tg = window?.Telegram?.WebApp;
    if (tg) {
      // Detect true Mini App context (not just Telegram in-app browser)
      // Mini App provides initData/initDataUnsafe with a valid hash
      const anyTg: any = tg as any;
      const initData: string = typeof anyTg?.initData === "string" ? anyTg.initData : "";
      const unsafe: any = anyTg?.initDataUnsafe || {};
      const hasHash: boolean = typeof unsafe?.hash === "string" && unsafe.hash.length > 0;
      const urlStartParam = new URLSearchParams(window.location.search).get("tgWebAppStartParam");
      const isRealMiniApp = Boolean(initData.length > 0 || hasHash || urlStartParam);

      try {
        if (isRealMiniApp) {
          tg.ready?.();
          tg.expand?.();
          (tg as any).disableVerticalSwipes?.();
          setIsMiniApp(true);
          // Ensure fullscreen if supported (Bot API 8.0+), fallback to expand()
          const ensureFullscreen = () => {
            try {
              const anyTgInner: any = tg as any;
              if (typeof anyTgInner?.requestFullscreen === "function") {
                if (anyTgInner?.isFullscreen === false) {
                  anyTgInner.requestFullscreen();
                }
              } else if (tg.isExpanded === false) {
                tg.expand?.();
              }
              anyTgInner?.disableVerticalSwipes?.();
            } catch {}
          };
          ensureFullscreen();
          // Retry a few times since Telegram may ignore the first call until user interaction
          let fsTries = 0;
          const fsTimer = window.setInterval(() => {
            ensureFullscreen();
            fsTries += 1;
            if (fsTries >= 6) window.clearInterval(fsTimer);
          }, 500);
          // Apply a root class for CSS rules that depend on mini app
          document.documentElement.classList.add("tg-miniapp");
          // Provide a default bottom nav height variable for layout padding
          document.documentElement.style.setProperty("--bottom-nav-height", "64px");
          // Provide a header offset to avoid Telegram overlay (close/nav) overlapping header content
          const platform = tg.platform ?? "web";
          const headerOffsetPx = platform === "ios" ? 28 : 20; // tuned defaults; adjust as needed
          document.documentElement.style.setProperty("--tg-header-offset", `${headerOffsetPx}px`);
        } else {
          // Not a real Mini App environment; treat as regular browser (possibly Telegram in-app browser)
          setIsMiniApp(false);
          document.documentElement.classList.remove("tg-miniapp");
          document.documentElement.style.removeProperty("--tg-header-offset");
        }
      } catch {
        // no-op
      }
    } else {
      document.documentElement.classList.remove("tg-miniapp");
      document.documentElement.style.removeProperty("--tg-header-offset");
      
    }
  }, []);

  const platform = useMemo(() => window?.Telegram?.WebApp?.platform ?? "web", []);
  const hideKeyboard = useCallback(() => {
    try {
      (window as any)?.Telegram?.WebApp?.hideKeyboard?.();
    } catch {
      // ignore
    }
  }, []);
  const startParam = useMemo(() => {
    try {
      const tg = window?.Telegram?.WebApp as any;
      const urlParam = new URLSearchParams(window.location.search).get("tgWebAppStartParam");
      return (tg?.initDataUnsafe as any)?.start_param || urlParam || null;
    } catch {
      return null;
    }
  }, []);

  return { isMiniApp, platform, startParam, hideKeyboard } as const;
}




