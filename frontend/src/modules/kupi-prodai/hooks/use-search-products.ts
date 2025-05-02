import { useQuery } from "@tanstack/react-query";
import { kupiProdaiApi } from "@/modules/kupi-prodai/api/kupi-prodai-api";
import { useListingState } from "@/context/listing-context";
export const useSearchProducts = () => {
  const { currentPage, itemsPerPage, searchQuery } = useListingState();
  const { data: searchedProducts } = useQuery({
    ...kupiProdaiApi.getSearchedProductsQueryOptions({
      page: currentPage,
      size: itemsPerPage,
      keyword: searchQuery,
    }),
    enabled: !!searchQuery,
  });

  return { searchedProducts: searchedProducts || null };
};
