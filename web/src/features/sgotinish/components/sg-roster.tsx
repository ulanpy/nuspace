import { useMemo } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  SG_ROLE_LABEL,
  SG_ROOT_DEPARTMENT_ID,
  toSgRole,
  type Department,
  type SGMember,
} from "@/features/sgotinish/types"
import { canRemoveMember, type Actor } from "@/features/sgotinish/permissions"

export interface DepartmentGroup {
  id: number
  name: string
  executives: SGMember[]
  members: SGMember[]
}

const UNASSIGNED_ID = -1

/** "1 Executive", "2 Executives" — every count here is a headcount. */
function plural(count: number, noun: string): string {
  return `${String(count)} ${noun}${count === 1 ? "" : "s"}`
}

function byName(a: SGMember, b: SGMember) {
  return `${a.user.name} ${a.user.surname}`.localeCompare(
    `${b.user.name} ${b.user.surname}`
  )
}

/**
 * Splits the flat member list into the shape the roster is read in.
 *
 * Heads sit above the departments rather than inside one: a Head is elected to
 * SG as a whole, and although the API still gives them a `department`, showing
 * them under it implies they only oversee that department.
 *
 * Special departments come back separately and are rendered even when empty —
 * an empty special department is a fact worth seeing (nobody is staffing it),
 * whereas an empty regular one is usually just noise.
 */
export function groupMembers(
  members: readonly SGMember[],
  departments: readonly Department[]
): {
  heads: SGMember[]
  regular: DepartmentGroup[]
  special: DepartmentGroup[]
} {
  const heads = members.filter((member) => member.role === "boss").sort(byName)

  const nameById = new Map(
    departments.map((department) => [department.id, department.name])
  )
  const specialIds = new Set(
    departments.filter((d) => d.is_special).map((d) => d.id)
  )

  const groups = new Map<number, DepartmentGroup>()
  const ensure = (id: number, name: string) => {
    const existing = groups.get(id)
    if (existing) return existing
    const group: DepartmentGroup = { id, name, executives: [], members: [] }
    groups.set(id, group)
    return group
  }

  for (const member of members) {
    if (member.role === "boss") continue

    const id = member.department?.id ?? UNASSIGNED_ID
    const name =
      member.department?.name ??
      nameById.get(id) ??
      (id === SG_ROOT_DEPARTMENT_ID
        ? "Student Government"
        : id === UNASSIGNED_ID
          ? "No department"
          : "Department")

    const group = ensure(id, name)
    if (member.role === "capo") group.executives.push(member)
    else if (member.role === "soldier") group.members.push(member)
  }

  for (const group of groups.values()) {
    group.executives.sort(byName)
    group.members.sort(byName)
  }

  const special = departments
    .filter((department) => department.is_special)
    .sort((a, b) => b.id - a.id)
    .map(
      (department) =>
        groups.get(department.id) ?? {
          id: department.id,
          name: department.name,
          executives: [],
          members: [],
        }
    )

  const regular = [...groups.values()]
    .filter(
      (group) => group.id !== SG_ROOT_DEPARTMENT_ID && !specialIds.has(group.id)
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  return { heads, regular, special }
}

interface SGRosterProps {
  members: readonly SGMember[]
  departments: readonly Department[]
  actor: Actor
  /** Omitted for a reader who cannot manage anyone. */
  onRemove?: (member: SGMember) => void
  removingSub?: string | null
}

export function SGRoster({
  members,
  departments,
  actor,
  onRemove,
  removingSub,
}: SGRosterProps) {
  const { heads, regular, special } = useMemo(
    () => groupMembers(members, departments),
    [members, departments]
  )

  const row = (member: SGMember) => (
    <MemberRow
      key={member.user.sub}
      member={member}
      onRemove={
        onRemove && canRemoveMember(actor, member)
          ? () => {
              onRemove(member)
            }
          : undefined
      }
      isRemoving={removingSub === member.user.sub}
    />
  )

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-semibold">Heads</h2>
          <span className="text-sm text-muted-foreground">
            {String(heads.length)}
          </span>
        </div>
        {heads.length === 0 ? (
          <Empty>No Heads assigned.</Empty>
        ) : (
          <ul className="space-y-1">{heads.map(row)}</ul>
        )}
      </Card>

      {regular.map((group) => (
        <DepartmentCard key={group.id} group={group} renderRow={row} />
      ))}

      {special.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Special departments
          </h2>
          {special.map((group) => (
            <DepartmentCard
              key={group.id}
              group={group}
              renderRow={row}
              isSpecial
            />
          ))}
        </section>
      )}

      {regular.length === 0 && special.length === 0 && heads.length === 0 && (
        <Empty>Nobody is in Student Government yet.</Empty>
      )}
    </div>
  )
}

function DepartmentCard({
  group,
  renderRow,
  isSpecial = false,
}: {
  group: DepartmentGroup
  renderRow: (member: SGMember) => React.ReactNode
  isSpecial?: boolean
}) {
  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">
          {group.name}
          {isSpecial && (
            <Badge variant="secondary" className="ml-2">
              Special
            </Badge>
          )}
        </h3>
        <span className="text-sm text-muted-foreground">
          {plural(group.executives.length, "Executive")} ·{" "}
          {plural(group.members.length, "Member")}
        </span>
      </div>

      <div className="space-y-1">
        <h4 className="text-xs font-medium text-muted-foreground uppercase">
          Executives
        </h4>
        {group.executives.length === 0 ? (
          <Empty>None.</Empty>
        ) : (
          <ul className="space-y-1">{group.executives.map(renderRow)}</ul>
        )}
      </div>

      <div className="space-y-1">
        <h4 className="text-xs font-medium text-muted-foreground uppercase">
          Members
        </h4>
        {group.members.length === 0 ? (
          <Empty>None.</Empty>
        ) : (
          <ul className="space-y-1">{group.members.map(renderRow)}</ul>
        )}
      </div>
    </Card>
  )
}

function MemberRow({
  member,
  onRemove,
  isRemoving,
}: {
  member: SGMember
  onRemove?: () => void
  isRemoving: boolean
}) {
  const role = toSgRole(member.role)

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {member.user.name} {member.user.surname}
        </p>
        <p className="truncate text-xs text-muted-foreground">{member.email}</p>
      </div>

      <div className="flex items-center gap-2">
        {role && <Badge variant="outline">{SG_ROLE_LABEL[role]}</Badge>}
        {onRemove && (
          <Button
            variant="ghost"
            size="sm"
            disabled={isRemoving}
            onClick={onRemove}
            className="text-destructive hover:text-destructive"
          >
            {isRemoving ? "Removing…" : "Remove"}
          </Button>
        )}
      </div>
    </li>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}
