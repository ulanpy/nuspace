import { z } from "zod"

/**
 * `/me` is the one endpoint whose payload the generated types cannot describe:
 * the backend declares it as `user: Dict[str, Any]` (CurrentUserResponse in
 * backend/modules/auth/schemas.py), so OpenAPI reports an opaque index
 * signature. Parsing here adds real information rather than restating a
 * contract the compiler already knows — everywhere else, use the generated
 * types instead of writing a schema by hand.
 */

/** Mirrors backend UserRole (modules/auth/models.py). The enum is not exposed
 * in dev's OpenAPI — `/me` is opaque — so it is owned here, not by the schema. */
const USER_ROLES = [
  "default",
  "admin",
  "boss",
  "capo",
  "soldier",
  "community_admin",
] as const

export type UserRole = (typeof USER_ROLES)[number]

export const userRoleSchema = z.enum(USER_ROLES)

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
})

export type CurrentUser = z.infer<typeof currentUserSchema>

export const sessionSchema = z.object({
  user: currentUserSchema,
  /** Null until the user links their Telegram account via /connect-tg. */
  tg_id: z.number().nullable().default(null),
})

export type Session = z.infer<typeof sessionSchema>
