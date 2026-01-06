import { useQuery } from "@tanstack/react-query";
import { campuscurrentAPI } from '../api/events-api';
import { useSearchParams } from "next/navigation";

export const useEvent = () => {
  const searchParams = useSearchParams();
  // Get ID from query parameter for static export compatibility
  // URL format: /events/?id=123
  const id = searchParams.get('id') || undefined;
  
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
