import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { SubspacePost } from '@/features/campuscurrent/subspace/types';
import * as Routes from '@/data/routes';

export function useVirtualPosts(keyword: string = "") {
  return useInfiniteScroll<SubspacePost>({
    queryKey: ["campusCurrent", "posts"],
    apiEndpoint: `/${Routes.POSTS}`,
    size: 10,
    keyword,
    additionalParams: { community_id: null },
    estimateSize: () => 300, // Estimate each post to be 300px tall
    overscan: 3, // Only render 3 items outside viewport
  });
}

