import { useQuery } from "@tanstack/react-query";
import { campuscurrentAPI, TimeFilter } from "@/features/campuscurrent/events/api/eventsApi";
import { useState } from "react";
import { usePageParam } from "@/hooks/usePageParam";

export type UseEventsParams = {
  time_filter?: TimeFilter;
  start_date?: string;
  end_date?: string;
  registration_policy?: string | null;
  event_scope?: string | null;
  event_type?: string | null;
  event_status?: string | null;
  community_id?: number | null;
  creator_sub?: string | null;
  keyword?: string | null;
  size?: number;
};

export const useEvents = (params: UseEventsParams) => {
  const [page, setPage] = usePageParam();
  const [size, setSize] = useState(params.size ?? 12);
  const [keyword, setKeyword] = useState("");

  const { data, isLoading, isError } = useQuery(
    campuscurrentAPI.getEventsQueryOptions({
      ...params,
      page,
      size,
      keyword: keyword || null,
    }),
  );

  return {
    events: data || null,
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
