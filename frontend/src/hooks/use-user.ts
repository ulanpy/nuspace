import { queryClient } from "@/utils/query-client";
import { apiCall } from "@/utils/api";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

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
  const fetchUser = useCallback(async () => {
    return apiCall<any>("/me", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
  }, []);

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
        return await fetchUser();
      } catch (error: any) {
        // If we get a 401 or 500, disable future queries and persist this state
        if (error?.status === 401 || error?.response?.status === 401 || error?.status === 500 || error?.respone?.status === 500 ) {
          console.error(`[ERROR] failed to query user data, error status: ${error?.status}, response status: ${error?.response?.status}`);
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
      // Check for saved redirect URL from ProtectedRoute (deep-link preservation)
      const savedRedirect = sessionStorage.getItem("__nuspace_redirect_url__");
      const returnTo = savedRedirect || `${window.location.pathname}${window.location.search}${window.location.hash}`;

      // Clear the saved redirect now that we're using it
      if (savedRedirect) {
        sessionStorage.removeItem("__nuspace_redirect_url__");
      }

      const url = `/api/login?return_to=${encodeURIComponent(returnTo)}`;
      window.location.href = url;
      return null;
    },
    onSuccess: () => {
      sessionStorage.removeItem(AUTH_FAILURE_KEY);
      queryClient.invalidateQueries({ queryKey: ["user"] });
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
        queryKey: ["user"],
      });
      window.location.href = "/";
    },
  });

  const refreshSession = useCallback(async () => {
    // Manual recovery hook (e.g. “Retry session” button) without background polling
    try {
      await fetch("/api/refresh-token", {
        method: "POST",
        credentials: "include",
      });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    } catch (error) {
      console.error("Error refreshing token:", error);
    }
  }, []);

  const login = () => {
    sessionStorage.removeItem(AUTH_FAILURE_KEY);
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
    refreshSession,
  };
};
