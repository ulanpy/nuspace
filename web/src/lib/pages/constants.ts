import type {
  PageAdminSort,
  PageOwnership,
  PageSort,
  PageVisibilityValue,
} from "./types"

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

/**
 * The role filter above the My Pages table.
 *
 * Two entries, not three: `FilterTabs` supplies its own "All" chip and maps it
 * to `undefined`, which is what the backend's optional `role` param means. An
 * "All roles" entry in here as well would be a second All control.
 */
export const PAGE_OWNERSHIP_FILTERS = [
  { value: "owner", label: "Owned by me" },
  { value: "admin", label: "Where I'm an admin" },
] as const satisfies readonly { value: PageOwnership; label: string }[]

/**
 * The visibility filter above the My Pages table.
 *
 * No "all" entry here either, but for the other reason: `MultiFilter` is
 * multi-select and its own Clear button empties the selection, and an empty
 * `visibility` array is omitted from the request entirely.
 */
export const PAGE_VISIBILITY_FILTERS = PAGE_VISIBILITIES.map((option) => ({
  value: option.value,
  label: option.title,
}))

/**
 * The bare visibility values, for the routes' zod enums.
 *
 * `z.enum` wants values and cannot read a TypeScript type, so the object list
 * above is not usable directly. Derived rather than declared so there is still
 * exactly one place a visibility is written down — this is the runtime twin of
 * `PageVisibilityValue`, not a fourth spelling of it.
 */
export const PAGE_VISIBILITY_VALUES = PAGE_VISIBILITIES.map(
  (option) => option.value
)

/**
 * The columns `/pages/mine` can be ordered by.
 *
 * The same reason `PAGE_VISIBILITY_VALUES` exists: the route's zod enum needs
 * runtime values, and the columns' own `enableSorting` flags need to agree with
 * what the API will accept. `created_at` is sortable by the backend and has no
 * column — the six columns are logo, name, slug, role, visibility and actions —
 * so it is reachable by URL and by nothing else, which is why it is listed here
 * rather than in the table.
 */
export const PAGE_SORTS = [
  "name",
  "visibility",
  "created_at",
] as const satisfies readonly PageSort[]

/** Narrows a react-table column id to a column the API will sort by. */
export const isPageSort = (value: string): value is PageSort =>
  (PAGE_SORTS as readonly string[]).includes(value)

/**
 * The columns a page's admins list can be ordered by.
 *
 * `created_at` again has no column — an admin row is checkbox, avatar, name,
 * role and actions — so it is a URL-only sort here too.
 */
export const PAGE_ADMIN_SORTS = [
  "name",
  "created_at",
] as const satisfies readonly PageAdminSort[]

/** Narrows a react-table column id to a column the admins API will sort by. */
export const isPageAdminSort = (value: string): value is PageAdminSort =>
  (PAGE_ADMIN_SORTS as readonly string[]).includes(value)
