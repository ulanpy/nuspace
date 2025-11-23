import { useQuery } from "@tanstack/react-query";
import { marketplaceApi } from "../marketplaceApi";
import { useParams } from "react-router-dom";

export const useProduct = () => {
  const { id } = useParams<{ id: string }>();

  const {
    data: product,
    isLoading,
    isError,
  } = useQuery({
    ...marketplaceApi.getProductQueryOptions(id || ""),
    enabled: !!id,
  });

  return { product: product || null, isLoading, isError };
};