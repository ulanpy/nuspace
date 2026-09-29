import type { PageOwnership, PageVisibilityValue } from "./types"

/**
 * How many pages one account may own. Mirrors
 * `backend/modules/pages/constants.py`, which returns 409 at the cap.
 *
 * Client-side only so the form can explain itself before the round-trip; the
 * server's count is the one that decides.
 */
export const MAX_PAGES_PER_OWNER = 100

/**
 * Rows per page on the three paginated lists. The footer offers all of them and
 * the default is the first.
 *
 * A `const` tuple rather than `number[]` so `DEFAULT_PAGE_SIZE` keeps its
 * literal type — a widened `number` would fall out of the "one of the offered
 * values" type the zod enum in each route's `validateSearch` checks against.
 */
export const PAGE_SIZES = [10, 20, 30, 40, 50] as const
export const DEFAULT_PAGE_SIZE = PAGE_SIZES[0]

/** The relationship between a page and the signed-in user, in words. */
export const PAGE_OWNERSHIP: Record<PageOwnership, string> = {
  owner: "Owner",
  admin: "Admin",
}

/**
 * The role filter above the My Pages table.
 *
 * `null` is the "All roles" entry, and it is a real value rather than an
 * absent one: the filter has to be able to say "do not filter", which the
 * backend models as an omitted `role` query param.
 */
export const PAGE_OWNERSHIP_FILTERS: readonly {
  value: PageOwnership | null
  label: string
}[] = [
  { value: null, label: "All roles" },
  { value: "owner", label: "Owned by me" },
  { value: "admin", label: "Where I'm an admin" },
]

/** The visibility filter above the My Pages table, plus its "no filter" entry. */
export const PAGE_VISIBILITY_FILTERS: readonly {
  value: PageVisibilityValue | null
  label: string
}[] = [
  { value: null, label: "All visibilities" },
  { value: "public", label: "Public" },
  { value: "internal", label: "NU only" },
  { value: "private", label: "Private" },
]

/**
 * The three visibilities, in one list.
 *
 * The last of the places visibility values appear — the generated
 * `PageVisibility` type and the backend enum came first, `visibilities.ts` next.
 * The *type* still derives from the generated schema, per `CONVENTIONS.md`; this
 * is only the runtime list a zod enum needs, because `z.enum` wants values and
 * cannot read a TypeScript type.
 *
 * `satisfies` checks the tuple against the derived type, so adding a visibility
 * to the backend is a compile error here until this list grows to match, and
 * dropping one is a compile error too rather than a `Select` quietly offering a
 * value the server rejects.
 */
export const PAGE_VISIBILITIES = [
  {
    value: "public",
    title: "Public",
    description: "Anyone, signed in or not, can read this page.",
  },
  {
    value: "internal",
    title: "NU only",
    description:
      "Signed-in students and staff can read it. Outsiders see a 404.",
  },
  {
    value: "private",
    title: "Private",
    description: "Only you and the page's admins can read it.",
  },
] as const satisfies readonly {
  value: PageVisibilityValue
  title: string
  description: string
}[]
