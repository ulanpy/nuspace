import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { Event } from '@/features/shared/campus/types';
import * as Routes from '@/data/routes';
import { TimeFilter } from '@/features/events/api/events-api';

export type UseInfiniteEventsParams = {
  time_filter?: TimeFilter;
  start_date?: string;
  end_date?: string;
  registration_policy?: string | null;
  event_scope?: string | null;
  event_type?: string | null;
  event_status?: string | null;
  community_id?: number | null;
  creator_sub?: string | null;
  keyword?: string;
  size?: number;
};

export function useInfiniteEvents(params: UseInfiniteEventsParams = {}) {
  const {
    time_filter,
    start_date,
    end_date,
    registration_policy,
    event_scope,
    event_type,
    event_status = "approved",
    community_id,
    creator_sub,
    keyword = "",
    size = 12,
  } = params;

  return useInfiniteScroll<Event>({
    queryKey: ["campusCurrent", "events"],
    apiEndpoint: `/${Routes.EVENTS}`,
    size,
    keyword,
    additionalParams: {
      time_filter,
      start_date,
      end_date,
      registration_policy,
      event_scope,
      event_type,
      event_status,
      community_id,
      creator_sub,
    },
  });
}
