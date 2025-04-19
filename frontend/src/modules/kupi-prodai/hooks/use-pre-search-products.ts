import { kupiProdaiApi } from "@/api/kupi-prodai-api";
import { useAuth } from "@/context/auth-context";
import { useListingState } from "@/context/listing-context";
import { useQuery } from "@tanstack/react-query";

export const usePreSearchProducts = () => {
  const { isAuthenticated } = useAuth();
  const { searchQuery } = useListingState();
  const { data: preSearchedProducts } = useQuery({
    ...kupiProdaiApi.getPreSearchedProductsQueryOptions(searchQuery),
    enabled: isAuthenticated && !!searchQuery,
  });
  return { preSearchedProducts };
};
