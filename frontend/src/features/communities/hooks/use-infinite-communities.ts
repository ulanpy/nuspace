import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { Community } from '@/features/shared/campus/types';
import * as Routes from '@/data/routes';

export type UseInfiniteCommunitiesParams = {
  keyword?: string;
  category?: string | null;
  size?: number;
};

export function useInfiniteCommunities(params: UseInfiniteCommunitiesParams = {}) {
  const {
    keyword = "",
    category,
    size = 12,
  } = params;

  return useInfiniteScroll<Community>({
    queryKey: ["campusCurrent", "communities"],
    apiEndpoint: `/${Routes.COMMUNITIES}`,
    size,
    keyword,
    additionalParams: {
      category,
    },
  });
}
