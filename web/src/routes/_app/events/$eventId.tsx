import { useState } from "react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import {
  ArrowLeftIcon,
  CalendarIcon,
  CalendarPlusIcon,
  ClockIcon,
  ExternalLinkIcon,
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
import {
  eventPolicyLabel,
  getEventTiming,
} from "@/features/events/presentation"
import { selectMedia } from "@/features/media/select"
import { useMinuteNow } from "@/hooks/use-minute-now"
import { formatCampusDate, formatCampusTime } from "@/lib/datetime"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Markdown } from "@/components/markdown"
import { ResilientImage } from "@/components/resilient-image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

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
  const now = useMinuteNow()

  const poster = selectMedia(event.media, "carousel")
  const timing = getEventTiming(event.start_datetime, event.end_datetime, now)
  const finished = timing.kind === "finished"

  // Both come from the server, per user and per event; see canEditField.
  const canEdit = event.permissions?.can_edit ?? false
  const canDelete = event.permissions?.can_delete ?? false

  return (
    <article className="mx-auto max-w-6xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        render={
          <Link to="/events" search={{ time: "upcoming" }}>
            <ArrowLeftIcon aria-hidden />
            Back to events
          </Link>
        }
      />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)] lg:gap-12">
        <div className="lg:sticky lg:top-20">
          <div className="aspect-[3/4] overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10">
            <ResilientImage
              src={poster?.url}
              alt={`Poster for ${event.name}`}
              className="object-contain"
              containerClassName="size-full"
              eager
              fallback={
                <span className="grid size-full place-items-center text-center text-muted-foreground">
                  <span className="space-y-3">
                    <CalendarIcon
                      className="mx-auto size-14 opacity-60"
                      aria-hidden
                    />
                    <span className="block">No poster available</span>
                  </span>
                </span>
              }
            />
          </div>
        </div>

        <div className="min-w-0 space-y-6">
          <header className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{event.type}</Badge>
              <Badge variant="outline">{eventPolicyLabel(event.policy)}</Badge>
              {event.tag !== "regular" && <Badge>{event.tag}</Badge>}
              <Badge
                variant={timing.kind === "ongoing" ? "default" : "outline"}
              >
                {timing.kind === "upcoming"
                  ? `${timing.label} ${timing.detail}`
                  : `${timing.label} · ${timing.detail}`}
              </Badge>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl leading-tight font-bold tracking-tight text-balance lg:text-4xl">
                {event.name}
              </h1>
              <p className="text-lg text-muted-foreground">
                by {event.creator.name} {event.creator.surname}
              </p>
            </div>

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
              {event.policy === "registration" &&
                event.registration_link &&
                !finished && (
                  <Button
                    size="sm"
                    render={
                      <a
                        href={event.registration_link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLinkIcon aria-hidden />
                        Register
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

            {deleteEvent.isError && (
              <p className="text-sm text-destructive" role="alert">
                {apiErrorMessage(
                  deleteEvent.error,
                  "Could not delete the event. Try again."
                )}
              </p>
            )}
          </header>

          <Card className="p-5">
            <dl className="grid gap-5 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <CalendarIcon
                  className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div>
                  <dt className="text-sm font-medium">Date</dt>
                  <dd className="text-sm text-muted-foreground">
                    {formatCampusDate(event.start_datetime)}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ClockIcon
                  className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div>
                  <dt className="text-sm font-medium">Time</dt>
                  <dd className="text-sm text-muted-foreground">
                    {formatCampusTime(event.start_datetime)} –{" "}
                    {formatCampusTime(event.end_datetime)}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3 sm:col-span-2">
                <MapPinIcon
                  className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div>
                  <dt className="text-sm font-medium">Location</dt>
                  <dd className="text-sm text-muted-foreground">
                    {event.place}
                  </dd>
                </div>
              </div>
            </dl>
          </Card>

          {event.description && (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">About this event</h2>
              <Markdown className="text-muted-foreground">
                {event.description}
              </Markdown>
            </section>
          )}

          <section className="border-t border-border pt-5">
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Organizer
            </h2>
            <div className="flex items-center gap-3">
              <Avatar size="lg">
                {event.creator.picture && (
                  <AvatarImage
                    src={event.creator.picture}
                    alt={`${event.creator.name} ${event.creator.surname}`}
                  />
                )}
                <AvatarFallback>
                  <UserIcon className="size-4" aria-hidden />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {event.creator.name} {event.creator.surname}
                </p>
                <p className="text-sm text-muted-foreground">Event organizer</p>
              </div>
            </div>
          </section>
        </div>
      </div>

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
