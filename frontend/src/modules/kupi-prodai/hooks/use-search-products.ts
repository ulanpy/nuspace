import { useQuery } from "@tanstack/react-query";
import { kupiProdaiApi } from "@/api/kupi-prodai-api";
import { useListingState } from "@/context/listing-context";
export const useSearchProducts = () => {
  const { currentPage, itemsPerPage, searchQuery } = useListingState();
  const {data: searchedProducts, refetch} = useQuery({
    ...kupiProdaiApi.getSearchedProductsQueryOptions({
      page: currentPage,
      size: itemsPerPage,
      keyword: searchQuery,
    }),
    enabled: false,

  });
  const handleSearchProducts = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if(e.key === 'Enter' && !!searchQuery) {
      refetch()
    }
  }
  return {searchedProducts: searchedProducts || null, handleSearchProducts}
}


