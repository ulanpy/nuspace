import { z } from "zod"

/**
 * Slug rules, mirroring `backend/modules/shared/slug.py`.
 *
 * The handle is the only unique, user-writable column on `Page`, so the forms
 * validating it identically is not a nicety — it is what keeps the client from
 * accepting a handle the server will reject with a 422. `RESERVED_SLUGS` here
 * must stay the same set as the backend's: `"p"` reserves the `/p/{slug}`
 * prefix, and `"communities"` and `"u"` are gone because neither route exists
 * any more.
 */
export const RESERVED_SLUGS: readonly string[] = [
  "edit",
  "admin",
  "new",
  "create",
  "api",
  "settings",
  "about",
  "terms-of-service",
  "privacy-policy",
  "pages",
  "users",
  "events",
  "courses",
  "announcements",
  "contacts",
  "opportunities",
  "profile",
  "sgotinish",
  "p",
]

/** Lowercase letters, digits and single hyphens — the server's `SLUG_RE`. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

/**
 * The slug half of an entity form's schema.
 *
 * A factory rather than a bare schema because the two forms attach it to
 * different objects; sharing one `z.object` would have meant either spreading a
 * slug object into each form or moving every other field here too.
 */
export function slugSchema() {
  return z
    .string()
    .trim()
    .min(3, "Slug must be 3-50 characters")
    .max(50, "Slug must be 3-50 characters")
    .regex(SLUG_PATTERN, "Use lowercase letters, digits and single hyphens")
    .refine((value) => !RESERVED_SLUGS.includes(value), {
      message: "That slug is reserved",
    })
}
