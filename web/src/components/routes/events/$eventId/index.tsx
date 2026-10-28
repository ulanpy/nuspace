import { useState } from "react"
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"

import { apiErrorMessage } from "@/api/errors"
import { api, unwrap } from "@/api/client"
import { qk } from "@/api/query-keys"
import { eventDetailQueryOptions, useDeleteEvent } from "@/lib/events"
import { useMinuteNow } from "@/hooks/use-minute-now"
import { useSession } from "@/hooks/use-session"
import { beginLogin } from "@/lib/user"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EventDialog } from "@/components/routes/events/components/event-dialog"
import { EventFormDialog } from "@/components/routes/events/components/event-form-dialog"
import { useCloseEventDialog } from "@/components/routes/events/components/use-close-event-dialog"

/**
 * The event's own route, shown as a dialog over the board. The board is the
 * parent route's, so this renders nothing but the dialog.
 */
export function EventDetailScreen({ eventId }: { eventId: number }) {
  const { data: event } = useSuspenseQuery(eventDetailQueryOptions(eventId))

  const close = useCloseEventDialog()
  const [isEditing, setIsEditing] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const deleteEvent = useDeleteEvent()
  const queryClient = useQueryClient()
  const session = useSession()
  const now = useMinuteNow()

  const toggleGoing = useMutation({
    mutationFn: () =>
      event.is_going
        ? unwrap(
            api.DELETE("/events/{event_id}/going", {
              params: { path: { event_id: event.id } },
            })
          )
        : unwrap(
            api.PUT("/events/{event_id}/going", {
              params: { path: { event_id: event.id } },
            })
          ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: qk.events.detail(event.id),
      })
      await queryClient.invalidateQueries({ queryKey: qk.events.all() })
    },
  })

  return (
    <EventDialog
      event={event}
      now={now}
      onClose={close}
      isTogglingGoing={toggleGoing.isPending}
      onToggleGoing={() => {
        if (!session) {
          beginLogin()
          return
        }
        toggleGoing.mutate()
      }}
      onEdit={() => {
        setIsEditing(true)
      }}
      onDelete={() => {
        setIsConfirmingDelete(true)
      }}
      deleteError={
        deleteEvent.isError
          ? apiErrorMessage(
              deleteEvent.error,
              "Could not delete the event. Try again."
            )
          : null
      }
    >
      <EventFormDialog
        event={event}
        open={isEditing}
        onOpenChange={setIsEditing}
      />

      <ConfirmDialog
        open={isConfirmingDelete}
        onOpenChange={setIsConfirmingDelete}
        title="Delete this event?"
        description={`“${event.name}” will disappear for everyone, along with its poster. This cannot be undone.`}
        confirmLabel="Delete event"
        isPending={deleteEvent.isPending}
        onConfirm={() => {
          deleteEvent.mutate(event.id, {
            onSuccess: () => {
              setIsConfirmingDelete(false)
              // The event is gone; the route would 404 on its own loader.
              close()
            },
          })
        }}
      />
    </EventDialog>
  )
}
