import { z } from "zod"

/**
 * Slug rules, mirroring `backend/modules/shared/slug.py`.
 *
 * The handle is the only unique, user-writable column on `Page`, so the forms
 * validating it identically is not a nicety — it is what keeps the client from
 * accepting a handle the server will reject with a 422.
 *
 * `RESERVED_SLUGS` is the backend's set, value for value; the backend suite
 * (`backend/tests/test_reserved_slugs.py`) reads this array and fails when the
 * two differ, and fails when a file is added to `web/public/` without a line
 * in both.
 */
export const RESERVED_SLUGS: readonly string[] = [
  "edit",
  "admin",
  "new",
  "create",
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
  // A Page is `pages.nuspace.kz/<slug>`, so a slug may not be a path nginx
  // answers itself on that host (some of these fail the pattern anyway).
  "api",
  "ws",
  "assets",
  "favicon.ico",
  "index.html",
  "404.html",
  "_hosts",
  // Development only: the GCS emulator and Vite's module graph.
  "gcs",
  "src",
  "node_modules",
  // Every top-level entry of `web/public/`, which the build copies to its root.
  "data",
  "favicon.svg",
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
