import { useQuery } from "@tanstack/react-query";
import { campuscurrentAPI } from "../api/communitiesApi";
import { Community } from "@/features/campuscurrent/types/types";

export const useSearchCommunities = (params?: { keyword?: string; size?: number }) => {
  const keyword = (params?.keyword ?? "").trim();
  const size = params?.size ?? (keyword ? 10 : 20);

  const { data, isLoading, isError } = useQuery<Types.PaginatedResponse<Community, "communities">>(
    campuscurrentAPI.getCommunitiesQueryOptions({
      page: 1,
      size,
      keyword: keyword || null,
      category: null,
    }),
  );

  return {
    communities: data || null,
    isLoading,
    isError,
  };
};


