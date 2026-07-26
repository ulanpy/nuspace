import type { components } from "@/api/schema"

/** Aliases over the generated schema — see features/events/types.ts. */
export type Community = components["schemas"]["CommunityResponse"]
export type CommunityType = components["schemas"]["CommunityType"]
export type CommunityCategory = components["schemas"]["CommunityCategory"]
export type CommunityCreate = components["schemas"]["CommunityCreateRequest"]
export type CommunityUpdate = components["schemas"]["CommunityUpdateRequest"]

export const COMMUNITY_TYPES = [
  "club",
  "university",
  "organization",
] as const satisfies readonly CommunityType[]

export const COMMUNITY_CATEGORIES = [
  "academic",
  "professional",
  "recreational",
  "cultural",
  "sports",
  "social",
  "art",
] as const satisfies readonly CommunityCategory[]

/**
 * Whether the server will accept an edit to this field, for this user.
 *
 * Read `editable_fields` and not a role check — see the equivalent on events.
 *
 * One caveat the server's own list does not capture: it names `type`,
 * `category` and `head` as editable, but `CommunityUpdateRequest` has no such
 * fields, so a PATCH cannot carry them whatever the permissions say. Those
 * three are set at creation and changed nowhere; see COMMUNITY_CREATE_ONLY.
 */
export function canEditField(community: Community, field: string): boolean {
  return community.permissions.editable_fields.includes(field)
}

/**
 * Fields the create request accepts and the update request does not.
 * Rendered as read-only text in edit mode rather than as disabled inputs,
 * which would suggest a permission that could be granted.
 */
export const COMMUNITY_CREATE_ONLY = ["type", "category", "head"] as const
