import { useQuery } from "@tanstack/react-query";
import { campuscurrentAPI } from '../api/events-api';
import { useSearchParams } from "@/router/navigation";

export const useEvent = () => {
  const searchParams = useSearchParams();
  // URL format: /events?id=123 (strip accidental JSON quotes from router encoding)
  const rawId = searchParams.get("id");
  const id = rawId?.replace(/^"|"$/g, "") || undefined;
  
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
