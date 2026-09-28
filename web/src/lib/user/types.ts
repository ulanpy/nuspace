import { z } from "zod"
import type { components } from "@/api/schema"
import type { USER_ROLES, currentUserSchema, sessionSchema } from "./constants"

/**
 * The three session types are inferred from the zod schemas in
 * `constants.ts`. There is no generated OpenAPI type for them: the backend
 * declares `/me` as `user: Dict[str, Any]` so the schema reports an opaque
 * index signature, and parsing the response adds real information instead.
 */
export type UserRole = (typeof USER_ROLES)[number]

export type CurrentUser = z.infer<typeof currentUserSchema>

export type Session = z.infer<typeof sessionSchema>

/** A public profile page, as `GET /u/{slug}` returns it. */
export type UserPage = components["schemas"]["UserPageResponse"]

/** One row of the public directory, `GET /users`. Carries no page content. */
export type UserSummary = components["schemas"]["UserSummaryResponse"]

/** The PATCH body. Every field is optional; omitted fields are left alone. */
export type UserPageUpdate = components["schemas"]["UserPageUpdateRequest"]

/** The deeplink and its confirmation tap, minted by `/connect-tg`. */
export interface TelegramBindChallenge {
  link: string
  emoji: string
}
