import { useQuery } from "@tanstack/react-query";
import { apiCall } from "@/utils/api";
import { PreSearchedItem } from "@/types/search";

export const usePreSearchPosts = (inputValue: string) => {
  const keyword = String(inputValue || "").trim();
  const { data } = useQuery({
    queryKey: ["pre-search-posts", keyword],
    enabled: !!keyword,
    queryFn: async ({ signal }) => {
      const res = await apiCall<any>(
        `/search/?keyword=${encodeURIComponent(keyword)}&storage_name=community_posts&page=1&size=10`,
        { signal },
      );
      return res as Array<{ id: number | string; title: string }>;
    },
  });

  const preSearchedItems: PreSearchedItem[] | null = Array.isArray(data)
    ? data.map((p) => ({ id: p.id, name: p.title }))
    : null;

  return { preSearchedItems };
};
