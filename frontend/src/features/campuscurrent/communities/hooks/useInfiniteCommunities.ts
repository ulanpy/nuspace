import { useInfiniteScroll, useInfiniteScrollWithWindow } from '@/hooks/useInfiniteScroll';
import { Community } from '@/features/campuscurrent/types/types';
import * as Routes from '@/data/routes';

export type UseInfiniteCommunitiesParams = {
  keyword?: string;
  category?: string | null;
  recruitment_status?: 'open' | 'closed' | null;
  size?: number;
};

export function useInfiniteCommunities(params: UseInfiniteCommunitiesParams = {}) {
  const {
    keyword = "",
    category,
    recruitment_status,
    size = 12,
  } = params;

  const infiniteScrollReturn = useInfiniteScroll<Community>({
    queryKey: ["campusCurrent", "communities"],
    apiEndpoint: `/${Routes.COMMUNITIES}`,
    size,
    keyword,
    additionalParams: {
      category,
      recruitment_status,
    },
  });

  return useInfiniteScrollWithWindow(infiniteScrollReturn);
}
