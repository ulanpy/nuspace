import { useEffect, useState } from "react"
import {
  ChevronDownIcon,
  CopyIcon,
  Loader2,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

import { apiErrorMessage } from "@/api/errors"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  useCreatePlan,
  useDeletePlan,
  useDuplicatePlan,
  useRenamePlan,
} from "@/features/courses/planner/api"
import type { PlannerPlan } from "@/features/courses/planner/types"

/** Matches `PlannerScheduleUpdateRequest`; a longer name is a 422. */
const MAX_PLAN_NAME = 64

interface PlanSwitcherProps {
  plans: readonly PlannerPlan[]
  count: number
  maxAllowed: number
  activeId: number | null
  onSelect: (id: number) => void
}

/**
 * Switching between saved schedule plans, and managing them.
 *
 * A student keeps up to five variants — "the one I want", "the one that fits
 * around work" — and compares them. The plan is identified in the URL rather
 * than in component state, for the same reason the term is: a reload otherwise
 * drops you onto whichever plan happens to be first, and a plan you have
 * arranged is worth linking to.
 *
 * Rename uses a dialog. The old app used `window.prompt`, which cannot show
 * the 64-character limit, cannot be styled, and on mobile Safari renders a
 * dialog most students have been trained to dismiss.
 */
export function PlanSwitcher({
  plans,
  count,
  maxAllowed,
  activeId,
  onSelect,
}: PlanSwitcherProps) {
  const createPlan = useCreatePlan()
  const duplicatePlan = useDuplicatePlan()
  const deletePlan = useDeletePlan()

  const [isRenaming, setIsRenaming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const active = plans.find((plan) => plan.id === activeId)
  const atLimit = count >= maxAllowed
  // The server refuses to delete the last plan; saying so before the click is
  // better than a 409 afterwards.
  const canDelete = plans.length > 1

  const busy =
    createPlan.isPending || duplicatePlan.isPending || deletePlan.isPending

  /** Whichever plan action failed last — only one runs at a time. */
  const error =
    createPlan.error ?? duplicatePlan.error ?? deletePlan.error ?? null

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="max-w-full gap-1.5 font-semibold"
              >
                <span className="truncate">{active?.name ?? "Schedule"}</span>
                <ChevronDownIcon className="opacity-60" aria-hidden />
              </Button>
            }
          />

          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuRadioGroup
              value={activeId === null ? undefined : String(activeId)}
              onValueChange={(value) => {
                if (typeof value === "string") onSelect(Number(value))
              }}
            >
              {/* Inside the radio group, not above it: Base UI's GroupLabel
                  reads its group from context and throws outright when
                  rendered loose in the menu. It labels these options anyway. */}
              <DropdownMenuLabel>
                Plans · {String(count)} of {String(maxAllowed)}
              </DropdownMenuLabel>

              {plans.map((plan) => (
                <DropdownMenuRadioItem key={plan.id} value={String(plan.id)}>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{plan.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {plan.course_count === 1
                        ? "1 course"
                        : `${String(plan.course_count)} courses`}
                    </span>
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              disabled={atLimit || busy}
              onClick={() => {
                createPlan.mutate(undefined, {
                  // Straight into the new plan: creating one and staying on
                  // the old is never what was meant.
                  onSuccess: (plan) => {
                    onSelect(plan.id)
                  },
                })
              }}
            >
              {createPlan.isPending ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <PlusIcon aria-hidden />
              )}
              New plan
            </DropdownMenuItem>

            <DropdownMenuItem
              disabled={activeId === null || atLimit || busy}
              onClick={() => {
                if (activeId === null) return
                duplicatePlan.mutate(
                  { id: activeId },
                  {
                    onSuccess: (plan) => {
                      onSelect(plan.id)
                    },
                  }
                )
              }}
            >
              {duplicatePlan.isPending ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <CopyIcon aria-hidden />
              )}
              Duplicate
            </DropdownMenuItem>

            <DropdownMenuItem
              disabled={activeId === null}
              onClick={() => {
                setIsRenaming(true)
              }}
            >
              <PencilIcon aria-hidden />
              Rename
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              variant="destructive"
              disabled={!canDelete || busy}
              onClick={() => {
                setIsDeleting(true)
              }}
            >
              <Trash2Icon aria-hidden />
              Delete plan
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {atLimit && (
          <span className="text-xs text-muted-foreground">
            {String(maxAllowed)} plans is the limit — delete one to add another.
          </span>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {apiErrorMessage(error, "Could not change your plans. Try again.")}
        </p>
      )}

      {active && (
        <RenameDialog
          open={isRenaming}
          onOpenChange={setIsRenaming}
          plan={active}
        />
      )}

      <ConfirmDialog
        open={isDeleting}
        onOpenChange={(open) => {
          if (!open) {
            setIsDeleting(false)
            deletePlan.reset()
          }
        }}
        title="Delete this plan?"
        description={
          active
            ? `“${active.name}” and the sections chosen in it are removed. Your other plans are untouched.`
            : ""
        }
        confirmLabel="Delete plan"
        isPending={deletePlan.isPending}
        onConfirm={() => {
          if (activeId === null) return
          deletePlan.mutate(activeId, {
            onSuccess: () => {
              setIsDeleting(false)
              // Move to a plan that still exists; the parent falls back to the
              // first one when the id in the URL is gone.
              const next = plans.find((plan) => plan.id !== activeId)
              if (next) onSelect(next.id)
            },
          })
        }}
      />
    </div>
  )
}

function RenameDialog({
  open,
  onOpenChange,
  plan,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: PlannerPlan
}) {
  const renamePlan = useRenamePlan()
  const [name, setName] = useState(plan.name)

  /**
   * Refill the field every time the dialog opens.
   *
   * `useState` takes its initial value once, at mount, and this dialog stays
   * mounted across plan switches — so without this it opened on the name of
   * whichever plan happened to be active when the page loaded. It also drops
   * text that was typed and then cancelled.
   *
   * Resetting inside `onOpenChange` is not enough: the parent opens the dialog
   * by setting its own state, so that handler never runs on the way in.
   */
  useEffect(() => {
    if (open) setName(plan.name)
  }, [open, plan.name])

  const trimmed = name.trim()
  const unchanged = trimmed === plan.name

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (renamePlan.isPending) return
        renamePlan.reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename plan</DialogTitle>
        </DialogHeader>

        <form
          id="rename-plan"
          onSubmit={(event) => {
            event.preventDefault()
            if (trimmed === "" || unchanged) return
            renamePlan.mutate(
              { id: plan.id, name: trimmed },
              {
                onSuccess: () => {
                  onOpenChange(false)
                },
              }
            )
          }}
          className="space-y-1"
        >
          <Label htmlFor="plan-name">Name</Label>
          {/* No autoFocus: the dialog moves focus to its first tabbable
              element on open, which is this field. */}
          <Input
            id="plan-name"
            value={name}
            maxLength={MAX_PLAN_NAME}
            onChange={(event) => {
              setName(event.target.value)
            }}
          />
          <p className="text-xs text-muted-foreground">
            {String(trimmed.length)} / {String(MAX_PLAN_NAME)}
          </p>

          {renamePlan.isError && (
            <p className="text-sm text-destructive" role="alert">
              {apiErrorMessage(renamePlan.error, "Could not rename the plan.")}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={renamePlan.isPending}
            onClick={() => {
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="rename-plan"
            disabled={trimmed === "" || unchanged || renamePlan.isPending}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
