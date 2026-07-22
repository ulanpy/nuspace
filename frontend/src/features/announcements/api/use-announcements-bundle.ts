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

export function useAnnouncementsBundle() {
  return useQuery({
    queryKey: ["announcements", "bundle", { v: 2 }],
    queryFn: async () => {
      return await apiCall<AnnouncementsBundleResponse>("/announcements/bundle");
    },
  });
}
