"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, RefreshCcw } from "lucide-react";
import { PhotoAlbumCard } from "@/features/communities/components/photo-album-card";
import { PhotoAlbum } from "@/features/communities/hooks/use-infinite-photo-albums";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import * as Routes from "@/data/routes";

const PAGE_SIZE = 20;
const AUTO_SCROLL_INTERVAL_MS = 4200;
const AUTO_SCROLL_STEP_PX = 280;

type AlbumFeedItem = PhotoAlbum & {
  community_name?: string | null;
};

/**
 * Horizontal, auto-scrolling carousel that streams photo albums across all communities.
 * Uses infinite scroll (20 per page) and loops when reaching the end of the list.
 */
export function GalleryCarousel() {
  const {
    items: albums,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    loadMoreRef,
  } = useInfiniteScroll<AlbumFeedItem>({
    queryKey: ["announcements", "photo-albums-feed"],
    apiEndpoint: `/photo-albums`,
    size: PAGE_SIZE,
    transformResponse: (response: any) => ({
      items: response.albums ?? [],
      total_pages: response.total_pages ?? 1,
      page: response.page ?? 1,
      has_next: response.has_next ?? false,
    }),
  });

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-scroll and loop when reaching the end of the list.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || albums.length === 0) return;

    const id = setInterval(() => {
      if (isPaused) return;
      const maxScroll = container.scrollWidth - container.clientWidth;
      const nearingEnd = container.scrollLeft >= maxScroll - AUTO_SCROLL_STEP_PX;

      if (nearingEnd) {
        if (hasNextPage) {
          if (!isFetchingNextPage) {
            fetchNextPage();
          }
        } else {
          // No more pages to load: loop back to the start of the carousel.
          container.scrollTo({ left: 0, behavior: "smooth" });
        }
        return;
      }

      container.scrollBy({ left: AUTO_SCROLL_STEP_PX, behavior: "smooth" });
    }, AUTO_SCROLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [albums.length, fetchNextPage, hasNextPage, isFetchingNextPage, isPaused]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Latest Albums</h2>
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="w-[260px] flex-shrink-0">
              <div className="h-44 bg-muted animate-pulse rounded-lg" />
              <div className="h-4 w-3/4 bg-muted animate-pulse rounded mt-3" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="p-8 text-center rounded-xl border bg-card">
          <RefreshCcw className="h-12 w-12 mx-auto text-destructive mb-3" />
          <p className="text-muted-foreground">Could not load photo albums. Please try again.</p>
        </div>
      ) : albums.length === 0 ? (
        <div className="p-8 text-center rounded-xl border bg-card">
          <p className="text-muted-foreground">No photo albums available yet.</p>
        </div>
      ) : (
        <div className="relative">
          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            aria-label="Community photo albums carousel"
          >
            {albums.map((album) => (
              <div key={album.id} className="w-[260px] flex-shrink-0 snap-start space-y-2">
                <PhotoAlbumCard album={album} communityId={album.community_id} />
                <Link
                  href={Routes.ROUTES.COMMUNITIES.DETAIL_FN(album.community_id)}
                  className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>{album.community_name || "View community"}</span>
                </Link>
              </div>
            ))}

            {hasNextPage && (
              <div ref={loadMoreRef} className="w-4 flex-shrink-0" aria-hidden />
            )}
          </div>
        </div>
      )}

      {isFetchingNextPage && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading more albums...</span>
        </div>
      )}
    </div>
  );
}
