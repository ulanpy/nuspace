"use client";

import { useQuery } from "@tanstack/react-query";
import { apiCall } from "@/utils/api";

export type AnnouncementsBundleResponse = {
  photo_albums: {
    albums: any[];
    total_pages: number;
    total: number;
    page: number;
    size: number;
    has_next: boolean;
  };
  communities: {
    items: any[];
    total_pages: number;
    total: number;
    page: number;
    size: number;
    has_next: boolean;
  };
  events: {
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
    queryKey: ["announcements", "bundle", { v: 1 }],
    queryFn: async () => {
      return await apiCall<AnnouncementsBundleResponse>("/announcements/bundle");
    },
  });
}

