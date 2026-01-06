import { useInfiniteQuery } from "@tanstack/react-query";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { apiCall } from "@/utils/api";
import { useDebounce } from '@/hooks/use-debounce';

export type InfiniteScrollParams<T> = {
  queryKey: string[];
  apiEndpoint: string;
  size?: number;
  keyword?: string;
  additionalParams?: Record<string, any>;
  transformResponse?: (response: any) => any;
  enabled?: boolean;
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
  loadMoreRef: (node: HTMLDivElement | null) => void;
};

export function useInfiniteScroll<T>({
  queryKey,
  apiEndpoint,
  size = 12,
  keyword = "",
  additionalParams = {},
  transformResponse,
  enabled = true,
}: InfiniteScrollParams<T>): UseInfiniteScrollReturn<T> {
  const [internalKeyword, setInternalKeyword] = useState<string>(keyword);

  useEffect(() => {
    setInternalKeyword(keyword);
  }, [keyword]);

  const debouncedKeyword = useDebounce(internalKeyword, 250);

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [...queryKey, "infinite", debouncedKeyword || "", JSON.stringify(additionalParams)] as const,
    queryFn: async ({ pageParam = 1 }) => {
      const queryParams = new URLSearchParams();
      queryParams.set("page", String(pageParam));
      queryParams.set("size", String(size));

      if (debouncedKeyword) {
        queryParams.set("keyword", String(debouncedKeyword));
      }

      Object.entries(additionalParams).forEach(([key, value]) => {
        if (value != null && value !== "") {
          queryParams.set(key, String(value));
        }
      });

      const res = await apiCall<any>(`${apiEndpoint}?${queryParams.toString()}`);

      if (!res) {
        throw new Error("No response from API");
      }

      if (
        typeof res.total_pages !== "number" &&
        typeof res.num_of_pages === "number"
      ) {
        res.total_pages = res.num_of_pages;
      }

      if (typeof res.page !== "number") {
        res.page = pageParam;
      }

      if (transformResponse) {
        return transformResponse(res);
      }

      return res;
    },
    getNextPageParam: (lastPage: any, allPages: any[]) => {
      const currentPage = typeof lastPage?.page === "number" ? lastPage.page : allPages.length;
      if (lastPage?.has_next === true) return currentPage + 1;
      if (lastPage?.has_next === false) return undefined;

      const totalPages = lastPage?.total_pages;
      if (typeof totalPages === "number" && currentPage < totalPages) {
        return currentPage + 1;
      }

        return undefined;
    },
    initialPageParam: 1,
    enabled,
  });

  const allItems = useMemo<T[]>(() => {
    const items =
      data?.pages.flatMap((page: any) => {
        if (Array.isArray(page)) return page;
        if (page.items) return page.items;
        return [];
      }) ?? [];

    const seenIds = new Set<any>();
    return items.filter((item: any) => {
      const id = item.id || item.event_id || item.community_id || item.post_id;
      if (seenIds.has(id)) {
        return false;
      }
      seenIds.add(id);
      return true;
    });
  }, [data]);

  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();

      if (!node || !hasNextPage) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
        },
        { rootMargin: "200px" },
      );

      observerRef.current.observe(node);
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return {
    items: allItems,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    keyword: debouncedKeyword,
    setKeyword: setInternalKeyword,
    loadMoreRef,
  };
}
