import { useQuery } from "@tanstack/react-query";
import { campuscurrentAPI } from "../api/communitiesApi";
import { Community } from "@/features/shared/campus/types";

export const useSearchCommunities = (params?: { keyword?: string; size?: number }) => {
  const keyword = (params?.keyword ?? "").trim();
  const size = params?.size ?? (keyword ? 10 : 20);

  const { data, isLoading, isError } = useQuery<Types.PaginatedResponse<Community>>(
    campuscurrentAPI.getCommunitiesQueryOptions({
      page: 1,
      size,
      keyword: keyword || null,
      category: null,
    })
  );

  const items = data?.items ?? (data as any)?.communities ?? null;

  return {
    communities: items,
    isLoading,
    isError,
  };
};
