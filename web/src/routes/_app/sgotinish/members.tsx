import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { PlusIcon, UserPlusIcon } from "lucide-react"

import { apiErrorMessage } from "@/api/errors"
import { useDebounced } from "@/hooks/use-debounced"
import { useCurrentUser, usePermissions } from "@/features/auth/use-session"
import {
  departmentsQueryOptions,
  sgMembersQueryOptions,
  useCreateDepartment,
  useDeleteDepartment,
  useRemoveSgMember,
  userSearchQueryOptions,
  useUpsertSgMember,
  useWithdrawCabinet,
  useWithdrawFromSg,
  type CabinetWithdrawal,
} from "@/features/sgotinish/api"
import {
  assignableDepartmentId,
  assignableRoles,
  canManageDepartments,
  canManageMembers,
  canViewMembers,
  canWithdrawCabinet,
  canWithdrawSelf,
  type Actor,
} from "@/features/sgotinish/permissions"
import { SGRoster } from "@/features/sgotinish/components/sg-roster"
import {
  SG_ROLE_LABEL,
  SG_ROOT_DEPARTMENT_ID,
  type Department,
  type SGMember,
  type SGRole,
} from "@/features/sgotinish/types"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { EmptyState, QueryBoundary } from "@/components/query-boundary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export const Route = createFileRoute("/_app/sgotinish/members")({
  component: SGMembers,
})

function SGMembers() {
  const user = useCurrentUser()
  const { role } = usePermissions()

  const actor: Actor = {
    // `usePermissions` returns the whole UserRole union; the permission helpers
    // only care about the SG roles plus admin, and treat anything else as none.
    role:
      role === "admin" ||
      role === "boss" ||
      role === "capo" ||
      role === "soldier"
        ? role
        : "default",
    sub: user.sub,
    departmentId: user.department_id,
  }

  const members = useQuery(sgMembersQueryOptions())
  const departments = useQuery({
    ...departmentsQueryOptions(),
    /**
     * Gated on *viewing*, not managing, and the endpoint agrees —
     * `get_departments_authorized` calls `check_view_sg_members`.
     *
     * Gating it on managing looked harmless and was not: `is_special` only
     * exists on the department, so a Member, who cannot manage anyone, got an
     * empty list and saw the special departments folded in among the regular
     * ones with no heading. The grouping silently degraded rather than failing.
     */
    enabled: canViewMembers(actor),
  })

  if (!canViewMembers(actor)) {
    return (
      <EmptyState
        title="Not your roster"
        description="Only Student Government members can see who is in SG."
      />
    )
  }

  return (
    <QueryBoundary query={members}>
      {(memberList) => (
        <Roster
          actor={actor}
          members={memberList}
          departments={departments.data ?? []}
        />
      )}
    </QueryBoundary>
  )
}

function Roster({
  actor,
  members,
  departments,
}: {
  actor: Actor
  members: SGMember[]
  departments: Department[]
}) {
  const removeMember = useRemoveSgMember()
  const withdrawSelf = useWithdrawFromSg()
  const withdrawCabinet = useWithdrawCabinet()

  const [removing, setRemoving] = useState<SGMember | null>(null)
  const [isConfirmingWithdraw, setIsConfirmingWithdraw] = useState(false)
  const [isConfirmingCabinet, setIsConfirmingCabinet] = useState(false)
  const [cabinetResult, setCabinetResult] = useState<CabinetWithdrawal | null>(
    null
  )

  /** Everyone except the Heads — the cabinet is what turns over each term. */
  const cabinet = members.filter((member) => member.role !== "boss")

  return (
    <div className="space-y-6">
      {canManageMembers(actor) && (
        <AddMemberCard actor={actor} departments={departments} />
      )}

      <SGRoster
        members={members}
        departments={departments}
        actor={actor}
        onRemove={
          canManageMembers(actor)
            ? (member) => {
                setRemoving(member)
              }
            : undefined
        }
        removingSub={removeMember.isPending ? removing?.user.sub : null}
      />

      {canManageDepartments(actor) && (
        <DepartmentsCard departments={departments} />
      )}

      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">Leaving</h2>

        <div className="flex flex-wrap gap-2">
          {canWithdrawSelf(actor) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsConfirmingWithdraw(true)
              }}
            >
              Withdraw myself
            </Button>
          )}

          {canWithdrawCabinet(actor) && (
            <Button
              variant="destructive"
              size="sm"
              disabled={cabinet.length === 0}
              onClick={() => {
                setIsConfirmingCabinet(true)
              }}
            >
              Withdraw cabinet
            </Button>
          )}
        </div>

        {canWithdrawCabinet(actor) && (
          <p className="text-xs text-muted-foreground">
            Removes every Executive and Member — {String(cabinet.length)}{" "}
            {cabinet.length === 1 ? "person" : "people"} — and keeps the Heads.
            Used at the end of a term.
          </p>
        )}

        {withdrawSelf.isError && (
          <p className="text-sm text-destructive" role="alert">
            {apiErrorMessage(
              withdrawSelf.error,
              "Could not withdraw you from SG."
            )}
          </p>
        )}

        {/*
          Partial success is the normal outcome, not an edge case: the server
          refuses individual removals (the last boss, a boss senior to the
          actor), so saying only "done" or only "failed" would both be wrong.
        */}
        {cabinetResult && (
          <div className="space-y-1 rounded-lg border border-border p-3 text-sm">
            <p>
              Removed {String(cabinetResult.removed)} of{" "}
              {String(cabinetResult.total)}.
            </p>
            {cabinetResult.failures.length > 0 && (
              <ul className="space-y-0.5 text-destructive">
                {cabinetResult.failures.map((failure) => (
                  <li key={failure.name}>
                    {failure.name}: {failure.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRemoving(null)
            removeMember.reset()
          }
        }}
        title="Remove from Student Government?"
        description={
          removing
            ? `${removing.user.name} ${removing.user.surname} will lose their SG role and any ticket access that came with it.`
            : ""
        }
        confirmLabel="Remove"
        isPending={removeMember.isPending}
        onConfirm={() => {
          if (!removing) return
          removeMember.mutate(removing.user.sub, {
            onSuccess: () => {
              setRemoving(null)
            },
          })
        }}
      />

      <ConfirmDialog
        open={isConfirmingWithdraw}
        onOpenChange={setIsConfirmingWithdraw}
        title="Withdraw yourself from SG?"
        description="You will lose your role, your department and access to every ticket delegated to you. Someone still in SG has to add you back."
        confirmLabel="Withdraw"
        isPending={withdrawSelf.isPending}
        onConfirm={() => {
          withdrawSelf.mutate(undefined, {
            onSuccess: () => {
              setIsConfirmingWithdraw(false)
            },
          })
        }}
      />

      {/*
        One dialog, not the three stacked window.confirm calls the old app used.
        Three prompts in a row are not three decisions — by the second, people
        are clicking through, and the browser dialog could not say how many
        people were about to be removed in any case.
      */}
      <ConfirmDialog
        open={isConfirmingCabinet}
        onOpenChange={setIsConfirmingCabinet}
        title="Withdraw the whole cabinet?"
        description={`${String(cabinet.length)} Executives and Members will be removed from Student Government. Heads are kept. This cannot be undone, and each person has to be added back individually.`}
        confirmLabel={`Remove ${String(cabinet.length)} people`}
        isPending={withdrawCabinet.isPending}
        onConfirm={() => {
          withdrawCabinet.mutate(cabinet, {
            onSuccess: (result) => {
              setCabinetResult(result)
              setIsConfirmingCabinet(false)
            },
          })
        }}
      />
    </div>
  )
}

function AddMemberCard({
  actor,
  departments,
}: {
  actor: Actor
  departments: Department[]
}) {
  const roles = assignableRoles(actor)
  const lockedDepartment = assignableDepartmentId(actor)

  const [search, setSearch] = useState("")
  const [selectedSub, setSelectedSub] = useState<string | null>(null)
  const [role, setRole] = useState<SGRole>(
    roles.includes("soldier") ? "soldier" : roles[0]
  )
  const [departmentId, setDepartmentId] = useState<number | null>(
    lockedDepartment
  )

  const debouncedSearch = useDebounced(search.trim(), 250)
  const results = useQuery(userSearchQueryOptions(debouncedSearch))
  const upsert = useUpsertSgMember()

  const selected = results.data?.find((entry) => entry.user.sub === selectedSub)
  const canSubmit = selectedSub !== null && departmentId !== null

  return (
    <Card className="space-y-4 p-4">
      <div>
        <h2 className="font-semibold">Add someone to SG</h2>
        <p className="text-sm text-muted-foreground">
          {actor.role === "capo"
            ? "As an Executive you can add Members to your own department."
            : "Search for a Nuspace user, then choose their role and department."}
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="sg-user-search">Person</Label>
        <Input
          id="sg-user-search"
          value={search}
          placeholder="Name or email"
          onChange={(event) => {
            setSearch(event.target.value)
            setSelectedSub(null)
          }}
        />

        {debouncedSearch.length > 0 && (
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
            {results.isPending ? (
              <p className="p-2 text-sm text-muted-foreground">Searching…</p>
            ) : (results.data?.length ?? 0) === 0 ? (
              <p className="p-2 text-sm text-muted-foreground">
                Nobody matches that.
              </p>
            ) : (
              results.data?.map((entry) => (
                <button
                  key={entry.user.sub}
                  type="button"
                  aria-pressed={selectedSub === entry.user.sub}
                  onClick={() => {
                    setSelectedSub(entry.user.sub)
                  }}
                  className={
                    selectedSub === entry.user.sub
                      ? "flex w-full items-center justify-between gap-2 rounded-md bg-primary/10 px-2 py-1.5 text-left text-sm"
                      : "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/60"
                  }
                >
                  <span className="min-w-0">
                    <span className="block truncate">
                      {entry.user.name} {entry.user.surname}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {entry.email}
                    </span>
                  </span>
                  {entry.role !== "default" && (
                    <Badge variant="outline">{entry.role}</Badge>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="sg-role">Role</Label>
          {roles.length === 1 ? (
            <p className="text-sm text-muted-foreground">
              {SG_ROLE_LABEL[roles[0]]} — the only role you can assign.
            </p>
          ) : (
            <Select
              value={role}
              onValueChange={(value) => {
                if (value) setRole(value)
              }}
            >
              <SelectTrigger id="sg-role" className="w-full">
                <SelectValue>{SG_ROLE_LABEL[role]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {roles.map((option) => (
                  <SelectItem key={option} value={option}>
                    {SG_ROLE_LABEL[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="sg-department">Department</Label>
          {lockedDepartment !== null ? (
            <p className="text-sm text-muted-foreground">
              {departments.find((d) => d.id === lockedDepartment)?.name ??
                "Your department"}
            </p>
          ) : (
            <Select
              value={departmentId === null ? "" : String(departmentId)}
              onValueChange={(value) => {
                if (value) setDepartmentId(Number(value))
              }}
            >
              <SelectTrigger id="sg-department" className="w-full">
                <SelectValue>
                  {departments.find((d) => d.id === departmentId)?.name ??
                    "Choose one"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={String(department.id)}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          disabled={!canSubmit || upsert.isPending}
          onClick={() => {
            if (departmentId === null || selectedSub === null) return
            upsert.mutate(
              {
                target_user_sub: selectedSub,
                // A capo can only ever create soldiers; sending anything else
                // is a 403 the server would be right to give.
                role: actor.role === "capo" ? "soldier" : role,
                department_id: departmentId,
              },
              {
                onSuccess: () => {
                  setSearch("")
                  setSelectedSub(null)
                },
              }
            )
          }}
        >
          <UserPlusIcon aria-hidden />
          {selected
            ? `Add ${selected.user.name} ${selected.user.surname}`
            : "Add to SG"}
        </Button>

        {upsert.isError && (
          <span className="text-sm text-destructive" role="alert">
            {apiErrorMessage(upsert.error, "Could not update SG membership.")}
          </span>
        )}
      </div>
    </Card>
  )
}

function DepartmentsCard({ departments }: { departments: Department[] }) {
  const [name, setName] = useState("")
  const [isSpecial, setIsSpecial] = useState(false)
  const [deleting, setDeleting] = useState<Department | null>(null)

  const createDepartment = useCreateDepartment()
  const deleteDepartment = useDeleteDepartment()

  return (
    <Card className="space-y-4 p-4">
      <h2 className="font-semibold">Departments</h2>

      <ul className="space-y-1">
        {departments.map((department) => {
          const isRoot = department.id === SG_ROOT_DEPARTMENT_ID

          return (
            <li
              key={department.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
            >
              <span className="flex flex-wrap items-center gap-2 text-sm">
                {department.name}
                {department.is_special && (
                  <Badge variant="secondary">Special</Badge>
                )}
                {isRoot && <Badge variant="outline">Protected</Badge>}
              </span>

              <Button
                variant="ghost"
                size="sm"
                disabled={isRoot}
                // The server refuses this one by id too; disabling it here is
                // the same rule stated where the button is.
                title={
                  isRoot
                    ? "The root Student Government department cannot be deleted."
                    : undefined
                }
                onClick={() => {
                  setDeleting(department)
                }}
                className="text-destructive hover:text-destructive"
              >
                Delete
              </Button>
            </li>
          )
        })}
      </ul>

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const trimmed = name.trim()
          if (trimmed === "") return
          createDepartment.mutate(
            { name: trimmed, is_special: isSpecial },
            {
              onSuccess: () => {
                setName("")
                setIsSpecial(false)
              },
            }
          )
        }}
      >
        <div className="min-w-40 flex-1 space-y-1">
          <Label htmlFor="new-department">New department</Label>
          <Input
            id="new-department"
            value={name}
            placeholder="Ministry of Sport"
            onChange={(event) => {
              setName(event.target.value)
            }}
          />
        </div>

        <label className="flex h-8 items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={isSpecial}
            onChange={(event) => {
              setIsSpecial(event.target.checked)
            }}
          />
          Special
        </label>

        <Button
          type="submit"
          size="sm"
          disabled={name.trim() === "" || createDepartment.isPending}
        >
          <PlusIcon aria-hidden />
          Add
        </Button>
      </form>

      {createDepartment.isError && (
        <p className="text-sm text-destructive" role="alert">
          {apiErrorMessage(
            createDepartment.error,
            "Could not create the department."
          )}
        </p>
      )}

      {deleteDepartment.isError && (
        <p className="text-sm text-destructive" role="alert">
          {apiErrorMessage(
            deleteDepartment.error,
            "Could not delete the department."
          )}
        </p>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null)
            deleteDepartment.reset()
          }
        }}
        title="Delete this department?"
        description={
          deleting
            ? `Everyone in “${deleting.name}” is removed from Student Government along with it.`
            : ""
        }
        confirmLabel="Delete"
        isPending={deleteDepartment.isPending}
        onConfirm={() => {
          if (!deleting) return
          deleteDepartment.mutate(deleting.id, {
            onSuccess: () => {
              setDeleting(null)
            },
          })
        }}
      />
    </Card>
  )
}
