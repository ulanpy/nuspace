"use client";

import { useQuery } from "@tanstack/react-query";
import { apiCall } from "@/utils/api";

export type AnnouncementsBundleResponse = {
  events: {
    items: any[];
    total_pages: number;
    total: number;
    page: number;
    size: number;
    has_next: boolean;
  };
  recruitment_events: {
    items: any[];
    total_pages: number;
    total: number;
    page: number;
    size: number;
    has_next: boolean;
  };
};

/** Featured (1) + More upcoming strip (10) on desktop; strip-only on mobile. */
const EVENTS_SIZE = 11;

export function useAnnouncementsBundle() {
  return useQuery({
    queryKey: ["announcements", "bundle", { v: 3, events_size: EVENTS_SIZE }],
    queryFn: async () => {
      return await apiCall<AnnouncementsBundleResponse>(
        `/announcements/bundle?events_size=${EVENTS_SIZE}`,
      );
    },
  });
}
