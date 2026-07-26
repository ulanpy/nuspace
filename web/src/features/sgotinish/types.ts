import type { components } from "@/api/schema"

/** Aliases over the generated schema — see features/courses/types.ts. */
export type Ticket = components["schemas"]["TicketResponseDTO"]
export type TicketCategory = components["schemas"]["TicketCategory"]
export type TicketStatus = components["schemas"]["TicketStatus"]
export type Conversation = components["schemas"]["ConversationResponseDTO"]
export type Message = components["schemas"]["MessageResponseDTO"]
export type SGMember = components["schemas"]["SGMemberResponseDTO"]
export type Department = components["schemas"]["DepartmentResponseDTO"]

export const TICKET_CATEGORIES = [
  "academic",
  "administrative",
  "technical",
  "complaint",
  "suggestion",
  "other",
] as const satisfies readonly TicketCategory[]

export const TICKET_STATUSES = [
  "open",
  "in_progress",
  "resolved",
  "closed",
] as const satisfies readonly TicketStatus[]

/** Human labels; the API values are snake_case. */
export const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
}
