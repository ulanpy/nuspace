import { useUser } from "@/hooks/use-user";
import { marketplaceApi } from "@/features/marketplace/api/marketplaceApi";
import { useQuery } from "@tanstack/react-query";

export function useUserProducts() {
  const { user } = useUser();
  const {
    data: myProducts,
    isError,
    isLoading,
  } = useQuery({
    ...marketplaceApi.getUserProductsQueryOptions(),
    enabled: !!user,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
  });

  return { myProducts, isError, isLoading };
}
