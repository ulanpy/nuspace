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
  PageAdminSort,
  PageCreate,
  PageOrder,
  PageOwnership,
  PageSort,
  PageUpdate,
  PageVisibilityValue,
} from "./types"
import { PAGE_OWNERSHIP } from "./constants"

/**
 * One page of the public directory, for `useInfiniteList`.
 *
 * `GET /pages` and `GET /pages/mine` are two different questions with two
 * different answers, so they are two endpoints and two functions. They used to
 * be one endpoint with an `include_private` flag, and the flag is what broke:
 * one query meant two things, so every caller had to be trusted to pass the
 * right combination, and the My Pages "All" tab passed none at all.
 */
export function fetchBrowsablePages(
  { keyword }: { keyword?: string },
  { page, size }: { page: number; size: number }
) {
  return unwrap(
    api.GET("/pages", {
      params: { query: { page, size, keyword } },
    })
  )
}

/** One page of the My Pages table: every page you own or administer. */
export function fetchMyPages(
  {
    keyword,
    role,
    visibility,
    sort,
    order,
  }: {
    keyword?: string
    role?: PageOwnership
    visibility?: PageVisibilityValue[]
    sort?: PageSort
    order?: PageOrder
  },
  { page, size }: { page: number; size: number }
) {
  return unwrap(
    api.GET("/pages/mine", {
      params: { query: { page, size, keyword, role, visibility, sort, order } },
    })
  )
}

/**
 * Query options for the My Pages table, next to the fetch they call.
 *
 * Deleted in `b176a18` for having no callers, back when it was a third
 * encoding of the same question as `owner_sub=me`. It is back for a different
 * reason: it now carries the real filter and sort params, and the component
 * used to build a `queryKey` and a `queryFn` whose param lists had to be kept
 * in agreement by hand. `owner_sub` is not resurrected.
 */
export function myPagesQueryOptions({
  page,
  size,
  role,
  visibility,
  sort,
  order,
}: {
  page: number
  size: number
  role?: PageOwnership
  visibility?: PageVisibilityValue[]
  sort?: PageSort
  order?: PageOrder
}) {
  return queryOptions({
    queryKey: qk.pages.mine({ page, size, role, visibility, sort, order }),
    queryFn: () =>
      fetchMyPages({ role, visibility, sort, order }, { page, size }),
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
    sort,
    order,
  }: {
    page: number
    size: number
    excludeSub?: string
    sort?: PageAdminSort
    order?: PageOrder
  }
) {
  const response = await unwrap(
    api.GET("/pages/{slug}/admins", {
      params: {
        path: { slug },
        query: {
          page,
          size,
          exclude_sub: excludeSub,
          sort,
          order,
        },
      },
    })
  )

  // `items` is optional in the generated types only because the OpenAPI
  // generator cannot see `Field(default_factory=list)`. The backend always
  // sends a list, so normalise it here instead of at every call site.
  return { ...response, items: response.items ?? [] }
}

/**
 * Query options for a page's admins table, next to the fetch it calls.
 *
 * Same reason as `myPagesQueryOptions`: the component used to write the key and
 * the fetch out separately, and the only thing keeping the two param lists in
 * agreement was reading them side by side.
 */
export function pageAdminsQueryOptions({
  slug,
  page,
  size,
  excludeSub,
  sort,
  order,
}: {
  slug: string
  page: number
  size: number
  excludeSub?: string
  sort?: PageAdminSort
  order?: PageOrder
}) {
  return queryOptions({
    queryKey: qk.pages.admins(slug, { page, size, excludeSub, sort, order }),
    queryFn: () =>
      fetchPageAdminsPage(slug, { page, size, excludeSub, sort, order }),
  })
}

/**
 * Delete a page, then drop every cached row that mentioned it.
 *
 * A former comment here said "Admin only, per `PagePolicy` — the owner cannot
 * delete their own club." That was wrong on both counts: `policy.py`'s DELETE
 * branch and `utils.py:30-32` both grant the owner `can_delete`, and the
 * whole reason a page owner gets that flag is that they can delete their own
 * page. The behaviour was never gated on role and still is not; only the
 * comment was wrong.
 */
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
/**
 * Which of the two relationships a page has with the signed-in user.
 *
 * The FK `page.owner`, never `page.owner_user?.sub`. `backend/modules/pages/
 * policy.py:26-28` carries the same rule and the same reason: the relationship
 * is `None` on an ownerless page, and the check runs on every read. The two
 * disagree in the one case that matters — `owner_user` is a `ShortUserResponse
 * | None` that can name someone other than the FK's holder, so reading the
 * nested attribute answers a different question than the one being asked.
 *
 * "Not the owner" is read as `"admin"`, which is only correct for a list the
 * server already filtered to the pages you own or administer — `/pages/mine`,
 * which is where this is called. `ResourcePermissions` has no "I am an admin"
 * flag, and `can_manage_admins` is not one: a site admin gets it too. So this
 * cannot be used to ask "does this viewer administer the page", and pretending
 * otherwise is the `pinnedSelf` inference this replaced.
 */
export function pageOwnership(page: Page, meSub: string): PageOwnership {
  return page.owner === meSub ? "owner" : "admin"
}

/** The relationship in words, for a badge or a cell. */
export function ownershipLabel(ownership: PageOwnership) {
  return PAGE_OWNERSHIP[ownership]
}

/**
 * Turns a react-table sort event into the route's `sort` / `order` pair.
 *
 * One column, one direction, because the backend has one sort key. react-table
 * would happily stack a second sort on shift-click, and this deliberately does
 * not: the empty case *clears* the sort rather than starting a compound one,
 * because nothing in either table lets a user remove the first entry, and a
 * table stuck on an invisible compound sort is a support question.
 *
 * `isSortable` is passed in rather than imported because the two tables sort by
 * different whitelists — pages by name / visibility / created_at, admins by
 * name / created_at — and an id neither accepts is treated as no sort at all
 * rather than written to the URL. A renamed column, or a link someone edited,
 * would otherwise flash a row before `validateSearch` rejected it.
 */
export function sortingToSearch<T extends PageSort | PageAdminSort>(
  sorting: { id: string; desc: boolean }[],
  isSortable: (id: string) => id is T
): { sort?: T; order?: PageOrder } {
  const first = sorting[0]
  if (!first || !isSortable(first.id)) {
    return { sort: undefined, order: undefined }
  }
  return {
    sort: first.id,
    order: first.desc ? "desc" : "asc",
  }
}

export function canEditField(page: Page, field: string): boolean {
  return page.permissions.editable_fields.includes(field)
}
