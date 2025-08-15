import { useInfiniteQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiCall } from "@/utils/api";
import { subspaceApi } from "@/features/campuscurrent/subspace/api/subspaceApi";
import * as Routes from "@/data/routes";
import { SubspacePost } from "@/features/campuscurrent/subspace/types";

export type UseInfinitePostsParams = {
  community_id?: number | null;
  size?: number;
  keyword?: string;
};

export function useInfinitePosts(params: UseInfinitePostsParams = {}) {
  const [internalKeyword, setInternalKeyword] = useState<string>("");
  const keyword = params.keyword ?? internalKeyword;

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [...subspaceApi.baseKey, "infinite", "list", { ...params, keyword }] as const,
    queryFn: async ({ pageParam = 1 }) => {
      const queryParams = new URLSearchParams();
      queryParams.set("page", String(pageParam));
      queryParams.set("size", String(params.size ?? 12));
      if (params.community_id != null) {
        queryParams.set("community_id", String(params.community_id));
      }
      if (keyword) {
        queryParams.set("keyword", String(keyword));
      }

      const res = await apiCall<any>(`/${Routes.POSTS}?${queryParams.toString()}`);
      
      // Debug logging
      console.log('API Response:', { pageParam, res });
      
      // Ensure we have a valid response
      if (!res) {
        throw new Error('No response from API');
      }
      
      // Handle different response formats for total_pages
      if (
        typeof res.total_pages !== "number" &&
        typeof res.num_of_pages === "number"
      ) {
        res.total_pages = res.num_of_pages;
      }
      
      // Ensure we have the page number
      if (typeof res.page !== 'number') {
        res.page = pageParam;
      }
      
      // Ensure we have posts array
      if (!Array.isArray(res.posts)) {
        res.posts = [];
      }
      
      return res as Types.PaginatedResponse<SubspacePost, "posts"> & { page: number };
    },
    getNextPageParam: (lastPage) => {
      // Debug logging
      console.log('getNextPageParam called with:', lastPage);
      
      // Ensure we have valid page and total_pages values
      const currentPage = lastPage?.page;
      const totalPages = lastPage?.total_pages;
      
      // If we don't have valid values, don't fetch more pages
      if (typeof currentPage !== 'number' || typeof totalPages !== 'number') {
        console.log('Invalid page values:', { currentPage, totalPages });
        return undefined;
      }
      
      // If we've reached the last page, don't fetch more
      if (currentPage >= totalPages) {
        console.log('Reached last page:', { currentPage, totalPages });
        return undefined;
      }
      
      const nextPage = currentPage + 1;
      console.log('Next page will be:', nextPage);
      return nextPage;
    },
    initialPageParam: 1,
  });

  // Flatten all posts from all pages
  const allPosts = data?.pages.flatMap(page => page.posts) ?? [];

  return {
    posts: allPosts,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    keyword,
    setKeyword: setInternalKeyword,
  };
}
