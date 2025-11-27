import { queryClient } from "@/utils/query-client";
import { marketplaceApi } from "@/features/marketplace/api/marketplaceApi";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

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
        return await marketplaceApi.getUserQueryOptions().queryFn();
      } catch (error: any) {
        // If we get a 401, disable future queries and persist this state
        if (error?.status === 401 || error?.response?.status === 401) {
          globalQueryEnabled = false;
          sessionStorage.setItem(AUTH_FAILURE_KEY, "true");
          forceUpdate((prev: number) => prev + 1);
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
      const url = `/api/login?return_to=${encodeURIComponent(returnTo)}`;
      window.location.href = url;
      return null;
    },
    onSuccess: () => {
      sessionStorage.removeItem(AUTH_FAILURE_KEY);
      queryClient.invalidateQueries({ queryKey: marketplaceApi.getUserQueryOptions().queryKey });
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
        queryKey: marketplaceApi.getUserQueryOptions().queryKey,
      });
      queryClient.removeQueries({
        queryKey: marketplaceApi.getUserProductsQueryOptions().queryKey,
      });
      window.location.href = "/";
    },
  });

  const refreshToken = useCallback(async () => {
    try {
      await fetch("/api/refresh-token", {
        method: "POST",
        credentials: "include", // Important for cookies
      });
    } catch (error) {
      console.error("Error refreshing token:", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w: any = window;
    const REFRESH_TIMER_KEY = "__auth_refresh_timer__";
    let refreshInterval: ReturnType<typeof window.setInterval> | null = null;
    if (!w[REFRESH_TIMER_KEY]) {
      refreshInterval = window.setInterval(refreshToken, 1000 * 60 * 4);
      w[REFRESH_TIMER_KEY] = refreshInterval;
    }
    return () => {
      if (refreshInterval != null && w[REFRESH_TIMER_KEY] === refreshInterval) {
        clearInterval(refreshInterval);
        delete w[REFRESH_TIMER_KEY];
      }
    };
  }, [refreshToken]);

  const login = () => {
    globalQueryEnabled = true;
    sessionStorage.removeItem(AUTH_FAILURE_KEY);
    forceUpdate((prev: number) => prev + 1);
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
