import type { CommunityCategory, CommunityType } from "./types"

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
 * Fields the create request accepts but the update request does not.
 * Rendered as read-only text in edit mode rather than as disabled inputs,
 * which would suggest a permission that could be granted.
 */
export const COMMUNITY_CREATE_ONLY = ["owner"] as const
