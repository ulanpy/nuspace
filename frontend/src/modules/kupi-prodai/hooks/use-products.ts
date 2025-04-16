import { useQuery } from "@tanstack/react-query";
import { kupiProdaiApi } from "@/api/kupi-prodai-api";
import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useListingState } from "@/context/listing-context";

export function useProducts() {
  const { isAuthenticated } = useAuth();
  const { currentPage, itemsPerPage } = useListingState();
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedCondition, setSelectedCondition] = useState("All Conditions");
  const category =
    selectedCategory !== "All Categories"
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
    enabled: isAuthenticated,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
  });
  return {
    productItems,
    isError,
    isLoading,
    selectedCondition,
    selectedCategory,
    setSelectedCategory,
    setSelectedCondition,
  };
}