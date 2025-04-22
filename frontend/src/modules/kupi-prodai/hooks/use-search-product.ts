import { kupiProdaiApi } from "@/api/kupi-prodai-api";
import { useAuth } from "@/context/auth-context";
import { useListingState } from "@/context/listing-context";
import { useQuery } from "@tanstack/react-query";

export const useSearchProduct = () => {
  const { isAuthenticated } = useAuth();
  const { searchQuery } = useListingState();
  const { data: searchedProducts } = useQuery({
    ...kupiProdaiApi.getSearchProductQueryOptions(searchQuery),
    enabled: isAuthenticated && !!searchQuery.trim(),
  });
  return { searchedProducts };
};
