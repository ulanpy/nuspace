import { useQuery } from "@tanstack/react-query";
import { usePageParam } from "@/hooks/usePageParam";
import { useState } from "react";
import { subspaceApi } from "@/features/subspace/api/subspaceApi";

export type UsePostsParams = {
  community_id?: number | null;
  size?: number;
  keyword?: string;
};

export function usePosts(params: UsePostsParams = {}) {
  const [page, setPage] = usePageParam();
  const [size, setSize] = useState(params.size ?? 12);
  const [internalKeyword, setInternalKeyword] = useState<string>("");
  
  const keyword = params.keyword ?? internalKeyword;

  const { data, isLoading, isError } = useQuery(
    subspaceApi.getPostsQueryOptions({
      community_id: params.community_id ?? null,
      page,
      size,
      keyword: keyword || null,
    }),
  );

  return {
    posts: data ?? null,
    isLoading,
    isError,
    page,
    setPage,
    size,
    setSize,
    keyword,
    setKeyword: setInternalKeyword,
  };
}


