import { useQuery } from "@tanstack/react-query";
import { campuscurrentAPI } from '@/features/events/api/events-api';
import { useState } from "react";

export type UseEventsParams = {
  from_datetime?: string;
  to_datetime?: string;
  registration_policy?: string | null;
  event_type?: string | null;
  event_status?: string | null;
  creator_sub?: string | null;
  keyword?: string | null;
  size?: number;
};

export const useEvents = (params: UseEventsParams) => {
  const [page, setPage] = useState(1);
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
    items: data?.items ?? null,
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
