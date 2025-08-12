import { queryClient } from "@/utils/query-client";
import { kupiProdaiApi } from "@/features/kupi-prodai/api/kupiProdaiApi";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export const useUser = () => {
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
      window.location.href = "/api/login";
      return null;
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
    const refreshInterval = setInterval(refreshToken, 1000 * 60 * 4);
    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

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
