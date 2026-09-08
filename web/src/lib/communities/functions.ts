import {
  queryOptions,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"
import { api, unwrap } from "@/api/client"
import { qk } from "@/api/query-keys"
import { pollForMedia } from "@/lib/media"
import { useMediaUpload, type UploadItem } from "@/hooks/use-media-upload"
import { assertValidImageBatch } from "@/lib/media"
import { saveWithMedia } from "@/lib/media"
import type {
  AdminLink,
  AdminLinkAcceptResult,
  Community,
  CommunityCategory,
  CommunityCreate,
  CommunityType,
  CommunityUpdate,
} from "./types"

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
 * Not awaited by the mutation, for the reasons in `lib/media/functions.ts`. The
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

export function communityAdminLinkQueryOptions(slug: string) {
  return queryOptions({
    queryKey: qk.adminLink.detail(slug),
    queryFn: () =>
      unwrap(
        api.GET("/communities/{slug}/admin-link", {
          params: { path: { slug } },
        })
      ),
    // The backend issues a fresh token per GET, so the value must never be
    // silently refetched after it has been shown to the user.
    staleTime: Infinity,
  })
}

/** Rotates the shareable admin-access link, invalidating the previous one. */
export function useRotateAdminLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (slug: string): Promise<AdminLink> =>
      unwrap(
        api.POST("/communities/{slug}/admin-link/rotate", {
          params: { path: { slug } },
        })
      ),
    onSuccess: (link, slug) => {
      queryClient.setQueryData(qk.adminLink.detail(slug), link)
    },
  })
}

/** Removes another admin. Owner or site admin only. */
export function useRemoveCommunityAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ slug, userSub }: { slug: string; userSub: string }) =>
      unwrap(
        api.DELETE("/communities/{slug}/admins/{user_sub}", {
          params: { path: { slug, user_sub: userSub } },
        })
      ),
    onSuccess: (community, { slug }) => {
      queryClient.setQueryData(qk.communities.detail(slug), community)
      void queryClient.invalidateQueries({ queryKey: qk.communities.all() })
    },
  })
}

/** Leaves a community as an admin. Owners cannot leave this way. */
export function useLeaveCommunity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (slug: string) =>
      unwrap(
        api.DELETE("/communities/{slug}/admins/me", {
          params: { path: { slug } },
        })
      ),
    onSuccess: (community, slug) => {
      queryClient.setQueryData(qk.communities.detail(slug), community)
      void queryClient.invalidateQueries({ queryKey: qk.communities.all() })
    },
  })
}

/** Redeems a shareable admin-access link. Idempotent. */
export function useAcceptCommunityAdminLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (token: string): Promise<AdminLinkAcceptResult> =>
      unwrap(
        api.POST("/communities/admin-links/accept", {
          body: { token },
        })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.communities.all() })
    },
  })
}

/**
 * URL checks for the community form.
 *
 * Ported from `frontend/src/lib/communities/url-validation.ts`,
 * which was the only tested module in the old app — its test came with it and
 * lives in this module's `tests.ts`.
 *
 * The zod schemas the original wrapped these rules in are gone; every one of
 * them ended in a `refine` that re-parsed the string with `new URL` anyway, so
 * the schema layer only obscured what was being checked.
 *
 * The interesting case, and the reason the tests exist, is that `new URL`
 * accepts far more than it looks like it does. `https://wtf://t.me/x` parses
 * happily, with `wtf:` as the *host* — so a bare protocol check would let it
 * through and someone would end up with a link that goes nowhere near Telegram.
 * Hence the "exactly one `://`" rule.
 */

const TELEGRAM_HOSTS = new Set(["t.me", "telegram.me"])
const INSTAGRAM_HOSTS = new Set(["instagram.com", "instagr.am"])

/** Anything with a second `://` is not the URL it appears to be. */
function hasSingleSchemeDelimiter(value: string): boolean {
  const first = value.indexOf("://")
  return first !== -1 && first === value.lastIndexOf("://")
}

/** Parses only what is genuinely an http(s) URL, and nothing else. */
function parseHttpUrl(value: string): URL | null {
  const trimmed = value.trim()
  if (!hasSingleSchemeDelimiter(trimmed)) return null

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  return url.protocol === "http:" || url.protocol === "https:" ? url : null
}

function hostMatches(value: string, hosts: ReadonlySet<string>): boolean {
  const url = parseHttpUrl(value)
  if (!url) return false
  // Exact host match after dropping `www.`: `evil.t.me` is not `t.me`.
  return hosts.has(url.hostname.toLowerCase().replace(/^www\./, ""))
}

/**
 * Adds a scheme to a bare domain so `t.me/nuspace` is accepted as typed.
 *
 * Only when there is no scheme at all. A value that already names one is left
 * exactly as it is, including a nonsensical one — rewriting `wtf://` to
 * `https://wtf://` would turn a typo into a plausible-looking wrong URL, and
 * the validators below are what should reject it.
 */
export function normalizeHttpUrl(
  value: string | undefined | null
): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  return /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`
}

/** An error message, or undefined when the value is acceptable. */
export function getHttpsUrlError(value: string): string | undefined {
  return parseHttpUrl(value)?.protocol === "https:"
    ? undefined
    : "Enter an HTTPS URL"
}

export function getTelegramUrlError(value: string): string | undefined {
  return hostMatches(value, TELEGRAM_HOSTS) ? undefined : "Enter a Telegram URL"
}

export function getInstagramUrlError(value: string): string | undefined {
  return hostMatches(value, INSTAGRAM_HOSTS)
    ? undefined
    : "Enter an Instagram URL"
}

/**
 * Whether the server will accept an edit to this field, for this user.
 *
 * Read `editable_fields` and not a role check — see the equivalent on events.
 *
 * Note the server's editable_fields list also names `page_content` and
 * `owner`. `owner` has no matching field on `CommunityUpdateRequest` and is
 * changed through a dedicated endpoint, so it is not editable here. The rest
 * (`name`, `type`, `category`, `email`, `slug`) map directly onto the PATCH
 * body.
 */
export function canEditField(community: Community, field: string): boolean {
  return community.permissions.editable_fields.includes(field)
}
