import { kupiProdaiApi } from "@/api/kupi-prodai-api";
import { useQuery } from "@tanstack/react-query";

export const useUser = () => {
  const {
    data: user,
    isLoading,
    isError,
    refetch: refetchUser,
    isFetching,
  } = useQuery({
    ...kupiProdaiApi.getUserQueryOptions(),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    retry: false,
  });

  return {
    user: user ?? null,
    isLoading,
    isError,
    isFetching,
    refetchUser,
    isAuthenticated: !!user,
  };
};
