import { kupiProdaiApi } from "@/api/kupi-prodai-api";
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
  });

  return { myProducts, isError, isLoading };
}
