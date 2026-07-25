import { useSyncExternalStore, useCallback, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/utils/query-client";
import { apiCall } from "@/utils/api";
import { consumeIntendedRedirect } from "@/utils/auth-redirect";
import {
  disableAuthQuery,
  enableAuthQuery,
  getAuthQueryEnabled,
  subscribeAuthQueryEnabled,
} from "@/utils/auth-query-state";

export interface UserProfile {
  sub: string;
  email: string;
  role: string;
  name: string;
  surname: string;
  picture: string;
  scope: string;
}

export interface CurrentUser extends UserProfile {
  tg_id: number | null;
}

interface MeResponse {
  user: UserProfile;
  tg_id: number | null;
}

function isAuthFailureStatus(status: number | undefined): boolean {
  return status === 401 || (typeof status === "number" && status >= 500);
}

export const useUser = () => {
  const queryEnabled = useSyncExternalStore(
    subscribeAuthQueryEnabled,
    getAuthQueryEnabled,
    () => true,
  );

  const fetchUser = useCallback(async () => {
    return apiCall<MeResponse>("/me", {
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
      } catch (error: unknown) {
        const status =
          typeof error === "object" && error !== null
            ? Number(
                ("status" in error ? error.status : undefined) ??
                  ("response" in error &&
                  typeof error.response === "object" &&
                  error.response !== null &&
                  "status" in error.response
                    ? (error.response as { status?: number }).status
                    : undefined),
              )
            : undefined;

        if (isAuthFailureStatus(status)) {
          console.error(`[ERROR] failed to query user data, status: ${status}`);
          disableAuthQuery();
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
    enabled: queryEnabled,
  });

  const user = useMemo((): CurrentUser | null => {
    if (!rawUser?.user) return null;
    return {
      ...rawUser.user,
      tg_id: rawUser.tg_id ?? null,
    };
  }, [rawUser]);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const savedRedirect = consumeIntendedRedirect();
      const returnTo =
        savedRedirect ||
        `${window.location.pathname}${window.location.search}${window.location.hash}`;

      window.location.href = `/api/login?return_to=${encodeURIComponent(returnTo)}`;
      return null;
    },
    onSuccess: () => {
      enableAuthQuery();
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
      queryClient.removeQueries({ queryKey: ["user"] });
      window.location.reload();
    },
  });

  const refreshSession = useCallback(async () => {
    try {
      await fetch("/api/refresh-token", {
        method: "POST",
        credentials: "include",
      });
      enableAuthQuery();
      await queryClient.invalidateQueries({ queryKey: ["user"] });
    } catch (error) {
      console.error("Error refreshing token:", error);
    }
  }, []);

  const login = () => {
    enableAuthQuery();
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
