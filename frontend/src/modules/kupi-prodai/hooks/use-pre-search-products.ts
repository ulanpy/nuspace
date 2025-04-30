import { kupiProdaiApi } from "@/modules/kupi-prodai/api/kupi-prodai-api";
import { useAuth } from "@/context/auth-context";
import { useQuery } from "@tanstack/react-query";

export const usePreSearchProducts = (inputValue: string) => {
  const { isAuthenticated } = useAuth();
  const { data: preSearchedProducts } = useQuery({
    ...kupiProdaiApi.getPreSearchedProductsQueryOptions(inputValue),
    enabled: isAuthenticated && !!inputValue,
  });
  return { preSearchedProducts: preSearchedProducts || null };
};
