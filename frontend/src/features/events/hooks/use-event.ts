import { useQuery } from "@tanstack/react-query";
import { campuscurrentAPI } from '../api/events-api';
import { useParams } from "next/navigation";

export const useEvent = () => {
  const params = useParams<{ id: string }>();
  const id = params.id;
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
