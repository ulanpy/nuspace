import { useQuery } from "@tanstack/react-query";
import { campuscurrentAPI } from "../api/events-api";
import { useParams } from "react-router-dom";

export const useCommunity = () => {
  const { id } = useParams<{ id: string }>();
  console.log("id", id);
  const {
    data: club,
    isPending,
    isLoading,
    isError,
  } = useQuery({
    ...campuscurrentAPI.getEventQueryOptions(id || ""),
    enabled: !!id,
  });
  return { club: club || null, isPending, isLoading, isError };
};
