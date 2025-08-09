import { useQuery } from "@tanstack/react-query";
import {
  defaultSize,
  kupiProdaiApi,
} from "@/features/kupi-prodai/api/kupiProdaiApi";
import { useEffect, useState } from "react";
import { usePageParam } from "@/hooks/usePageParam";
import {
  getSearchCategoryFromURL,
  getSearchConditionFromURL,
} from "@/utils/search-params";
import { useLocation } from "react-router-dom";

export function useProducts() {
  const location = useLocation();
  const [keyword, setKeyword] = useState<string>("");
  const [page, setPage] = usePageParam();
  const [selectedCategory, setSelectedCategory] = useState(
    getSearchCategoryFromURL(location.search),
  );
  const [selectedCondition, setSelectedCondition] = useState(
    getSearchConditionFromURL(location.search),
  );
  const category =
    selectedCategory !== "All" ? selectedCategory.toLowerCase() : undefined;
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
      page: page,
      size: defaultSize,
      category,
      condition,
      keyword,
    }),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
  });

  // Keep category/condition in sync if URL changes externally
  useEffect(() => {
    const urlCategory = getSearchCategoryFromURL(location.search);
    const urlCondition = getSearchConditionFromURL(location.search);
    if (urlCategory !== selectedCategory) setSelectedCategory(urlCategory);
    if (urlCondition !== selectedCondition) setSelectedCondition(urlCondition);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);
  return {
    productItems: productItems ?? null,
    isError,
    isLoading,
    selectedCondition,
    selectedCategory,
    setSelectedCategory,
    setSelectedCondition,
    keyword,
    setKeyword,
    page,
    setPage,
  };
}
