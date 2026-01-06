import { useQuery } from "@tanstack/react-query";
import { campuscurrentAPI } from '../api/events-api';
import { usePathname } from "next/navigation";

export const useEvent = () => {
  const pathname = usePathname();
  // Extract ID from pathname for static export compatibility
  // Pattern: /events/{id} or /events/{id}/
  const extractedId = pathname?.match(/\/events\/([^/]+)/)?.[1];
  // Filter out 'placeholder' - it's the static generation placeholder, not a real ID
  const id = extractedId && extractedId !== 'placeholder' ? extractedId : undefined;
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
