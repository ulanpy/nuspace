import { useQuery } from "@tanstack/react-query";
import { campuscurrentAPI } from "@/features/campuscurrent/events/api/eventsApi";
import { useState } from "react";

export const useEvents = (params: { start_date?: string; end_date?: string }) => {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(12);
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
