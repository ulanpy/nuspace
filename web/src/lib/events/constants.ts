import type { EventTag, EventType, RegistrationPolicy } from "./types"

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
