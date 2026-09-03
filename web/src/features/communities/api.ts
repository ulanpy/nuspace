import {
  queryOptions,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"

import { api, unwrap } from "@/api/client"
import { qk } from "@/api/query-keys"
import { pollForMedia } from "@/lib/media-polling"
import { useMediaUpload } from "@/features/media/use-media-upload"
import type { UploadItem } from "@/features/media/use-media-upload"
import { assertValidImageBatch } from "@/features/media/types"
import { saveWithMedia } from "@/features/media/save-with-media"
import type {
  CommunityCategory,
  CommunityCreate,
  CommunityType,
  CommunityUpdate,
} from "@/features/communities/types"

export interface CommunityFilters {
  community_type?: CommunityType
  community_category?: CommunityCategory
  keyword?: string
}

/** One page of the communities list. Used by useInfiniteList. */
export function fetchCommunitiesPage(
  filters: CommunityFilters,
  { page, size }: { page: number; size: number }
) {
  return unwrap(
    api.GET("/communities", {
      params: { query: { page, size, ...filters } },
    })
  )
}

/**
 * Communities the signed-in user owns.
 *
 * The filter is `owner_sub`, and `"me"` resolves to the caller server-side. The
 * old app sent `head=<sub>` — a parameter the backend does not declare, so
 * FastAPI dropped it and the profile page's "My Communities" was really the
 * first 100 of every community on campus.
 */
export function myCommunitiesQueryOptions() {
  return queryOptions({
    queryKey: qk.communities.mine(),
    queryFn: () =>
      unwrap(
        api.GET("/communities", {
          params: { query: { owner_sub: "me", page: 1, size: 100 } },
        })
      ),
  })
}

function fetchCommunity(slug: string) {
  return unwrap(
    api.GET("/communities/{slug}", {
      params: { path: { slug } },
    })
  )
}

export function communityDetailQueryOptions(slug: string) {
  return queryOptions({
    queryKey: qk.communities.detail(slug),
    queryFn: () => fetchCommunity(slug),
  })
}

/**
 * Refreshes once the newly uploaded images exist server-side.
 *
 * Not awaited by the mutation, for the reasons in `lib/media-polling.ts`. The
 * readiness test counts: a community can be saved with a new banner and no new
 * profile picture, so waiting for "any media" would resolve immediately
 * against the profile picture it already had.
 */
function refreshWhenMediaLands(
  queryClient: QueryClient,
  slug: string,
  expected: number
) {
  void pollForMedia({
    fetch: () => fetchCommunity(slug),
    isReady: (community) => community.media.length >= expected,
  }).then(async (community) => {
    if (community) {
      await queryClient.invalidateQueries({ queryKey: qk.communities.all() })
    }
  })
}

/**
 * Profile picture and banner, in one list.
 *
 * Both are `entity_type: communities` and are told apart only by their format,
 * so the pairing has to survive all the way to the signed URL. `mediaOrder` is
 * per-format, hence the two independent counters.
 */
export function toCommunityUploadItems(
  profile: readonly File[],
  banner: readonly File[]
): UploadItem[] {
  return [
    ...profile.map((file, index) => ({
      file,
      mediaFormat: "profile" as const,
      mediaOrder: index,
    })),
    ...banner.map((file, index) => ({
      file,
      mediaFormat: "banner" as const,
      mediaOrder: index,
    })),
  ]
}

export function useCreateCommunity() {
  const queryClient = useQueryClient()
  const { uploadMedia } = useMediaUpload()

  return useMutation({
    mutationFn: async ({
      body,
      items,
    }: {
      body: CommunityCreate
      items: UploadItem[]
    }) => {
      return saveWithMedia({
        validate: () => {
          assertValidImageBatch(items.map((item) => item.file))
        },
        saveEntity: () => unwrap(api.POST("/communities", { body })),
        uploadMedia:
          items.length > 0
            ? async (community) => {
                const uploaded = await uploadMedia({
                  entityType: "communities",
                  entityId: community.id,
                  items,
                })
                return uploaded.length
              }
            : undefined,
      })
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: qk.communities.all() })
      if (result.successfulUploadCount > 0) {
        refreshWhenMediaLands(
          queryClient,
          result.entity.slug,
          result.successfulUploadCount
        )
      }
    },
  })
}

export function useUpdateCommunity() {
  const queryClient = useQueryClient()
  const { uploadMedia } = useMediaUpload()

  return useMutation({
    mutationFn: async ({
      slug,
      id,
      body,
      items,
    }: {
      slug: string
      id: number
      /** Removals from both zones ride along as `media_ids_to_delete`. */
      body: CommunityUpdate
      items: UploadItem[]
    }) => {
      return saveWithMedia({
        validate: () => {
          assertValidImageBatch(items.map((item) => item.file))
        },
        saveEntity: () =>
          unwrap(
            api.PATCH("/communities/{slug}", {
              params: { path: { slug } },
              body,
            })
          ),
        uploadMedia:
          items.length > 0
            ? async () => {
                const uploaded = await uploadMedia({
                  entityType: "communities",
                  entityId: id,
                  items,
                })
                return uploaded.length
              }
            : undefined,
      })
    },
    onSuccess: async (result, { slug }) => {
      await queryClient.invalidateQueries({ queryKey: qk.communities.all() })
      if (result.successfulUploadCount > 0) {
        // The slug may have been edited in the same request, so poll the
        // entity's current address from the PATCH response, not the stale one
        // the mutation was called with.
        const currentSlug = result.entity.slug ?? slug
        // Counted from what survived the PATCH, so images deleted in the same
        // request are not waited for on top of the ones being added.
        refreshWhenMediaLands(
          queryClient,
          currentSlug,
          result.entity.media.length + result.successfulUploadCount
        )
      }
    },
  })
}

/** Admin only, per `CommunityPolicy` — the owner cannot delete their own club. */
export function useDeleteCommunity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (slug: string) =>
      unwrap(
        api.DELETE("/communities/{slug}", {
          params: { path: { slug } },
        })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.communities.all() })
    },
  })
}
