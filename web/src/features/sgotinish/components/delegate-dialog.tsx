import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { apiErrorMessage } from "@/api/errors"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  departmentsQueryOptions,
  sgUsersQueryOptions,
  useDelegateTicketAccess,
} from "@/features/sgotinish/api"
import { canDelegateTo, type Actor } from "@/features/sgotinish/permissions"
import {
  PERMISSION_DESCRIPTION,
  PERMISSION_LABEL,
  SG_ROLE_LABEL,
  toSgRole,
  type PermissionType,
} from "@/features/sgotinish/types"

const PERMISSIONS: PermissionType[] = ["view", "assign", "delegate"]

interface DelegateDialogProps {
  ticketId: number
  actor: Actor
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Grant another SG member access to one ticket.
 *
 * Cascading by design — department, then person, then permission — because the
 * user endpoint is scoped to a department and cannot be asked for everyone at
 * once. Choosing a different department clears the person, since the previous
 * choice is no longer in the list being shown.
 *
 * Recipients the actor is not allowed to delegate to are listed but disabled,
 * with the reason on the row. Hiding them would leave an Executive wondering
 * why a colleague they can see in the roster is missing here.
 */
export function DelegateDialog({
  ticketId,
  actor,
  open,
  onOpenChange,
}: DelegateDialogProps) {
  const [departmentId, setDepartmentId] = useState<number | null>(null)
  const [targetSub, setTargetSub] = useState<string | null>(null)
  const [permission, setPermission] = useState<PermissionType>("assign")

  const departments = useQuery(departmentsQueryOptions())
  const users = useQuery(sgUsersQueryOptions(departmentId))
  const delegate = useDelegateTicketAccess(ticketId)

  const candidates = users.data ?? []
  const selected = candidates.find((entry) => entry.user.sub === targetSub)

  const close = () => {
    delegate.reset()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !delegate.isPending) close()
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Grant access to this ticket</DialogTitle>
          <DialogDescription>
            The person you choose can see this ticket, and depending on the
            permission, reply to the student or pass access on further.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="delegate-department">Department</Label>
            <Select
              value={departmentId === null ? "" : String(departmentId)}
              onValueChange={(value) => {
                if (!value) return
                setDepartmentId(Number(value))
                setTargetSub(null)
              }}
            >
              <SelectTrigger id="delegate-department" className="w-full">
                <SelectValue>
                  {departments.data?.find((d) => d.id === departmentId)?.name ??
                    "Choose a department"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(departments.data ?? []).map((department) => (
                  <SelectItem key={department.id} value={String(department.id)}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {departmentId !== null && (
            <div className="space-y-1">
              <Label htmlFor="delegate-user">Person</Label>
              <Select
                value={targetSub ?? ""}
                onValueChange={(value) => {
                  if (value) setTargetSub(value)
                }}
                disabled={users.isPending}
              >
                <SelectTrigger id="delegate-user" className="w-full">
                  <SelectValue>
                    {selected
                      ? `${selected.user.name} ${selected.user.surname}`
                      : users.isPending
                        ? "Loading…"
                        : "Choose a person"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((entry) => {
                    const role = toSgRole(entry.role)
                    const allowed = canDelegateTo(actor, {
                      role: entry.role,
                      departmentId,
                    })

                    return (
                      <SelectItem
                        key={entry.user.sub}
                        value={entry.user.sub}
                        disabled={!allowed}
                      >
                        {entry.user.name} {entry.user.surname}
                        {role && ` (${SG_ROLE_LABEL[role]})`}
                        {!allowed && " — outside what you can delegate"}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {candidates.length === 0 && !users.isPending && (
                <p className="text-xs text-muted-foreground">
                  Nobody is in that department yet.
                </p>
              )}
            </div>
          )}

          {targetSub && (
            <div className="space-y-1">
              <Label htmlFor="delegate-permission">Permission</Label>
              <Select
                value={permission}
                onValueChange={(value) => {
                  if (value) setPermission(value)
                }}
              >
                <SelectTrigger id="delegate-permission" className="w-full">
                  <SelectValue>{PERMISSION_LABEL[permission]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PERMISSIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {PERMISSION_LABEL[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {PERMISSION_DESCRIPTION[permission]}
              </p>
            </div>
          )}

          {delegate.isError && (
            <p className="text-sm text-destructive" role="alert">
              {apiErrorMessage(delegate.error, "Could not grant that access.")}
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            onClick={close}
            disabled={delegate.isPending}
          >
            Cancel
          </Button>
          <Button
            disabled={targetSub === null || delegate.isPending}
            onClick={() => {
              if (!targetSub) return
              delegate.mutate(
                { target_user_sub: targetSub, permission },
                { onSuccess: close }
              )
            }}
          >
            Grant access
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
