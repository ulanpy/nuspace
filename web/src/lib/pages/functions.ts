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
  Page,
  PageCreate,
  PageUpdate,
} from "./types"

export interface PageFilters {
  keyword?: string
  /** `"me"` resolves to the caller server-side; `myPagesQueryOptions` uses it. */
  owner_sub?: string
  /** `owned` is pages you head, `admin` is pages you are an admin of. */
  role?: "owned" | "admin"
  /**
   * Whether your own `private` pages are in the list. Defaults to true, which
   * is what every management list wants.
   *
   * The public directory on `/mynuspace` passes false. Without it, signing in
   * put your own private page in the public grid: a `private` page reaches a
   * list only through the owner alternative in the server's visibility WHERE,
   * and that applied to every caller rather than the ones managing a page.
   */
  include_private?: boolean
}

/** One page of the pages list. Used by useInfiniteList. */
export function fetchPagesPage(
  filters: PageFilters,
  { page, size }: { page: number; size: number }
) {
  return unwrap(
    api.GET("/pages", {
      params: { query: { page, size, ...filters } },
    })
  )
}

/**
 * Pages the signed-in user owns.
 *
 * The filter is `owner_sub`, and `"me"` resolves to the caller server-side. The
 * old app sent `head=<sub>` — a parameter the backend does not declare, so
 * FastAPI dropped it and the profile page's "My Pages" was really the first 100
 * of every page on campus.
 */
export function myPagesQueryOptions() {
  return queryOptions({
    queryKey: qk.pages.mine(),
    queryFn: () =>
      unwrap(
        api.GET("/pages", {
          params: { query: { owner_sub: "me", page: 1, size: 100 } },
        })
      ),
  })
}

function fetchPage(slug: string) {
  return unwrap(
    api.GET("/pages/{slug}", {
      params: { path: { slug } },
    })
  )
}

export function pageDetailQueryOptions(slug: string) {
  return queryOptions({
    queryKey: qk.pages.detail(slug),
    queryFn: () => fetchPage(slug),
  })
}

/**
 * Refreshes once the newly uploaded images exist server-side.
 *
 * Not awaited by the mutation, for the reasons in `lib/media/functions.ts`. The
 * readiness test counts: a page can be saved with a new banner and no new
 * profile picture, so waiting for "any media" would resolve immediately
 * against the profile picture it already had.
 */
function refreshWhenMediaLands(
  queryClient: QueryClient,
  slug: string,
  expected: number
) {
  void pollForMedia({
    fetch: () => fetchPage(slug),
    isReady: (page) => page.media.length >= expected,
  }).then(async (page) => {
    if (page) {
      await queryClient.invalidateQueries({ queryKey: qk.pages.all() })
    }
  })
}

/**
 * Profile picture and banner, in one list.
 *
 * Both are `entity_type: pages` and are told apart only by their format,
 * so the pairing has to survive all the way to the signed URL. `mediaOrder` is
 * per-format, hence the two independent counters.
 */
export function toPageUploadItems(
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

export function useCreatePage() {
  const queryClient = useQueryClient()
  const { uploadMedia } = useMediaUpload()

  return useMutation({
    mutationFn: async ({
      body,
      items,
    }: {
      body: PageCreate
      items: UploadItem[]
    }) => {
      return saveWithMedia({
        validate: () => {
          assertValidImageBatch(items.map((item) => item.file))
        },
        saveEntity: () => unwrap(api.POST("/pages", { body })),
        uploadMedia:
          items.length > 0
            ? async (page) => {
                const uploaded = await uploadMedia({
                  entityType: "pages",
                  entityId: page.id,
                  items,
                })
                return uploaded.length
              }
            : undefined,
      })
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: qk.pages.all() })
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

export function useUpdatePage() {
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
      body: PageUpdate
      items: UploadItem[]
    }) => {
      return saveWithMedia({
        validate: () => {
          assertValidImageBatch(items.map((item) => item.file))
        },
        saveEntity: () =>
          unwrap(
            api.PATCH("/pages/{slug}", {
              params: { path: { slug } },
              body,
            })
          ),
        uploadMedia:
          items.length > 0
            ? async () => {
                const uploaded = await uploadMedia({
                  entityType: "pages",
                  entityId: id,
                  items,
                })
                return uploaded.length
              }
            : undefined,
      })
    },
    onSuccess: async (result, { slug }) => {
      await queryClient.invalidateQueries({ queryKey: qk.pages.all() })
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

/** One page of a page's admins. `excludeSub` drops the pinned "You" row. */
export async function fetchPageAdminsPage(
  slug: string,
  {
    page,
    size,
    excludeSub,
  }: { page: number; size: number; excludeSub?: string }
) {
  const response = await unwrap(
    api.GET("/pages/{slug}/admins", {
      params: {
        path: { slug },
        query: { page, size, exclude_sub: excludeSub },
      },
    })
  )

  // `items` is optional in the generated types only because the OpenAPI
  // generator cannot see `Field(default_factory=list)`. The backend always
  // sends a list, so normalise it here instead of at every call site.
  return { ...response, items: response.items ?? [] }
}

/** Admin only, per `PagePolicy` — the owner cannot delete their own club. */
export function useDeletePage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (slug: string) =>
      unwrap(
        api.DELETE("/pages/{slug}", {
          params: { path: { slug } },
        })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.pages.all() })
    },
  })
}

export function pageAdminLinkQueryOptions(slug: string) {
  return queryOptions({
    queryKey: qk.adminLink.detail(slug),
    queryFn: () =>
      unwrap(
        api.GET("/pages/{slug}/admin-link", {
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
        api.POST("/pages/{slug}/admin-link/rotate", {
          params: { path: { slug } },
        })
      ),
    onSuccess: (link, slug) => {
      queryClient.setQueryData(qk.adminLink.detail(slug), link)
    },
  })
}

/**
 * Hands the page to another admin. Owner or site admin only.
 *
 * The backend drops the new owner's admin row but does not re-add the old one,
 * so an owner who transfers away loses access to these settings entirely. The
 * caller has to navigate out — see `admins-table.tsx`.
 */
export function useTransferPageOwner() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ slug, ownerSub }: { slug: string; ownerSub: string }) =>
      unwrap(
        api.PATCH("/pages/{slug}/owner", {
          params: { path: { slug } },
          body: { owner_sub: ownerSub },
        })
      ),
    onSuccess: (page, { slug }) => {
      queryClient.setQueryData(qk.pages.detail(slug), page)
      void queryClient.invalidateQueries({ queryKey: qk.pages.all() })
    },
  })
}

/** Removes another admin. Owner or site admin only. */
export function useRemovePageAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ slug, userSub }: { slug: string; userSub: string }) =>
      unwrap(
        api.DELETE("/pages/{slug}/admins/{user_sub}", {
          params: { path: { slug, user_sub: userSub } },
        })
      ),
    onSuccess: (page, { slug }) => {
      queryClient.setQueryData(qk.pages.detail(slug), page)
      void queryClient.invalidateQueries({ queryKey: qk.pages.all() })
    },
  })
}

/** Leaves a page as an admin. Owners cannot leave this way. */
export function useLeavePage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (slug: string) =>
      unwrap(
        api.DELETE("/pages/{slug}/admins/me", {
          params: { path: { slug } },
        })
      ),
    onSuccess: (page, slug) => {
      queryClient.setQueryData(qk.pages.detail(slug), page)
      void queryClient.invalidateQueries({ queryKey: qk.pages.all() })
    },
  })
}

/** Redeems a shareable admin-access link. Idempotent. */
export function useAcceptPageAdminLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (token: string): Promise<AdminLinkAcceptResult> =>
      unwrap(
        api.POST("/pages/admin-links/accept", {
          body: { token },
        })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.pages.all() })
    },
  })
}

/**
 * Which controls a single admin row may show.
 *
 * The rules are not derivable from role alone, and the server enforces each of
 * them separately:
 *  - the owner row is inert — the backend refuses a self-remove (`remove_admin`)
 *    and a self-transfer would be a no-op, so neither button is offered;
 *  - you cannot remove or demote yourself, only leave;
 *  - `can_manage_admins` is the gate, NOT `can_change_owner` — the latter is
 *    site-admin-only (`get_page_permissions`), which would hide transfer
 *    from the owner, who is the person who most needs it.
 */
export function adminPageActions(
  row: { isSelf: boolean; isOwner: boolean },
  canManageAdmins: boolean
): { canManage: boolean; canLeave: boolean } {
  return {
    canManage: canManageAdmins && !row.isOwner && !row.isSelf,
    canLeave: row.isSelf && !row.isOwner,
  }
}

/**
 * Whether the server will accept an edit to this field, for this user.
 *
 * Read `editable_fields` and not a role check — see the equivalent on events.
 *
 * Note the server's editable_fields list also names `page_content` and
 * `owner`. `owner` has no matching field on `PageUpdateRequest` and is changed
 * through a dedicated endpoint, so it is not editable here. The rest (`name`,
 * `description`, `slug`, `visibility`) map directly onto the PATCH body.
 */
export function canEditField(page: Page, field: string): boolean {
  return page.permissions.editable_fields.includes(field)
}
