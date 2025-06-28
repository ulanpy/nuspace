import { useQuery } from "@tanstack/react-query";
import { nuEventsAPI } from "../nu-events-api";
import { useState } from "react";

export const useCommunities = () => {
  const { data, isLoading, isError } = useQuery({
    ...nuEventsAPI.getCommunitiesQueryOptions,
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
