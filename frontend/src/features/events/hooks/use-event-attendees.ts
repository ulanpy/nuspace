import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { apiCall } from "@/utils/api";
import * as Routes from "@/data/routes";
import type { ListEventAttendeesResponse } from "@/features/shared/campus/types";

const PAGE_SIZE = 20;

export function useEventAttendees(eventId: number | undefined, enabled: boolean) {
  const id = eventId != null ? String(eventId) : "";

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["campusCurrent", "event", id, "attendees", "infinite"],
    enabled: enabled && !!id,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        size: String(PAGE_SIZE),
      });
      return apiCall<ListEventAttendeesResponse>(
        `/` + Routes.EVENTS + `/${id}/attendees?` + params.toString(),
      );
    },
    getNextPageParam: (lastPage) =>
      lastPage.has_next ? lastPage.page + 1 : undefined,
  });

  const attendees = useMemo(() => {
    const items = data?.pages.flatMap((page) => page.items) ?? [];
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.sub)) return false;
      seen.add(item.sub);
      return true;
    });
  }, [data]);

  const total = data?.pages[0]?.total ?? 0;

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node || !hasNextPage) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
          }
        },
        { rootMargin: "160px" },
      );
      observerRef.current.observe(node);
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return {
    attendees,
    total,
    isLoading,
    isError,
    hasNextPage: Boolean(hasNextPage),
    isFetchingNextPage,
    loadMoreRef,
  };
}

export async function downloadEventAttendeesExport(
  eventId: number | string,
  format: "csv" | "xlsx",
) {
  const response = await fetch(
    `/api/` + Routes.EVENTS + `/${eventId}/attendees/export?format=${format}`,
    { credentials: "include" },
  );
  if (!response.ok) {
    throw new Error(`Export failed: ${response.status}`);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename =
    match?.[1] || `nuspace_attendance.${format === "csv" ? "csv" : "xlsx"}`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
