import { useQuery } from "@tanstack/react-query";
import { campuscurrentAPI } from "../api/communitiesApi";
import { useState, useEffect } from "react";
import { usePageParam } from "@/hooks/usePageParam";
import { Community } from "@/features/campuscurrent/types/types";
import { useLocation } from "react-router-dom";
import { getSearchParamFromURL } from "@/utils/search-params";

export const useCommunities = (options?: { category?: string | null; recruitment_status?: 'open' | 'closed' | null }) => {
  const [page, setPage] = usePageParam();
  const [size, setSize] = useState(12);
  const [keyword, setKeyword] = useState("");
  const location = useLocation();

  useEffect(() => {
    const text = getSearchParamFromURL(location.search, "text");
    setKeyword(text);
  }, [location.search]);

  const { data, isLoading, isError } = useQuery<Types.PaginatedResponse<Community, "communities">>(
    campuscurrentAPI.getCommunitiesQueryOptions({
      page,
      size,
      keyword: keyword || null,
      category: options?.category ?? null,
      recruitment_status: options?.recruitment_status ?? null,
    }),
  );

  return {
    communities: data || null,
    isLoading,
    isError,
    page,
    setPage,
    size,
    setSize,
    keyword,
    setKeyword,
  };
};
