import { useUser } from "@/hooks/use-user";
import { kupiProdaiApi } from "@/modules/kupi-prodai/api/kupi-prodai-api";
import { useQuery } from "@tanstack/react-query";

export function useUserProducts() {
  const { user } = useUser();
  const {
    data: myProducts,
    isError,
    isLoading,
  } = useQuery({
    ...kupiProdaiApi.getUserProductsQueryOptions(),
    enabled: !!user,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
  });

  return { myProducts, isError, isLoading };
}
