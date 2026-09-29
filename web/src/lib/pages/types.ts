import type { components, operations } from "@/api/schema"

export type Page = components["schemas"]["PageResponse"]
export type PageCreate = components["schemas"]["PageCreateRequest"]
export type PageUpdate = components["schemas"]["PageUpdateRequest"]
export type PageAdmin = components["schemas"]["AdminResponse"]
export type PageAdminPage = components["schemas"]["ListPageAdmins"]
export type AdminLink = components["schemas"]["AdminLinkResponse"]
export type AdminLinkAcceptResult =
  components["schemas"]["AdminLinkAcceptResponse"]

/**
 * Which of the two relationships a page has with the signed-in user.
 *
 * Derives from the backend's `PageRole` — the filter enum added in Phase 1 and
 * the same two values — rather than retyping the pair, so a third relationship
 * added there breaks this at compile time instead of at review.
 */
export type PageOwnership = components["schemas"]["PageRole"]

/**
 * The three visibilities, from the generated schema rather than a hand-written
 * union. `schema.d.ts` is regenerated from the backend's enum, so a fourth
 * visibility added there arrives here as a type error at every place that
 * handles all three.
 */
export type PageVisibilityValue = components["schemas"]["PageVisibility"]

/**
 * The query bag `/pages/mine` accepts, exactly as the generator typed it.
 *
 * The `order` param in particular is an inline `"asc" | "desc"` union in
 * `schema.d.ts` with no name of its own, so a hand-written `PageOrder` here
 * would be a second copy of it — and the copy that silently survives a backend
 * that adds a third direction. Reading it back off the operation keeps the two
 * in step for free.
 */
export type MyPagesQuery = NonNullable<
  NonNullable<operations["get_my_pages_pages_mine_get"]["parameters"]["query"]>
>

export type PageSort = components["schemas"]["PageSort"]
export type PageAdminSort = components["schemas"]["PageAdminSort"]
export type PageOrder = NonNullable<MyPagesQuery["order"]>
