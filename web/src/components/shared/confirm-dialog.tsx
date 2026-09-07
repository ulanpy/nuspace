import { useEffect, useRef } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** What is about to happen, and what it costs. Be specific about the target. */
  description: React.ReactNode
  /** Label for the confirming button — a verb, not "OK". */
  confirmLabel?: string
  cancelLabel?: string
  /** Destructive styling and a non-default focus target. Defaults to true. */
  destructive?: boolean
  /** Kept open and busy while this is true, so a slow delete can't be re-fired. */
  isPending?: boolean
  onConfirm: () => void
}

/**
 * The confirmation step for a destructive action.
 *
 * Replaces `window.confirm`, which the old app used for every delete and, in
 * a cabinet-wide removal, stacked three deep. Beyond looking like a browser
 * error, `window.confirm` blocks the event loop, cannot say which record it is
 * about to remove in any readable way, and gives no way to show that the
 * request is in flight — so the second click of an impatient double-click
 * fired a second DELETE.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  isPending = false,
  onConfirm,
}: ConfirmDialogProps) {
  /**
   * Focus lands on Cancel for a destructive action: the dialog exists to
   * interrupt, and opening it with the irreversible button under an already
   * travelling Enter key defeats the point.
   */
  const cancelRef = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    if (open && destructive) cancelRef.current?.focus()
  }, [open, destructive])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Dismissing mid-request would leave the mutation running with nothing
        // on screen to report its outcome.
        if (isPending) return
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            ref={cancelRef}
            variant="outline"
            disabled={isPending}
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
