import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import * as Routes from "@/data/routes";

export type PhotoAlbumType = "event_photos" | "club_photoshoot" | "other";

export type PhotoAlbum = {
  id: number;
  community_id: number;
  album_url: string;
  description: string | null;
  album_type: PhotoAlbumType;
  album_title: string | null;
  album_thumbnail_url: string | null;
  album_date: string | null;
  created_at: string;
  updated_at: string;
};

export type UseInfinitePhotoAlbumsParams = {
  communityId: number | null | undefined;
  size?: number;
  albumType?: PhotoAlbumType | null;
  enabled?: boolean;
};

export function useInfinitePhotoAlbums(params: UseInfinitePhotoAlbumsParams) {
  const { communityId, size = 20, albumType = null } = params;

  const additionalParams: Record<string, any> = {};
  if (albumType) {
    additionalParams.album_type = albumType;
  }

  const result = useInfiniteScroll<PhotoAlbum>({
    queryKey: ["campusCurrent", "community", String(communityId ?? 0), "albums", albumType ?? "all"],
    apiEndpoint: `/${Routes.COMMUNITIES}/${communityId}/albums`,
    size,
    additionalParams,
    transformResponse: (response: any) => {
      // Transform the response to match the expected format
      return {
        items: response.albums ?? [],
        total_pages: response.total_pages ?? 1,
        page: response.page ?? 1,
        has_next: response.has_next ?? false,
      };
    },
  });

  return {
    ...result,
    albums: result.items,
  };
}
