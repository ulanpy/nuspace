import { useQuery } from "@tanstack/react-query";
import { campuscurrentAPI } from "../api/events-api";
import { useState } from "react";

export const useEvents = () => {
  const { data, isLoading, isError } = useQuery({
    ...campuscurrentAPI.getEventsQueryOptions,
  });

  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");

  return {
    communities: data || null,
    isLoading,
    isError,
    page,
    setPage,
    keyword,
    setKeyword,
  };
};
