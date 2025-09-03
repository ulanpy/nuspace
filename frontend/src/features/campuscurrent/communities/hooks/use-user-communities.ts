import { useQuery } from "@tanstack/react-query";
import { campuscurrentAPI } from "../api/communitiesApi";

export const useUserCommunities = (userSub: string | null | undefined) => {
  const { data, isLoading, isError } = useQuery({
    ...campuscurrentAPI.getUserCommunitiesQueryOptions(userSub || ""),
    enabled: !!userSub,
  });

  return {
    communities: (data as any)?.communities || [],
    isLoading,
    isError,
    totalCommunities: (data as any)?.total_pages || 0,
  };
};
