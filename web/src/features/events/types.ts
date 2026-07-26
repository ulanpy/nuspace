import type { components } from "@/api/schema"

/**
 * Aliases over the generated schema. These are re-exports, not redefinitions —
 * a backend change flows straight through and breaks the build at the use site.
 */
export type Event = components["schemas"]["EventResponse"]
export type EventCreate = components["schemas"]["EventCreateRequest"]
export type EventUpdate = components["schemas"]["EventUpdateRequest"]
export type EventType = components["schemas"]["EventType"]
export type EventStatus = components["schemas"]["EventStatus"]
export type EventTag = components["schemas"]["EventTag"]
export type RegistrationPolicy = components["schemas"]["RegistrationPolicy"]
export type Media = components["schemas"]["MediaResponse"]

export const EVENT_TYPES = [
  "academic",
  "professional",
  "recreational",
  "cultural",
  "sports",
  "social",
  "art",
  "recruitment",
] as const satisfies readonly EventType[]

export const EVENT_TAGS = [
  "featured",
  "promotional",
  "regular",
  "charity",
] as const satisfies readonly EventTag[]

export const REGISTRATION_POLICIES = [
  "open",
  "registration",
] as const satisfies readonly RegistrationPolicy[]

/**
 * Which fields the server will accept an edit to, for this user, on this event.
 *
 * The list is built per-request in `backend/modules/campuscurrent/events/policy.py`
 * and differs between an admin and the event's own creator — `tag` is admin-only,
 * and the difference is invisible from the response alone. Editing is gated on
 * this rather than on a role check, so a policy change on the server takes
 * effect here without a frontend release.
 *
 * Absent permissions means no permissions: an event fetched by a signed-out
 * visitor carries none, and treating that as "everything is editable" would put
 * a form on screen that every request from then on refuses.
 */
export function canEditField(event: Event, field: string): boolean {
  return event.permissions?.editable_fields.includes(field) ?? false
}
