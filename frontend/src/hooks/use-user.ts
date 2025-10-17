import { queryClient } from "@/utils/query-client";
import { kupiProdaiApi } from "@/features/kupi-prodai/api/kupiProdaiApi";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTelegramMiniApp } from "@/hooks/useTelegramMiniApp";

// Session storage key for tracking auth failures
const AUTH_FAILURE_KEY = "__auth_query_disabled__";

// Check if queries should be enabled based on previous auth failures
const getInitialQueryEnabled = (): boolean => {
  if (typeof window === "undefined") return true;
  return sessionStorage.getItem(AUTH_FAILURE_KEY) !== "true";
};

// FUCK IT! GLOBAL VARIABLE TO SURVIVE RE-RENDERS
let globalQueryEnabled = getInitialQueryEnabled();

export const useUser = () => {
  const { isMiniApp, startParam } = useTelegramMiniApp();
  const isMiniAppContext = useMemo(() => {
    if (!isMiniApp || typeof window === "undefined") return false;

    try {
      const tg: any = (window as any)?.Telegram?.WebApp;
      if (!tg) return false;

      const hasInitDataString = typeof tg?.initData === "string" && tg.initData.length > 0;
      const initDataUnsafe = tg?.initDataUnsafe as any;
      const hasUnsafeHash = typeof initDataUnsafe?.hash === "string" && initDataUnsafe.hash.length > 0;
      const hasUnsafeStartParam = typeof initDataUnsafe?.start_param === "string" && initDataUnsafe.start_param.length > 0;
      const hasHookStartParam = typeof startParam === "string" && startParam.length > 0;

      return hasInitDataString || hasUnsafeHash || hasUnsafeStartParam || hasHookStartParam;
    } catch (error) {
      console.warn("[useUser] Failed to evaluate mini app context", error);
      return false;
    }
  }, [isMiniApp, startParam]);
  const [, forceUpdate] = useState(0); // Force re-render when needed
  
  
  const {
    data: rawUser,
    isLoading,
    isSuccess,
    isError,
    refetch: refetchUser,
    isFetching,
  } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      try {
        return await kupiProdaiApi.getUserQueryOptions().queryFn();
      } catch (error: any) {
        // If we get a 401, disable future queries and persist this state
        if (error?.status === 401 || error?.response?.status === 401) {
          globalQueryEnabled = false;
          sessionStorage.setItem(AUTH_FAILURE_KEY, "true");
          forceUpdate(prev => prev + 1);
        }
        throw error;
      }
    },
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    enabled: globalQueryEnabled,
  });

  const user = useMemo(() => {
    if (!rawUser || !rawUser.user) return null;

    // Backward compatible: keep nested `user` while also exposing flattened fields at top-level
    // - Existing code that uses `user.user.sub` continues to work
    // - New code can use `user.sub`, `user.role`, etc.
    return {
      ...rawUser,          // keeps `user` (nested) and `tg_id`
      ...rawUser.user,     // flattens common fields like sub, given_name, role, etc.
    } as any;
  }, [rawUser]);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (!isMiniAppContext) {
        const url = `/api/login?return_to=${encodeURIComponent(returnTo)}`;
        window.location.href = url;
        return null;
      }

      // Mini App flow: init login and open system browser; polling is handled by useEffect via startParam
      const initRes = await fetch(`/api/miniapp/login/init?return_to=${encodeURIComponent(returnTo)}`, {
        method: "GET",
        credentials: "include",
      });
      if (!initRes.ok) throw new Error("Failed to init mini app login");
      const { login_url } = await initRes.json();

      // Try opening link via Telegram API (Mini App only), otherwise fallback
      try {
        const tgOpenLink = (window as any)?.Telegram?.WebApp?.openLink as
          | ((url: string, options?: any) => void)
          | undefined;
        if (typeof tgOpenLink === "function") {
          tgOpenLink(login_url, { try_instant_view: false });
        } else {
          const newWin = window.open(login_url, "_blank", "noopener,noreferrer");
          if (!newWin) {
            window.location.href = login_url;
          }
        }
      } catch {
        window.location.href = login_url;
      }
      return null;
    },
    onSuccess: () => {
      // Refetch user after cookies are set and clear auth failure state
      sessionStorage.removeItem("__miniapp_login_poll_done__");
      sessionStorage.removeItem(AUTH_FAILURE_KEY);
      queryClient.invalidateQueries({ queryKey: kupiProdaiApi.getUserQueryOptions().queryKey });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/logout", {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        console.error("Logout failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: kupiProdaiApi.getUserQueryOptions().queryKey,
      });
      queryClient.removeQueries({
        queryKey: kupiProdaiApi.getUserProductsQueryOptions().queryKey,
      });
      window.location.href = "/";
    },
  });

  const refreshToken = async () => {
    try {
      await fetch("/api/refresh-token", {
        method: "POST",
        credentials: "include", // Important for cookies
      });
    } catch (error) {
      console.error("Error refreshing token:", error);
    }
  };

  useEffect(() => {
    const handleMiniAppLoginSuccess = () => {
      globalQueryEnabled = true;
      sessionStorage.removeItem(AUTH_FAILURE_KEY);
      queryClient.invalidateQueries({ queryKey: ["user"] });
      refetchUser();
    };

    window.addEventListener("miniapp-login-success", handleMiniAppLoginSuccess);

    return () => {
      window.removeEventListener("miniapp-login-success", handleMiniAppLoginSuccess);
    };
  }, [refetchUser]);

  useEffect(() => {
    // Auto-exchange if the Mini App was re-opened with start_param
    if (isMiniApp && startParam) {
      const doneKey = `miniapp_login_done:${startParam}`;
      if (sessionStorage.getItem(doneKey)) return;
      let cancelled = false;
      (async () => {
        const start = Date.now();
        const timeoutMs = 1000 * 90; // 90s window to allow callback to store creds
        const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
        while (!cancelled && Date.now() - start < timeoutMs) {
          try {
            const res = await fetch(`/api/miniapp/login/exchange`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ code: startParam }),
            });
            if (res.ok) {
              sessionStorage.setItem(doneKey, "1");
              sessionStorage.setItem("__miniapp_login_poll_done__", "1");
              sessionStorage.removeItem(AUTH_FAILURE_KEY);
              globalQueryEnabled = true;
              queryClient.invalidateQueries({ queryKey: kupiProdaiApi.getUserQueryOptions().queryKey });
              window.dispatchEvent(new Event("miniapp-login-success"));
              break;
            }
          } catch {
            // ignore and retry
          }
          await delay(1200);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
    const w: any = typeof window !== "undefined" ? (window as any) : {};
    const REFRESH_TIMER_KEY = "__auth_refresh_timer__";
    let refreshInterval: number | null = null;
    if (!w[REFRESH_TIMER_KEY]) {
      refreshInterval = window.setInterval(refreshToken, 1000 * 60 * 4);
      w[REFRESH_TIMER_KEY] = refreshInterval;
    } else {
      // interval exists; skip
    }
    return () => {
      if (refreshInterval != null && w[REFRESH_TIMER_KEY] === refreshInterval) {
        clearInterval(refreshInterval);
        delete w[REFRESH_TIMER_KEY];
      }
    };
  }, [isMiniApp, startParam]);

  const login = () => {
    globalQueryEnabled = true;
    sessionStorage.removeItem("__miniapp_login_poll_done__");
    sessionStorage.removeItem(AUTH_FAILURE_KEY);
    forceUpdate(prev => prev + 1);
    loginMutation.mutate();
  };
  const logout = () => {
    logoutMutation.mutate();
  };
  return {
    user,
    isLoading,
    isError,
    isSuccess,
    isFetching,
    refetchUser,
    login,
    logout,
    isLoggingOut: logoutMutation.isPending,
  };
};
