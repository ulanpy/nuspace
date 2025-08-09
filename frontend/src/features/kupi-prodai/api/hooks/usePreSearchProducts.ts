import { useUser } from "@/hooks/use-user";
import { kupiProdaiApi } from "@/features/kupi-prodai/api/kupiProdaiApi";
import { useQuery } from "@tanstack/react-query";

export const usePreSearchProducts = (inputValue: string) => {
  const { user } = useUser();
  const { data: preSearchedProducts } = useQuery({
    ...kupiProdaiApi.getPreSearchedProductsQueryOptions(inputValue),
    enabled: !!user && !!inputValue,
  });
  return { preSearchedProducts: preSearchedProducts || null };
};
