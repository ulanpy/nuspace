import { useQuery } from "@tanstack/react-query";
import { kupiProdaiApi } from "../api/kupi-prodai-api";
import { useParams } from "react-router-dom";

export const useProduct = () => {
  const { id } = useParams<{id: string}>()

  const {
    data: product,
    isLoading,
    isError,
  } = useQuery({
    ...kupiProdaiApi.getProductQueryOptions(id || ""),
    enabled: !!id
  });

  return { product: product || null, isLoading, isError };
};
