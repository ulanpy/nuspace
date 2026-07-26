import type { components } from "@/api/schema"

/** Aliases over the generated schema — see features/courses/types.ts. */
export type Ticket = components["schemas"]["TicketResponseDTO"]
export type TicketCategory = components["schemas"]["TicketCategory"]
export type TicketStatus = components["schemas"]["TicketStatus"]
export type Conversation = components["schemas"]["ConversationResponseDTO"]
export type Message = components["schemas"]["MessageResponseDTO"]
export type SGMember = components["schemas"]["SGMemberResponseDTO"]
export type SGMemberSearchResult =
  components["schemas"]["SGMemberSearchResponseDTO"]
export type Department = components["schemas"]["DepartmentResponseDTO"]
export type SGUser = components["schemas"]["SGUserResponse"]
export type TicketAccessEntry = components["schemas"]["TicketAccessEntryDTO"]
export type PermissionType = components["schemas"]["PermissionType"]

/**
 * The Student Government hierarchy.
 *
 * The wire format is `boss`/`capo`/`soldier` — a mafia metaphor that the
 * backend's `UserRole` enum is built on and that nothing here can change
 * without a migration. Every label a student or an SG member reads comes from
 * SG_ROLE_LABEL below; the raw values should not reach the screen.
 */
export const SG_ROLES = ["boss", "capo", "soldier"] as const

export type SGRole = (typeof SG_ROLES)[number]

export const SG_ROLE_LABEL: Record<SGRole, string> = {
  boss: "Head",
  capo: "Executive",
  soldier: "Member",
}

/** Narrows a `UserRole` from the API to the three that are SG membership. */
export function toSgRole(role: string): SGRole | null {
  return SG_ROLES.find((candidate) => candidate === role) ?? null
}

/**
 * The root Student Government department.
 *
 * Hardcoded, and hardcoded on the backend too —
 * `DelegationPolicy.check_department_deletable` refuses to delete id 9 with
 * "SG root department cannot be deleted". Naming it here at least makes the
 * assumption searchable; it is still an assumption. Worth raising with Улан:
 * the department should carry a flag rather than a magic id, and a fresh
 * database seeded in a different order would put the root somewhere else.
 */
export const SG_ROOT_DEPARTMENT_ID = 9

export const PERMISSION_LABEL: Record<PermissionType, string> = {
  view: "View ticket",
  assign: "Reply in the conversation",
  delegate: "Grant access to others",
}

export const PERMISSION_DESCRIPTION: Record<PermissionType, string> = {
  view: "Can read the ticket and its conversation, and nothing more.",
  assign: "Can open a conversation with the student and reply in it.",
  delegate:
    "Can pass access on. A Head can delegate to anyone; an Executive only to Members of their own department; a Member cannot delegate further.",
}

/** Only these two permissions carry the right to reply. */
export function canReplyWithAccess(access: PermissionType | null): boolean {
  return access === "assign" || access === "delegate"
}

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
