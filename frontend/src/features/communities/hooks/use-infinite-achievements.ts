import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import * as Routes from "@/data/routes";

export type Achievement = {
  id: number;
  community_id: number;
  description: string;
  year: number;
  created_at: string;
  updated_at: string;
};

export type UseInfiniteAchievementsParams = {
  communityId: number | null | undefined;
  size?: number;
  enabled?: boolean;
};

export function useInfiniteAchievements(params: UseInfiniteAchievementsParams) {
  const { communityId, size = 20 } = params;

  // Only fetch when we have a valid communityId (not null, undefined, or 0)
  const isEnabled = !!communityId && communityId !== 0;

  const result = useInfiniteScroll<Achievement>({
    queryKey: ["campusCurrent", "community", String(communityId ?? 'none'), "achievements"],
    apiEndpoint: isEnabled ? `/${Routes.COMMUNITIES}/${communityId}/achievements` : `/${Routes.COMMUNITIES}/0/achievements`,
    size,
    additionalParams: {},
    transformResponse: (response: any) => {
      // Transform the response to match the expected format
      return {
        items: response.achievements ?? [],
        total_pages: response.total_pages ?? 1,
        page: response.page ?? 1,
      };
    },
    enabled: isEnabled,
  });

  return {
    ...result,
    achievements: result.items,
  };
}
