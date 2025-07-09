import { useUser } from "@/hooks/use-user";
import { kupiProdaiApi } from "@/modules/kupi-prodai/api/kupi-prodai-api";
import { useQuery } from "@tanstack/react-query";

export const usePreSearchProducts = (inputValue: string) => {
  const { user } = useUser();
  const { data: preSearchedProducts } = useQuery({
    ...kupiProdaiApi.getPreSearchedProductsQueryOptions(inputValue),
    enabled: !!user && !!inputValue,
  });
  return { preSearchedProducts: preSearchedProducts || null };
};
