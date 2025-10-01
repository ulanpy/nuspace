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
        safeAreaInsets?: { top: string };
        safeAreaInset?: { top: string };
        onEvent?: (event: string, callback: (data: any) => void) => void;
        offEvent?: (event: string, callback: (data: any) => void) => void;
        isFullscreen?: boolean;
      };
    };
    // Telegram script loading state
    telegramScriptLoaded?: boolean;
    telegramScriptError?: boolean;
    telegramLoadAttempts?: number;
    // Global singleton init state to avoid repeated initialization across many hook consumers
    __tgInit?: {
      isMiniApp: boolean;
      isReady: boolean;
      platform: string;
      startParam: string | null;
    };
    __tgInitStarted?: boolean;
    __tgInitListenersAttached?: boolean;
  }
}

export function useTelegramMiniApp() {
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    const applyOffsets = (tg: any) => {
      try {
        const safeTop = Number((tg?.safeAreaInsets?.top ?? tg?.safeAreaInset?.top ?? 0));
        const platform = tg?.platform ?? (navigator.userAgent.includes("Android") ? "android" : "ios");
        const fallbackTop = platform === "ios" ? 32 : platform === "android" ? 28 : 20;
        const headerOffset = Math.max(0, Math.round(safeTop || fallbackTop));
        document.documentElement.style.setProperty("--tg-header-offset", `${headerOffset}px`);
        document.documentElement.dataset.tgHeaderOffset = String(headerOffset);
      } catch (error) {
        console.error("Failed to set Telegram header offset", error);
      }
    };

    let detachViewportHandler: (() => void) | undefined;

    // Subscribe early to global readiness to avoid local fallback firing
    const onGlobalReady = (e: any) => {
      try {
        const data = (e?.detail || (window as any).__tgInit) as any;
        if (data) {
          setIsMiniApp(Boolean(data.isMiniApp));
          setIsReady(Boolean(data.isReady));
        }
      } catch {}
    };
    window.addEventListener('tgMiniAppReady', onGlobalReady);

    // If another instance already initialized, reuse its state and skip heavy work
    try {
      const g = window as any;
      if (g.__tgInit && g.__tgInit.isReady) {
        setIsMiniApp(Boolean(g.__tgInit.isMiniApp));
        setIsReady(true);
        // No need to return; keep listeners to respond to future changes
      }
    } catch {}

    const isAndroid = /Android/i.test(navigator.userAgent);
    let initTimeout: NodeJS.Timeout;
    let retryTimeout: NodeJS.Timeout;

    const initTelegram = () => {
      const g = window as any;
      if (g.__tgInitStarted) {
        // Another hook instance already kicked off init; attach a one-time listener for readiness
        const onReady = (e: any) => {
          try {
            const data = (e?.detail || g.__tgInit) as any;
            if (data) {
              setIsMiniApp(Boolean(data.isMiniApp));
              setIsReady(Boolean(data.isReady));
            }
          } catch {}
          window.removeEventListener('tgMiniAppReady', onReady as any);
        };
        window.addEventListener('tgMiniAppReady', onReady as any, { once: true });
        return;
      }
      g.__tgInitStarted = true;
      console.log('Initializing Telegram Mini App...');
      
      const tg = window?.Telegram?.WebApp;
      if (!tg) {
        console.log('Telegram WebApp not available, retrying...');
        // Retry if Telegram object not available yet (especially important for Android)
        retryTimeout = setTimeout(initTelegram, isAndroid ? 1000 : 500);
        return;
      }

      console.log('Telegram WebApp object found, proceeding with initialization');

      // Detect true Mini App context (not just Telegram in-app browser)
      const anyTg: any = tg as any;
      const initData: string = typeof anyTg?.initData === "string" ? anyTg.initData : "";
      const unsafe: any = anyTg?.initDataUnsafe || {};
      const hasHash: boolean = typeof unsafe?.hash === "string" && unsafe.hash.length > 0;
      const urlStartParam = new URLSearchParams(window.location.search).get("tgWebAppStartParam");
      const isRealMiniApp = Boolean(initData.length > 0 || hasHash || urlStartParam);

      console.log('Mini App detection:', { initData: !!initData, hasHash, urlStartParam, isRealMiniApp });

      if (isRealMiniApp) {
        try {
          // Android-specific initialization with delays
          if (isAndroid) {
            console.log('Applying Android-specific initialization...');
            
            // Step 1: Call ready() and wait
            tg.ready?.();
            
            setTimeout(() => {
              try {
                // Step 2: Expand after delay
                tg.expand?.();
                console.log('Telegram expand() called');
                
                setTimeout(() => {
                  try {
                    // Step 3: Apply additional settings after another delay
                    (tg as any).disableVerticalSwipes?.();
                    setIsMiniApp(true);
                    setIsReady(true);
                    // Clean huge Telegram hash to avoid very long URLs in Android WebView
                    try {
                      if (window.location.hash && window.location.hash.includes('tgWebAppData')) {
                        history.replaceState(null, '', window.location.pathname + window.location.search);
                      }
                    } catch {}
                    // Persist in global state for other hook consumers
                    try {
                      const g = window as any;
                      g.__tgInit = {
                        isMiniApp: true,
                        isReady: true,
                        platform: tg.platform ?? 'android',
                        startParam:
                          (tg as any)?.initDataUnsafe?.start_param ||
                          new URLSearchParams(window.location.search).get('tgWebAppStartParam') ||
                          null,
                      };
                      window.dispatchEvent(new CustomEvent('tgMiniAppReady', { detail: g.__tgInit }));
                    } catch {}
                    console.log('Android Telegram initialization completed');
                    
                    // Apply styling after successful initialization
                    document.documentElement.classList.add("tg-miniapp");
                    document.documentElement.style.setProperty("--bottom-nav-height", "64px");
                    applyOffsets(tg);

                    const handleViewportChange = () => applyOffsets(tg);
                    try {
                      tg?.onEvent?.("viewportChanged", handleViewportChange);
                      detachViewportHandler = () => tg?.offEvent?.("viewportChanged", handleViewportChange);
                    } catch {}
                  } catch (error) {
                    console.error('Android Telegram step 3 failed:', error);
                  }
                }, 400);
              } catch (error) {
                console.error('Android Telegram step 2 failed:', error);
              }
            }, 300);
          } else {
            // Standard initialization for non-Android platforms
            console.log('Applying standard initialization...');
            
            tg.ready?.();
            
            setTimeout(() => {
              tg.expand?.();
              (tg as any).disableVerticalSwipes?.();
              setIsMiniApp(true);
              setIsReady(true);
              // Clean huge Telegram hash to avoid very long URLs
              try {
                if (window.location.hash && window.location.hash.includes('tgWebAppData')) {
                  history.replaceState(null, '', window.location.pathname + window.location.search);
                }
              } catch {}
              // Persist in global state for other hook consumers
              try {
                const g = window as any;
                g.__tgInit = {
                  isMiniApp: true,
                  isReady: true,
                  platform: tg.platform ?? 'web',
                  startParam:
                    (tg as any)?.initDataUnsafe?.start_param ||
                    new URLSearchParams(window.location.search).get('tgWebAppStartParam') ||
                    null,
                };
                window.dispatchEvent(new CustomEvent('tgMiniAppReady', { detail: g.__tgInit }));
              } catch {}
              
              // Ensure fullscreen if supported (Bot API 8.0+)
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
              
              // Retry fullscreen a few times
              let fsTries = 0;
              const fsTimer = window.setInterval(() => {
                ensureFullscreen();
                fsTries += 1;
                if (fsTries >= 4) window.clearInterval(fsTimer);
              }, 800);
              
              // Apply styling
              document.documentElement.classList.add("tg-miniapp");
              document.documentElement.style.setProperty("--bottom-nav-height", "64px");
              
              const platform = tg.platform ?? "web";
              const headerOffsetPx = platform === "ios" ? 28 : 20;
              document.documentElement.style.setProperty("--tg-header-offset", `${headerOffsetPx}px`);
              applyOffsets(tg);

              const handleViewportChange = () => applyOffsets(tg);
              try {
                tg?.onEvent?.("viewportChanged", handleViewportChange);
                detachViewportHandler = () => tg?.offEvent?.("viewportChanged", handleViewportChange);
              } catch {}
              
              console.log('Standard Telegram initialization completed');
            }, 150);
          }
        } catch (error) {
          console.error('Telegram initialization failed:', error);
          // Fallback: treat as regular web app
          setIsMiniApp(false);
          setIsReady(true);
          try {
            const g = window as any;
            g.__tgInit = {
              isMiniApp: false,
              isReady: true,
              platform: tg?.platform ?? 'web',
              startParam: null,
            };
            window.dispatchEvent(new CustomEvent('tgMiniAppReady', { detail: g.__tgInit }));
          } catch {}
        }
      } else {
        // Not a real Mini App environment
        console.log('Not a real Mini App environment, treating as regular browser');
        setIsMiniApp(false);
        setIsReady(true);
        try {
          const g = window as any;
          g.__tgInit = {
            isMiniApp: false,
            isReady: true,
            platform: 'web',
            startParam: null,
          };
          window.dispatchEvent(new CustomEvent('tgMiniAppReady', { detail: g.__tgInit }));
        } catch {}
        document.documentElement.classList.remove("tg-miniapp");
        document.documentElement.style.removeProperty("--tg-header-offset");
      }
    };

    // Listen for script loading events (only attach once globally)
    const handleScriptLoaded = () => {
      console.log('Telegram script loaded event received');
      setScriptLoaded(true);
      // Start initialization after script loads
      initTimeout = setTimeout(initTelegram, isAndroid ? 500 : 200);
    };

    const handleScriptFailed = () => {
      console.error('Telegram script failed to load');
      setScriptLoaded(false);
      setIsMiniApp(false);
      setIsReady(true);
    };

    // Check if script is already loaded
    const g2 = window as any;
    if (window.telegramScriptLoaded) {
      handleScriptLoaded();
    } else if (!g2.__tgInitListenersAttached) {
      window.addEventListener('telegramScriptLoaded', handleScriptLoaded);
      window.addEventListener('telegramScriptFailed', handleScriptFailed);
      g2.__tgInitListenersAttached = true;
    }

    // Fallback timeout
    const fallbackTimeout = setTimeout(() => {
      if (!isReady) {
        console.warn('Telegram initialization timeout, falling back to regular mode');
        setIsMiniApp(false);
        setIsReady(true);
      }
    }, isAndroid ? 15000 : 10000);

    return () => {
      clearTimeout(initTimeout);
      clearTimeout(retryTimeout);
      clearTimeout(fallbackTimeout);
      // Do NOT remove global listeners here; other hook consumers rely on them
      document.documentElement.classList.remove("tg-miniapp");
      document.documentElement.style.removeProperty("--tg-header-offset");
      detachViewportHandler?.();
      window.removeEventListener('tgMiniAppReady', onGlobalReady);
    };
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

  return { isMiniApp, isReady, scriptLoaded, platform, startParam, hideKeyboard } as const;
}




