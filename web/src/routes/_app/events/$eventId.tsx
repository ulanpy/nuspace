import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import {
  CalendarIcon,
  CalendarPlusIcon,
  MapPinIcon,
  PencilIcon,
  Trash2Icon,
  UserIcon,
  Share2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { apiErrorMessage } from "@/api/errors"
import { eventDetailQueryOptions, useDeleteEvent } from "@/features/events/api"
import { eventGoogleCalendarUrl } from "@/features/events/calendar"
import { EventFormDialog } from "@/features/events/components/event-form-dialog"
import { selectMedia } from "@/features/media/select"
import { formatCampusDateTime, formatRelative, isPast } from "@/lib/datetime"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Markdown } from "@/components/markdown"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/_app/events/$eventId")({
  // Fetched during navigation rather than after render, so the page does not
  // flash a skeleton on an already-cached event.
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      eventDetailQueryOptions(Number(params.eventId))
    ),
  component: EventDetail,
})

function EventDetail() {
  const { eventId } = Route.useParams()
  const { data: event } = useSuspenseQuery(
    eventDetailQueryOptions(Number(eventId))
  )

  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const deleteEvent = useDeleteEvent()

  const poster = selectMedia(event.media, "carousel")
  const started = isPast(event.start_datetime)
  const finished = isPast(event.end_datetime)

  // Both come from the server, per user and per event; see canEditField.
  const canEdit = event.permissions?.can_edit ?? false
  const canDelete = event.permissions?.can_delete ?? false

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      {poster && (
        // object-contain, not cover: the poster is usually the flyer, and
        // cropping it can cut off details that appear nowhere else on the page.
        <img
          src={poster.url}
          alt={`Poster for ${event.name}`}
          className="aspect-[3/4] w-full max-w-xs rounded-lg bg-muted object-contain"
        />
      )}

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{event.type}</Badge>
          {event.tag !== "regular" && <Badge>{event.tag}</Badge>}
          {finished ? (
            <Badge variant="outline">Finished</Badge>
          ) : (
            <Badge variant="outline">
              {started ? "Happening now" : formatRelative(event.start_datetime)}
            </Badge>
          )}
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-balance">
          {event.name}
        </h1>

        {(canEdit || canDelete) && (
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditing(true)
                }}
              >
                <PencilIcon aria-hidden />
                Edit
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  setIsConfirmingDelete(true)
                }}
              >
                <Trash2Icon aria-hidden />
                Delete
              </Button>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {!finished && event.type !== "recruitment" && (
            <Button
              variant="outline"
              size="sm"
              render={
                <a
                  href={eventGoogleCalendarUrl(event)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <CalendarPlusIcon aria-hidden />
                  Add to calendar
                </a>
              }
            />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const share = async () => {
                if (navigator.share) {
                  await navigator.share({
                    title: event.name,
                    text: `Check out this event: ${event.name}`,
                    url: window.location.href,
                  })
                } else {
                  await navigator.clipboard.writeText(window.location.href)
                  toast.success("Event link copied")
                }
              }
              void share().catch(() => {
                toast.error("Could not share this event")
              })
            }}
          >
            <Share2Icon aria-hidden />
            Share
          </Button>
        </div>

        {deleteEvent.isError && (
          <p className="text-sm text-destructive" role="alert">
            {apiErrorMessage(
              deleteEvent.error,
              "Could not delete the event. Try again."
            )}
          </p>
        )}
      </header>

      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-3">
          <CalendarIcon
            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <div>
            <dt className="text-sm font-medium">When</dt>
            <dd className="text-sm text-muted-foreground">
              {formatCampusDateTime(event.start_datetime)} –{" "}
              {formatCampusDateTime(event.end_datetime, {
                timeStyle: "short",
              })}
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <MapPinIcon
            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <div>
            <dt className="text-sm font-medium">Where</dt>
            <dd className="text-sm text-muted-foreground">{event.place}</dd>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <UserIcon
            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <div>
            <dt className="text-sm font-medium">Organizer</dt>
            <dd className="text-sm text-muted-foreground">
              {event.creator.name} {event.creator.surname}
            </dd>
          </div>
        </div>
      </dl>

      {event.description && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">About</h2>
          <Markdown className="text-muted-foreground">
            {event.description}
          </Markdown>
        </div>
      )}

      {event.policy === "registration" &&
        event.registration_link &&
        !finished && (
          <Button
            render={
              <a
                href={event.registration_link}
                target="_blank"
                rel="noopener noreferrer"
              >
                Register
              </a>
            }
          />
        )}

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
              // This page is about to 404 on its own loader.
              void navigate({ to: "/events", search: { time: "upcoming" } })
            },
          })
        }}
      />
    </article>
  )
}
