import type { SGMember, SGRole } from "@/features/sgotinish/types"

/**
 * Who may do what to SG membership.
 *
 * A mirror of `backend/modules/sgotinish/delegation/policy.py`, which is where
 * the rules are actually enforced — nothing here is a security boundary. It
 * exists so the UI does not offer an action the server will refuse, which is
 * the failure this replaces: the old page showed every Remove button to every
 * capo and reported the 403 as a toast afterwards.
 *
 * Because it is only a mirror, the failure mode of a mistake here is a
 * misleading UI rather than a hole. That still matters — silently
 * over-permissive affordances are how people learn to distrust an interface —
 * so each rule below names the server function it copies.
 */

export interface Actor {
  role: SGRole | "admin" | "default"
  sub: string
  /** SG members have one; admins usually do not. */
  departmentId: number | null
}

/** `check_manage_sg_members`: admin, boss and capo. */
export function canManageMembers(actor: Actor): boolean {
  return (
    actor.role === "admin" || actor.role === "boss" || actor.role === "capo"
  )
}

/** `check_view_sg_members`: everyone in SG, plus admins. */
export function canViewMembers(actor: Actor): boolean {
  return canManageMembers(actor) || actor.role === "soldier"
}

/** `check_manage_departments`: admin and boss only — a capo cannot. */
export function canManageDepartments(actor: Actor): boolean {
  return actor.role === "admin" || actor.role === "boss"
}

/** `check_withdraw_from_sg`: any SG member can leave of their own accord. */
export function canWithdrawSelf(actor: Actor): boolean {
  return (
    actor.role === "boss" || actor.role === "capo" || actor.role === "soldier"
  )
}

/** Only a boss can clear the cabinet — it is a loop of removals. */
export function canWithdrawCabinet(actor: Actor): boolean {
  return actor.role === "boss"
}

/**
 * Which roles this actor may hand out.
 *
 * `check_membership_assignment`: admin and boss assign anything; a capo may
 * only make soldiers, and only inside their own department.
 */
export function assignableRoles(actor: Actor): SGRole[] {
  if (actor.role === "admin" || actor.role === "boss") {
    return ["boss", "capo", "soldier"]
  }
  if (actor.role === "capo") return ["soldier"]
  return []
}

/** Departments this actor may assign into. `null` means "any". */
export function assignableDepartmentId(actor: Actor): number | null {
  return actor.role === "capo" ? actor.departmentId : null
}

/**
 * `check_remove_request` and `check_remove_target`.
 *
 * The one rule not reproduced is seniority between bosses: the server refuses
 * a boss removing a boss who was assigned earlier, which needs both users'
 * `sg_assigned_at` and is left to the server to say no to.
 */
export function canRemoveMember(actor: Actor, target: SGMember): boolean {
  if (!canManageMembers(actor)) return false

  // Removing yourself goes through withdraw, and the server says so explicitly.
  if (target.user.sub === actor.sub) return false

  if (actor.role === "capo") {
    if (target.role !== "soldier") return false
    if (actor.departmentId === null) return false
    return target.department?.id === actor.departmentId
  }

  return true
}

/**
 * `check_delegate_ticket_access`, for the person being delegated *to*.
 *
 * The right to delegate at all comes from the ticket's own `ticket_access`
 * being `delegate` (or from being an admin); this is the narrower question of
 * whether a given recipient is allowed.
 */
export function canDelegateTo(
  actor: Actor,
  target: { role: string; departmentId: number | null }
): boolean {
  if (actor.role === "admin" || actor.role === "boss") return true

  if (actor.role === "capo") {
    return (
      target.role === "soldier" && target.departmentId === actor.departmentId
    )
  }

  return false
}
