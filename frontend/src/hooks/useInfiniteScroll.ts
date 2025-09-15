import { useInfiniteQuery } from "@tanstack/react-query";
import { useState, useCallback, useEffect, useMemo } from "react";
import { apiCall } from "@/utils/api";

export type InfiniteScrollParams<T> = {
  queryKey: string[];
  apiEndpoint: string;
  size?: number;
  keyword?: string;
  additionalParams?: Record<string, any>;
  transformResponse?: (response: any) => any;
};

export type UseInfiniteScrollReturn<T> = {
  items: T[];
  isLoading: boolean;
  isError: boolean;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  keyword: string;
  setKeyword: (keyword: string) => void;
};

export function useInfiniteScroll<T>({
  queryKey,
  apiEndpoint,
  size = 12,
  keyword = "",
  additionalParams = {},
  transformResponse,
}: InfiniteScrollParams<T>): UseInfiniteScrollReturn<T> {
  const [internalKeyword, setInternalKeyword] = useState<string>(keyword);

  // Sync internal keyword with prop changes
  useEffect(() => {
    setInternalKeyword(keyword);
  }, [keyword]);

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [...queryKey, "infinite", internalKeyword, JSON.stringify(additionalParams)] as const,
    queryFn: async ({ pageParam = 1 }) => {
      const queryParams = new URLSearchParams();
      queryParams.set("page", String(pageParam));
      queryParams.set("size", String(size));
      
      // Add keyword if provided
      if (internalKeyword) {
        queryParams.set("keyword", String(internalKeyword));
      }
      
      // Add additional parameters
      Object.entries(additionalParams).forEach(([key, value]) => {
        if (value != null && value !== "") {
          queryParams.set(key, String(value));
        }
      });

      const res = await apiCall<any>(`${apiEndpoint}?${queryParams.toString()}`);
      
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
      
      // Transform response if provided
      if (transformResponse) {
        return transformResponse(res);
      }
      
      return res;
    },
    getNextPageParam: (lastPage) => {
      // Ensure we have valid page and total_pages values
      const currentPage = lastPage?.page;
      const totalPages = lastPage?.total_pages;
      
      // If we don't have valid values, don't fetch more pages
      if (typeof currentPage !== 'number' || typeof totalPages !== 'number') {
        return undefined;
      }
      
      // If we've reached the last page, don't fetch more
      if (currentPage >= totalPages) {
        return undefined;
      }
      
      return currentPage + 1;
    },
    initialPageParam: 1,
  });

  // Flatten all items from all pages with deduplication
  const allItems = useMemo(() => {
    const items = data?.pages.flatMap(page => {
      // Handle different response structures
      if (page.events) return page.events;
      if (page.communities) return page.communities;
      if (page.posts) return page.posts;
      if (page.grades) return page.grades;
      if (page.products) return page.products;
      if (Array.isArray(page)) return page;
      return [];
    }) ?? [];
    
    // Deduplicate items based on their ID
    const seenIds = new Set();
    return items.filter(item => {
      const id = item.id || item.event_id || item.community_id || item.post_id;
      if (seenIds.has(id)) {
        return false;
      }
      seenIds.add(id);
      return true;
    });
  }, [data]);

  // Handle infinite scroll with window scrolling
  const handleScroll = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    
    const scrollTop = window.scrollY;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;
    
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Add scroll event listener to window
  useEffect(() => {
    if (allItems.length > 0) {
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll, allItems.length]);

  return {
    items: allItems,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    keyword: internalKeyword,
    setKeyword: setInternalKeyword,
  };
}
