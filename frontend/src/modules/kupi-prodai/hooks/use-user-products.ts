import { kupiProdaiApi } from "@/modules/kupi-prodai/api/kupi-prodai-api";
import { useAuth } from "@/context/auth-context";
import { useQuery } from "@tanstack/react-query";

export function useUserProducts() {
  const { isAuthenticated } = useAuth();
  const {
    data: myProducts,
    isError,
    isLoading,
  } = useQuery({
    ...kupiProdaiApi.getUserProductsQueryOptions(),
    enabled: isAuthenticated,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
  });

  return { myProducts, isError, isLoading };
}
