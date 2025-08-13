import { queryClient } from "@/utils/query-client";
import { kupiProdaiApi } from "@/features/kupi-prodai/api/kupiProdaiApi";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTelegramMiniApp } from "@/hooks/useTelegramMiniApp";

export const useUser = () => {
  const { isMiniApp, startParam } = useTelegramMiniApp();
  // diagnostics removed
  const {
    data: user,
    isLoading,
    isSuccess,
    isError,
    refetch: refetchUser,
    isFetching,
  } = useQuery({
    ...kupiProdaiApi.getUserQueryOptions(),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async () => {
      if (!isMiniApp) {
        window.location.href = "/api/login";
        return null;
      }

      // Mini App flow: init login and open system browser; polling is handled by useEffect via startParam
      const initRes = await fetch(`/api/miniapp/login/init`, {
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
      // Refetch user after cookies are set
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
              queryClient.invalidateQueries({ queryKey: kupiProdaiApi.getUserQueryOptions().queryKey });
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
    loginMutation.mutate();
  };
  const logout = () => {
    logoutMutation.mutate();
  };
  return {
    user: user ?? null,
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
