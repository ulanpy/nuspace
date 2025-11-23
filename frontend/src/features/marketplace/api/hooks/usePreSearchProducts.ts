import { useUser } from "@/hooks/use-user";
import { marketplaceApi } from "@/features/marketplace/api/marketplaceApi";
import { useQuery } from "@tanstack/react-query";
import { PreSearchedItem } from "@/types/search";

export const usePreSearchProducts = (inputValue: string) => {
  const { user } = useUser();
  const { data } = useQuery({
    ...marketplaceApi.getPreSearchedProductsQueryOptions(inputValue),
    enabled: !!user && !!inputValue,
  });
  const preSearchedItems: PreSearchedItem[] | null = Array.isArray(data)
    ? data.map((p) => ({ id: p.id, name: p.name }))
    : null;
  return { preSearchedItems };
};
