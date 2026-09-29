import { z } from "zod"

/**
 * Mirrors backend UserRole (modules/auth/models.py). The enum is not exposed
 * in dev's OpenAPI — `/me` is opaque — so it is owned here, not by the schema.
 */
export const USER_ROLES = [
  "default",
  "admin",
  "boss",
  "capo",
  "soldier",
  "community_admin",
] as const

export const userRoleSchema = z.enum(USER_ROLES)

/**
 * Mirrors backend UserCategory: which side of the university a person is on.
 * Not a permission axis — that is `USER_ROLES` above. The directory badges
 * people by this, and the General tab sets it.
 */
export const USER_CATEGORIES = ["student", "faculty", "staff"] as const

export const userCategorySchema = z.enum(USER_CATEGORIES)

/**
 * Backend EntityType and MediaFormat, for the same reason: inside the opaque
 * `/me` dict nothing carries the generated types, so the media array is
 * described here. Both lists are checked against `lib/media/types.ts`.
 */
const ENTITY_TYPES = [
  "community_events",
  "communities",
  "grade_reports",
  "courses",
  "tickets",
  "messages",
  "users",
] as const

const MEDIA_FORMATS = ["banner", "carousel", "profile"] as const

const mediaSchema = z.object({
  id: z.number(),
  url: z.string(),
  mime_type: z.string(),
  entity_type: z.enum(ENTITY_TYPES),
  entity_id: z.number(),
  media_format: z.enum(MEDIA_FORMATS),
  media_order: z.number(),
})

export const currentUserSchema = z.object({
  sub: z.string(),
  email: z.email(),
  given_name: z.string(),
  family_name: z.string(),
  name: z.string(),
  /**
   * Whatever the identity provider supplied. Absent under MOCK_KEYCLOAK and set
   * to "" by the OAuth mapper when the claim is missing, so both a bad URL and
   * no URL collapse to undefined and the UI falls back to initials.
   */
  picture: z.url().optional().catch(undefined),
  role: userRoleSchema.catch("default"),
  /** Community ids this user heads; drives community_admin permissions. */
  communities: z.array(z.number()).default([]),
  /** Academic department id from the backend User model. */
  department_id: z.number().nullable().default(null),
  /**
   * The user's own profile page. Present on `/me` so the General tab and the
   * editor need exactly one read endpoint — there is no other session-scoped
   * profile read in the API.
   *
   * `page_content` is Puck's own data shape, so it is passed through as a JSON
   * record rather than described: the editor validates it, and a second copy of
   * Puck's schema here would only be able to disagree with it.
   */
  /** Surrogate `users.id`, not the Keycloak sub. Media uploads address the
   * user by it, and the session is the only place the client can learn it. */
  id: z.number(),
  slug: z.string(),
  /** Which side of the university: student, faculty or staff. Defaults to
   * `student` because that is the column default, and an older session cookie
   * minted before the column existed must not fail the whole parse. */
  category: userCategorySchema.catch("student"),
  page_content: z.record(z.string(), z.unknown()).default({}),
  is_page_public: z.boolean().default(false),
  media: z.array(mediaSchema).default([]),
})

export const sessionSchema = z.object({
  user: currentUserSchema,
  /** Null until the user links their Telegram account via /connect-tg. */
  tg_id: z.number().nullable().default(null),
})
