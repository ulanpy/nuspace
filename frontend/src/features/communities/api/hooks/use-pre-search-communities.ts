import { useQuery } from "@tanstack/react-query";
import { apiCall } from "@/utils/api";
import { PreSearchedItem } from "@/types/search";

export const usePreSearchCommunities = (inputValue: string) => {
  const keyword = String(inputValue || "").trim();
  const { data } = useQuery({
    queryKey: ["pre-search-communities", keyword],
    enabled: !!keyword,
    queryFn: async ({ signal }) => {
      const res = await apiCall<any>(
        `/search/?keyword=${encodeURIComponent(keyword)}&storage_name=communities&page=1&size=10`,
        { signal },
      );
      return res as Array<{ id: number | string; name: string }>;
    },
  });

  const preSearchedItems: PreSearchedItem[] | null = Array.isArray(data)
    ? data.map((c) => ({ id: c.id, name: c.name }))
    : null;

  return { preSearchedItems };
};


