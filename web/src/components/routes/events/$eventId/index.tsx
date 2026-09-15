import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import {
  ArrowLeftIcon,
  CalendarIcon,
  CalendarPlusIcon,
  ClockIcon,
  ExternalLinkIcon,
  MapPinIcon,
  PencilIcon,
  Trash2Icon,
  Share2Icon,
  CheckIcon,
} from "lucide-react"
import { toast } from "sonner"

import { apiErrorMessage } from "@/api/errors"
import { api, unwrap } from "@/api/client"
import { qk } from "@/api/query-keys"
import {
  eventDetailQueryOptions,
  eventGoogleCalendarUrl,
  eventPolicyLabel,
  formatEventDateRange,
  getEventTiming,
  useDeleteEvent,
} from "@/lib/events"
import { useMinuteNow } from "@/hooks/use-minute-now"
import { useSession } from "@/hooks/use-session"
import { beginLogin } from "@/lib/user"
import { cn, formatCampusDate, formatCampusTime } from "@/lib/utils"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Markdown } from "@/components/shared/markdown/renderer"
import { EventFormDialog } from "@/components/routes/events/components/event-form-dialog"
import { EventMediaCarousel } from "@/components/routes/events/components/event-media-carousel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export function Page({ eventId }: { eventId: number }) {
  const { data: event } = useSuspenseQuery(eventDetailQueryOptions(eventId))

  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const deleteEvent = useDeleteEvent()
  const queryClient = useQueryClient()
  const session = useSession()
  const now = useMinuteNow()

  const posters = (event.media ?? [])
    .filter((media) => media.media_format === "carousel")
    .map((media) => media.url)
  const timing = getEventTiming(event.start_datetime, event.end_datetime, now, event.type)
  const finished = timing.kind === "finished"
  const isRecruitment = event.type === "recruitment"
  const dateRange = isRecruitment
    ? null
    : formatEventDateRange(event.start_datetime, event.end_datetime)

  // Both come from the server, per user and per event; see canEditField.
  const canEdit = event.permissions?.can_edit ?? false
  const canDelete = event.permissions?.can_delete ?? false
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
    <article className="mx-auto max-w-[90rem] space-y-6">
      <Button
        nativeButton={false}
        variant="ghost"
        size="sm"
        render={
          <Link to="/events" search={{ time: "upcoming" }}>
            <ArrowLeftIcon aria-hidden />
            Back to events
          </Link>
        }
      />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] lg:gap-12">
        <div className="lg:sticky lg:top-20">
          {posters.length > 0 ? (
            <EventMediaCarousel images={posters} alt={`${event.name} poster`} />
          ) : (
            <div className="aspect-3/4 overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10">
              <span className="grid size-full place-items-center text-center text-muted-foreground">
                <span className="space-y-3">
                  <CalendarIcon className="mx-auto size-14 opacity-60" aria-hidden />
                  <span className="block">No poster available</span>
                </span>
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-6">
          <header className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{event.type}</Badge>
                <Badge variant="outline">{eventPolicyLabel(event.policy)}</Badge>
                {event.tag !== "regular" && <Badge>{event.tag}</Badge>}
                <Badge variant={timing.kind === "ongoing" ? "default" : "outline"}>
                  {timing.kind === "upcoming" ? `${timing.label} ${timing.detail}` : `${timing.label} · ${timing.detail}`}
                </Badge>
              <Button className="ml-auto shrink-0" variant="outline" size="icon" onClick={() => {
                const share = async () => {
                  if (navigator.share) await navigator.share({ title: event.name, text: `Check out this event: ${event.name}`, url: window.location.href })
                  else {
                    await navigator.clipboard.writeText(window.location.href)
                    toast.success("Event link copied")
                  }
                }
                void share().catch(() => toast.error("Could not share this event"))
              }} aria-label="Share event" title="Share event">
                <Share2Icon aria-hidden />
              </Button>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl/tight font-bold tracking-tight text-balance lg:text-4xl">
                {event.name}
              </h1>
            </div>

            {event.policy === "open" && !finished && event.type !== "recruitment" && (
              <section className="space-y-2">
                <div className="space-y-1">
                  <p className="font-medium">
                    {event.is_going ? "You’re going" : "Planning to attend?"}
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Marking that you’re going helps organizers plan seats and materials.
                  </p>
                </div>
                <Button
                  size="lg"
                  className={
                    event.is_going
                      ? "group h-12 px-6 transition-colors hover:border-destructive hover:bg-destructive hover:text-destructive-foreground"
                      : "h-12 px-6"
                  }
                  disabled={toggleGoing.isPending}
                  onClick={() => {
                    if (!session) {
                      beginLogin()
                      return
                    }
                    toggleGoing.mutate()
                  }}
                >
                  {event.is_going && <CheckIcon className="group-hover:hidden" aria-hidden />}
                  <span className={event.is_going ? "group-hover:hidden" : undefined}>{event.is_going ? "Going" : "I’m going"}</span>
                  {event.is_going && <span className="hidden group-hover:inline">Not going</span>}
                </Button>
              </section>
            )}

            {event.policy === "registration" && event.registration_link && !finished && (
              <Card className="space-y-3 border-border/60 bg-muted/25 p-4">
                <div className="space-y-1">
                  <p className="font-medium">External registration required</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Registration is handled externally by the organizer.
                  </p>
                </div>
                <Button
                  nativeButton={false}
                  size="lg"
                  className="h-12 px-6"
                  render={
                    <a href={event.registration_link} target="_blank" rel="noopener noreferrer">
                      <ExternalLinkIcon aria-hidden />
                      Register
                    </a>
                  }
                />
              </Card>
            )}

            <div className="flex flex-wrap gap-2.5">
              {!finished && event.type !== "recruitment" && (
                <Button
                  nativeButton={false}
                  variant="outline"
                  className="h-10 px-4"
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
              {canEdit && (
                <Button
                  variant="outline"
                  className="h-10 px-4"
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
                  className="ml-2 h-10 px-4 text-destructive hover:text-destructive"
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

          <dl
            className={cn(
              "grid divide-y divide-border rounded-xl border border-border sm:divide-x sm:divide-y-0",
              isRecruitment
                ? "sm:grid-cols-[3fr_2fr_5fr]"
                : "sm:grid-cols-[3fr_2fr_4fr]"
            )}
          >
            {isRecruitment ? (
              <>
                <div className="flex items-start gap-3 p-4">
                  <CalendarIcon
                    className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <div>
                    <dt className="text-sm font-medium">Deadline</dt>
                    <dd className="text-sm text-muted-foreground">
                      {formatCampusDate(event.end_datetime)}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4">
                  <ClockIcon
                    className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <div>
                    <dt className="text-sm font-medium">Time</dt>
                    <dd className="text-sm text-muted-foreground">
                      {formatCampusTime(event.end_datetime)}
                    </dd>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-start gap-3 p-4">
                <CalendarIcon
                  className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div>
                  <dt className="text-sm font-medium">Date</dt>
                  <dd className="text-sm text-muted-foreground">
                    {dateRange}
                  </dd>
                </div>
              </div>
            )}
            {!isRecruitment && (
              <div className="flex items-start gap-3 p-4">
                <ClockIcon
                  className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div>
                  <dt className="text-sm font-medium">Time</dt>
                  <dd className="text-sm text-muted-foreground">
                    {formatCampusTime(event.start_datetime)}
                  </dd>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3 p-4">
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

          {event.description && (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">About this event</h2>
              <Markdown className="text-muted-foreground">
                {event.description}
              </Markdown>
            </section>
          )}

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
