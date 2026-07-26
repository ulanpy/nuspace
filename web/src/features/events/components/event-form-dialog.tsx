import { apiErrorMessage } from "@/api/errors"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useCreateEvent, useUpdateEvent } from "@/features/events/api"
import { EventForm } from "@/features/events/components/event-form"
import type { Event } from "@/features/events/types"

interface EventFormDialogProps {
  /** Omitted when creating. */
  event?: Event
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the saved event once the request succeeds. */
  onSaved?: (event: Event) => void
}

/**
 * The create/edit dialog, with its mutations.
 *
 * Lives here rather than in each route because both the events list and the
 * event detail page open the same form, and the media sequencing behind it —
 * create, then upload, then poll — is not something a route should be repeating.
 */
export function EventFormDialog({
  event,
  open,
  onOpenChange,
  onSaved,
}: EventFormDialogProps) {
  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent()

  const isPending = createEvent.isPending || updateEvent.isPending
  const error = createEvent.error ?? updateEvent.error

  const close = () => {
    createEvent.reset()
    updateEvent.reset()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Closing mid-upload would orphan the poster: the event exists, the
        // PUT is still in flight, and nothing is left to report the outcome.
        if (!next && !isPending) close()
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{event ? "Edit event" : "Create an event"}</DialogTitle>
        </DialogHeader>

        {open && (
          <EventForm
            key={event?.id ?? "new"}
            event={event}
            isPending={isPending}
            submitError={
              error
                ? apiErrorMessage(error, "Could not save the event. Try again.")
                : null
            }
            onCancel={close}
            onSubmit={({ create, update, files }) => {
              if (event) {
                updateEvent.mutate(
                  { id: event.id, body: update, files },
                  {
                    onSuccess: (saved) => {
                      onSaved?.(saved)
                      close()
                    },
                  }
                )
              } else {
                createEvent.mutate(
                  { body: create, files },
                  {
                    onSuccess: (saved) => {
                      onSaved?.(saved)
                      close()
                    },
                  }
                )
              }
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
