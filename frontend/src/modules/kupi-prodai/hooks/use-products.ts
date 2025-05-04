import { useQuery } from "@tanstack/react-query";
import { kupiProdaiApi } from "@/modules/kupi-prodai/api/kupi-prodai-api";
import { useState } from "react";
import { useListingState } from "@/context/listing-context";
import { useUser } from "@/hooks/use-user";
import { getSearchCategoryFromURL, getSearchConditionFromURL } from "@/utils/search-params";
import { useLocation } from "react-router-dom";

export function useProducts() {
  const location = useLocation();
  const { user } = useUser();
  const { currentPage, itemsPerPage, searchQuery } = useListingState();
  const [selectedCategory, setSelectedCategory] = useState(getSearchCategoryFromURL(location.search));
  const [selectedCondition, setSelectedCondition] = useState(getSearchConditionFromURL(location.search));
  const category =
    selectedCategory !== "All"
      ? selectedCategory.toLowerCase()
      : undefined;
  const condition =
    selectedCondition !== "All Conditions"
      ? selectedCondition.toLowerCase()
      : undefined;

  const {
    data: productItems,
    isError,
    isLoading,
  } = useQuery({
    ...kupiProdaiApi.getProductsQueryOptions({
      page: currentPage,
      size: itemsPerPage,
      category,
      condition,
    }),
    enabled: !!user && !searchQuery,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
  });
  return {
    productItems: productItems ?? null,
    isError,
    isLoading,
    selectedCondition,
    selectedCategory,
    setSelectedCategory,
    setSelectedCondition,
  };
}
