import type { components } from "@/api/schema"

/**
 * Aliases over the generated schema. These are re-exports, not redefinitions —
 * a backend change flows straight through and breaks the build at the use site.
 */
export type Event = components["schemas"]["EventResponse"]
export type EventType = components["schemas"]["EventType"]
export type EventStatus = components["schemas"]["EventStatus"]
export type EventTag = components["schemas"]["EventTag"]
export type RegistrationPolicy = components["schemas"]["RegistrationPolicy"]
export type Media = components["schemas"]["MediaResponse"]
