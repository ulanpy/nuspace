/*
  Minimal Telegram Mini App detector and initializer.
  - Detects the presence of window.Telegram.WebApp
  - Expands the app to full height
  - Exposes a simple boolean flag for conditional UI
*/

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const HEADER_STORAGE_KEY = "nuspace:tgHeaderOffset";

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
    __tgHookMounts?: number;
    __tgHeaderOffset?: number;
  }
}

export function useTelegramMiniApp() {
  const initialGlobal = typeof window !== "undefined" ? (window as any).__tgInit : undefined;
  const initialHeader = typeof window !== "undefined" ? (window as any).__tgHeaderOffset : undefined;

  let storedHeader = 0;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage?.getItem(HEADER_STORAGE_KEY);
      if (raw != null) {
        const parsed = Number(raw);
        if (Number.isFinite(parsed) && parsed > 0) storedHeader = parsed;
      }
    } catch {
      // ignore storage errors
    }
  }

  const initialHeaderValue = typeof initialHeader === "number" && Number.isFinite(initialHeader) && initialHeader > 0
    ? initialHeader
    : storedHeader;

  const [isMiniApp, setIsMiniApp] = useState(Boolean(initialGlobal?.isMiniApp));
  const [isReady, setIsReady] = useState(Boolean(initialGlobal?.isReady));
  const [scriptLoaded, setScriptLoaded] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean((window as any).telegramScriptLoaded);
  });
  const [headerOffset, setHeaderOffset] = useState(() => (initialHeaderValue > 0 ? initialHeaderValue : 0));
  const payloadOffsetRef = useRef(initialHeaderValue > 0 ? initialHeaderValue : 0);
  const readyRef = useRef(Boolean(initialGlobal?.isReady));
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply stored offset immediately on mount to prevent flash
  if (typeof window !== "undefined" && initialHeaderValue > 0) {
    const root = document.documentElement;
    if (!root.style.getPropertyValue("--tg-header-offset")) {
      root.style.setProperty("--tg-header-offset", `${initialHeaderValue}px`);
      root.dataset.tgHeaderOffset = String(initialHeaderValue);
      (window as any).__tgHeaderOffset = initialHeaderValue;
    }
  }

  useEffect(() => {
    const gMount = window as any;
    gMount.__tgHookMounts = Math.max(1, (gMount.__tgHookMounts ?? 0) + 1);
    console.log('[MiniApp] Hook mounted', {
      hookMounts: gMount.__tgHookMounts,
      initialHeaderValue,
      storedHeader,
      isMiniApp,
      isReady,
    });

    const parsePx = (value: unknown) => {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string") {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
      }
      return 0;
    };

    const ensureFallbackCleared = () => {
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
    };

    const markMiniAppReady = (reason: string) => {
      const wasReady = readyRef.current;
      readyRef.current = true;
      ensureFallbackCleared();
      if (!wasReady) {
        console.log('[MiniApp] markMiniAppReady', {
          reason,
          payloadOffset: payloadOffsetRef.current,
        });
      }
      setIsMiniApp((prev) => (prev ? prev : true));
      setIsReady((prev) => (prev ? prev : true));
    };

    const updateHeaderOffset = (tg: any, context: string, payload?: any) => {
      try {
        const rawSafeTop = tg?.safeAreaInsets?.top ?? tg?.safeAreaInset?.top ?? 0;
        const safeTop = parsePx(rawSafeTop);
        const platform = tg?.platform ?? (navigator.userAgent.includes("Android") ? "android" : "ios");
        const viewportHeight = parsePx(tg?.viewportHeight);
        const viewportStableHeight = parsePx(tg?.viewportStableHeight);
        const inferredFromViewport = viewportHeight > 0 && viewportStableHeight > 0
          ? Math.max(0, viewportHeight - viewportStableHeight)
          : 0;
        const inferredHeader = parsePx((tg as any)?.headerHeight ?? (tg as any)?.themeParams?.header_height);
        const contentSafeTop = parsePx((tg as any)?.contentSafeArea?.top ?? (tg as any)?.contentInsets?.top ?? 0);
        const fallbackTop = 0;

        const sanitize = (value: number) => {
          if (!Number.isFinite(value)) return 0;
          return Math.max(0, Math.min(120, Math.round(value)));
        };

        const visualViewport = window.visualViewport;
        const visualOffset = sanitize(
          (visualViewport?.offsetTop ?? visualViewport?.pageTop ?? 0) as number,
        );
        const innerHeight = visualViewport
          ? (visualViewport.height ?? 0) + (visualViewport.offsetTop ?? visualViewport.pageTop ?? 0)
          : window.innerHeight || document.documentElement?.clientHeight || 0;
        const viewportGap = sanitize(
          viewportHeight > 0 && innerHeight > 0 ? Math.max(0, innerHeight - viewportHeight) : 0,
        );
        const docGap = sanitize(
          viewportHeight > 0 && document.documentElement?.clientHeight
            ? Math.max(0, document.documentElement.clientHeight - viewportHeight)
            : 0,
        );

        const candidates = [
          safeTop,
          contentSafeTop,
          inferredHeader,
          inferredFromViewport,
          visualOffset,
          viewportGap,
          docGap,
        ]
          .map(sanitize)
          .filter((value) => value > 0 && value <= 120);

        let computed = sanitize(candidates.length > 0 ? Math.max(...candidates) : fallbackTop);

        if (payload?.top && Number.isFinite(payload.top)) {
          const safePayload = sanitize(Number(payload.top));
          if (safePayload > payloadOffsetRef.current) {
            payloadOffsetRef.current = safePayload;
          }
          if (safePayload > computed) {
            computed = safePayload;
          }
        }

        // Never go below the max offset we've seen (prevents jumping back to 0)
        if (payloadOffsetRef.current > computed) {
          computed = payloadOffsetRef.current;
        }

        console.debug("[MiniApp] header metrics", {
          context,
          payload,
          safeTop,
          contentSafeTop,
          inferredHeader,
          inferredFromViewport,
          visualOffset,
          viewportGap,
          docGap,
          fallbackTop,
          computed,
          maxPayloadTop: payloadOffsetRef.current,
          viewportHeight,
          viewportStableHeight,
          visualViewport: visualViewport
            ? {
                height: visualViewport.height,
                offsetTop: visualViewport.offsetTop,
                pageTop: (visualViewport as any)?.pageTop,
              }
            : null,
          windowInnerHeight: window.innerHeight,
          documentClientHeight: document.documentElement?.clientHeight,
        });

        setHeaderOffset((prev) => {
          if (prev !== computed) {
            console.warn(`[MiniApp] headerOffset changing: ${prev} → ${computed}`, {
              context,
              payload,
              stack: new Error().stack,
            });
            return computed;
          }
          return prev;
        });
        (window as any).__tgHeaderOffset = computed;
        try {
          if (computed > 0) {
            window.localStorage?.setItem(HEADER_STORAGE_KEY, String(computed));
          }
        } catch {}
        const root = document.documentElement;
        if (computed > 0) {
          root.style.setProperty("--tg-header-offset", `${computed}px`);
        } else {
          root.style.removeProperty("--tg-header-offset");
        }
        root.dataset.tgHeaderOffset = String(computed);
        return computed;
      } catch (error) {
        console.error("Failed to set Telegram header offset", error);
        return 0;
      }
    };

    const applyOffsets = (tg: any, context: string, payload?: any) => {
      updateHeaderOffset(tg, context, payload);
    };
    const detachHandlers: Array<() => void> = [];

    // Subscribe early to global readiness to avoid local fallback firing
    const onGlobalReady = (e: any) => {
      try {
        const data = (e?.detail || (window as any).__tgInit) as any;
        if (data) {
          setIsMiniApp((prev) => (prev ? prev : Boolean(data.isMiniApp)));
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
    let initTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

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
        setIsMiniApp(true);
        try {
          document.documentElement.classList.add("tg-miniapp");
          document.documentElement.style.setProperty("--bottom-nav-height", "64px");
          applyOffsets(tg, "init-resolved");
          markMiniAppReady('detected-real-mini-app');
        } catch {}
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
                    markMiniAppReady('android-standard-init-step');
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
                    const subscribe = (eventName: string) => {
                      try {
                        if (typeof tg?.onEvent === "function") {
                          const handler = (payload: any) => applyOffsets(tg, eventName, payload);
                          tg.onEvent(eventName, handler);
                          detachHandlers.push(() => {
                            try {
                              tg?.offEvent?.(eventName, handler);
                            } catch {}
                          });
                        }
                      } catch {}
                    };
                    [
                      "viewportChanged",
                      "viewport_changed",
                      "safeAreaChanged",
                      "safe_area_changed",
                      "contentSafeAreaChanged",
                      "content_safe_area_changed",
                    ].forEach(subscribe);
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
              markMiniAppReady('standard-init-step');
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
              const platform = tg.platform ?? "web";
              applyOffsets(tg, "init-resolved");

              const subscribe = (eventName: string) => {
                try {
                  if (typeof tg?.onEvent === "function") {
                    const handler = (payload: any) => applyOffsets(tg, eventName, payload);
                    tg.onEvent(eventName, handler);
                    detachHandlers.push(() => {
                      try {
                        tg?.offEvent?.(eventName, handler);
                      } catch {}
                    });
                  }
                } catch {}
              };
              [
                "viewportChanged",
                "viewport_changed",
                "safeAreaChanged",
                "safe_area_changed",
                "contentSafeAreaChanged",
                "content_safe_area_changed",
              ].forEach(subscribe);
              
              console.log('Standard Telegram initialization completed');
            }, 150);
          }
        } catch (error) {
          console.error('Telegram initialization failed:', error);
          // Fallback: treat as regular web app
          setIsMiniApp((prev) => (prev ? prev : false));
          setIsReady(true);
          markMiniAppReady('init-failed');
          try {
            const g = window as any;
            if (!g.__tgInit?.isMiniApp) {
              g.__tgInit = {
                isMiniApp: false,
                isReady: true,
                platform: tg?.platform ?? 'web',
                startParam: null,
              };
              window.dispatchEvent(new CustomEvent('tgMiniAppReady', { detail: g.__tgInit }));
            }
          } catch {}
        }
      } else {
        // Not a real Mini App environment
        console.log('Not a real Mini App environment, treating as regular browser');
        setIsMiniApp((prev) => (prev ? prev : false));
        setIsReady(true);
        markMiniAppReady('not-real-mini-app');
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
        console.warn('[MiniApp] Resetting offset - not a real mini app');
        document.documentElement.classList.remove("tg-miniapp");
        document.documentElement.style.removeProperty("--tg-header-offset");
        document.documentElement.style.removeProperty("--bottom-nav-height");
        document.documentElement.dataset.tgHeaderOffset = "0";
        setHeaderOffset(0);
        payloadOffsetRef.current = 0;
        delete (window as any).__tgHeaderOffset;
        try {
          window.localStorage?.removeItem(HEADER_STORAGE_KEY);
        } catch {}
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
      markMiniAppReady('script-failed');
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
    fallbackTimeoutRef.current = setTimeout(() => {
      if (!readyRef.current) {
        if (isMiniApp || headerOffset > 0 || payloadOffsetRef.current > 0) {
          console.warn('[MiniApp] Initialization timeout ignored', {
            isMiniApp,
            headerOffset,
            payloadOffset: payloadOffsetRef.current,
            readyRefCurrent: readyRef.current,
          });
          markMiniAppReady('timeout-ignored');
          return;
        }
        console.warn('[MiniApp] Initialization timeout, falling back to regular mode', {
          isMiniApp,
          isReady,
          readyRefCurrent: readyRef.current,
        });
        setIsMiniApp((prev) => (prev ? prev : false));
        setIsReady(true);
        markMiniAppReady('timeout-fallback');
        document.documentElement.classList.remove("tg-miniapp");
        document.documentElement.style.removeProperty("--tg-header-offset");
        document.documentElement.dataset.tgHeaderOffset = "0";
        setHeaderOffset(0);
        payloadOffsetRef.current = 0;
        delete (window as any).__tgHeaderOffset;
      }
    }, isAndroid ? 15000 : 10000);

    return () => {
      if (initTimeout) clearTimeout(initTimeout);
      if (retryTimeout) clearTimeout(retryTimeout);
      ensureFallbackCleared();
      // Do NOT remove global listeners here; other hook consumers rely on them
      const g = window as any;
      g.__tgHookMounts = Math.max(0, (g.__tgHookMounts ?? 1) - 1);
      if (!g.__tgHookMounts) {
        document.documentElement.classList.remove("tg-miniapp");
        document.documentElement.style.removeProperty("--tg-header-offset");
        document.documentElement.dataset.tgHeaderOffset = "0";
        delete (window as any).__tgHeaderOffset;
      }
      detachHandlers.forEach((fn) => fn());
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

  return { isMiniApp, isReady, scriptLoaded, platform, startParam, hideKeyboard, headerOffset } as const;
}




