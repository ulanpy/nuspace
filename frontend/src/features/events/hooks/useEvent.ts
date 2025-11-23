import { useQuery } from "@tanstack/react-query";
import { campuscurrentAPI } from "../api/eventsApi";
import { useParams } from "react-router-dom";

export const useEvent = () => {
  const { id } = useParams<{ id: string }>();
  const {
    data: event,
    isPending,
    isLoading,
    isError,
  } = useQuery({
    ...campuscurrentAPI.getEventQueryOptions(id || ""),
    enabled: !!id,
  });
  return { event: event || null, isPending, isLoading, isError };
};
