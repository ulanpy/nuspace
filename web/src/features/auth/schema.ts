import { z } from "zod"

import type { components } from "@/api/schema"

/**
 * `/me` is the one endpoint whose payload the generated types cannot describe:
 * the backend declares it as `user: Dict[str, Any]` (CurrentUserResponse in
 * backend/modules/auth/schemas.py), so OpenAPI reports an opaque index
 * signature. Parsing here adds real information rather than restating a
 * contract the compiler already knows — everywhere else, use the generated
 * types instead of writing a schema by hand.
 */

/** Reuses the generated enum so a backend role change surfaces as a type error. */
type UserRole = components["schemas"]["UserRole"]

const USER_ROLES = [
  "default",
  "admin",
  "boss",
  "capo",
  "soldier",
  "community_admin",
] as const satisfies readonly UserRole[]

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
  /** Set for Student Government members; scopes ticket delegation. */
  department_id: z.number().nullable().default(null),
})

export type CurrentUser = z.infer<typeof currentUserSchema>

export const sessionSchema = z.object({
  user: currentUserSchema,
  /** Null until the user links their Telegram account via /connect-tg. */
  tg_id: z.number().nullable().default(null),
})

export type Session = z.infer<typeof sessionSchema>
