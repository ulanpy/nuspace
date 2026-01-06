import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { Event } from '@/features/events/types';
import * as Routes from '@/data/routes';

export function useVirtualEvents(keyword: string = "") {
  return useInfiniteScroll<Event>({
    queryKey: ["campusCurrent", "events"],
    apiEndpoint: `/${Routes.EVENTS}`,
    size: 12,
    keyword,
    additionalParams: {},
    estimateSize: () => 250, // Estimate each event card to be 250px tall
    overscan: 4, // Only render 4 items outside viewport
  });
}

