import {
  queryOptions,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"
import { api, unwrap } from "@/api/client"
import { qk } from "@/api/query-keys"
import { hasMediaFormat, pollForMedia } from "@/lib/media"
import { useMediaUpload } from "@/hooks/use-media-upload"
import { assertValidImageBatch, type MediaFormat } from "@/lib/media"
import { saveWithMedia } from "@/lib/media"
import type {
  Event,
  EventCreate,
  EventStatus,
  EventType,
  EventUpdate,
  RegistrationPolicy,
} from "@/lib/events/types"

export type TimeFilter = "upcoming" | "today" | "week" | "month"

export interface EventFilters {
  time_filter?: TimeFilter
  event_type?: EventType
  registration_policy?: RegistrationPolicy
  event_status?: EventStatus
  keyword?: string
}

/**
 * One page of the events list. Used by useInfiniteList.
 *
 * `event_status` must be sent: the backend rejects an unfiltered list for
 * non-privileged users with 403 "You can only view approved or cancelled
 * events", so omitting it breaks the page for every student.
 */
export function fetchEventsPage(
  filters: EventFilters,
  { page, size }: { page: number; size: number }
) {
  return unwrap(
    api.GET("/events", {
      params: {
        query: { page, size, event_status: "approved", ...filters },
      },
    })
  )
}

function fetchEvent(eventId: number) {
  return unwrap(
    api.GET("/events/{event_id}", { params: { path: { event_id: eventId } } })
  )
}

/**
 * A handful of recruitment events for the home page's "Now Recruiting" section.
 *
 * dev's announcements bundle returns only `events`, not a separate recruiting
 * list (the rewrite branch added `recruitment_events`; dev did not), so the
 * home page pulls these through the normal events list with a recruitment type
 * filter instead.
 */
export function recruitmentEventsQueryOptions(count = 6) {
  return queryOptions({
    queryKey: qk.events.list({ type: "recruitment", page: 1, size: count }),
    queryFn: () =>
      fetchEventsPage(
        { time_filter: "upcoming", event_type: "recruitment" },
        { page: 1, size: count }
      ),
    staleTime: 60_000,
  })
}

export function eventDetailQueryOptions(eventId: number) {
  return queryOptions({
    queryKey: qk.events.detail(eventId),
    queryFn: () => fetchEvent(eventId),
  })
}

/** An event's poster: one image, `carousel` format. */
const EVENT_MEDIA_FORMAT: MediaFormat = "carousel"

/**
 * Waits for a freshly uploaded poster to become visible, then refreshes.
 *
 * Deliberately not awaited by the mutation. In production the `Media` row is
 * written by the Pub/Sub hook after the upload returns (see
 * `lib/media/functions.ts`), which can take seconds — holding the dialog open and
 * the button spinning for that long, on an event that has already been created,
 * would read as a hang. The form closes; the poster appears when it appears.
 */
function refreshWhenMediaLands(queryClient: QueryClient, eventId: number) {
  void pollForMedia({
    fetch: () => fetchEvent(eventId),
    isReady: (event) => hasMediaFormat(event.media, EVENT_MEDIA_FORMAT),
  }).then(async (event) => {
    if (event)
      await queryClient.invalidateQueries({ queryKey: qk.events.all() })
  })
}

function toUploadItems(files: readonly File[]) {
  return files.map((file, index) => ({
    file,
    mediaFormat: EVENT_MEDIA_FORMAT,
    mediaOrder: index,
  }))
}

/**
 * Creation is open to any signed-in user — there is no role check here because
 * there is none on the server either (`EventPolicy.check_create` only refuses
 * creating an event on someone else's behalf).
 */
export function useCreateEvent() {
  const queryClient = useQueryClient()
  const { uploadMedia } = useMediaUpload()

  return useMutation({
    mutationFn: async ({
      body,
      files,
    }: {
      body: EventCreate
      files: File[]
    }) => {
      return saveWithMedia({
        validate: () => {
          assertValidImageBatch(files)
        },
        saveEntity: () => unwrap(api.POST("/events", { body })),
        uploadMedia:
          files.length > 0
            ? async (event) => {
                const uploaded = await uploadMedia({
                  entityType: "community_events",
                  entityId: event.id,
                  items: toUploadItems(files),
                })
                return uploaded.length
              }
            : undefined,
      })
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: qk.events.all() })
      if (result.successfulUploadCount > 0) {
        refreshWhenMediaLands(queryClient, result.entity.id)
      }
    },
  })
}

export function useUpdateEvent() {
  const queryClient = useQueryClient()
  const { uploadMedia } = useMediaUpload()

  return useMutation({
    mutationFn: async ({
      id,
      body,
      files,
    }: {
      id: number
      /** Removals ride along as `media_ids_to_delete`, not a separate call. */
      body: EventUpdate
      files: File[]
    }) => {
      return saveWithMedia({
        validate: () => {
          assertValidImageBatch(files)
        },
        saveEntity: () =>
          unwrap(
            api.PATCH("/events/{event_id}", {
              params: { path: { event_id: id } },
              body,
            })
          ),
        uploadMedia:
          files.length > 0
            ? async () => {
                const uploaded = await uploadMedia({
                  entityType: "community_events",
                  entityId: id,
                  items: toUploadItems(files),
                })
                return uploaded.length
              }
            : undefined,
      })
    },
    onSuccess: async (result, { id }) => {
      await queryClient.invalidateQueries({ queryKey: qk.events.all() })
      if (result.successfulUploadCount > 0) {
        refreshWhenMediaLands(queryClient, id)
      }
    },
  })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) =>
      unwrap(
        api.DELETE("/events/{event_id}", { params: { path: { event_id: id } } })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.events.all() })
    },
  })
}

interface CalendarEvent {
  name: string
  start_datetime: string
  end_datetime: string
  place: string
  description?: string | null
}

function googleInstant(value: string): string {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z")
}

export function eventGoogleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.name,
    dates: `${googleInstant(event.start_datetime)}/${googleInstant(event.end_datetime)}`,
    location: event.place,
  })
  if (event.description) params.set("details", event.description)
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export type EventTimingKind = "upcoming" | "ongoing" | "finished"

export interface EventTiming {
  kind: EventTimingKind
  label: string
  detail: string
}

function formatDuration(milliseconds: number): string {
  const minutes = Math.max(0, Math.floor(milliseconds / 60_000))
  const days = Math.floor(minutes / (24 * 60))
  const hours = Math.floor((minutes % (24 * 60)) / 60)
  const remainingMinutes = minutes % 60

  if (days > 0)
    return `${String(days)}d${hours > 0 ? ` ${String(hours)}h` : ""}`
  if (hours > 0) {
    return `${String(hours)}h${
      remainingMinutes > 0 ? ` ${String(remainingMinutes)}m` : ""
    }`
  }
  return `${String(Math.max(1, remainingMinutes))}m`
}

export function getEventTiming(
  start: string,
  end: string,
  now = Date.now()
): EventTiming {
  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()

  if (endTime <= now) {
    return {
      kind: "finished",
      label: "Finished",
      detail: `Ended ${formatDuration(now - endTime)} ago`,
    }
  }

  if (startTime <= now) {
    return {
      kind: "ongoing",
      label: "Happening now",
      detail: `${formatDuration(endTime - now)} left`,
    }
  }

  return {
    kind: "upcoming",
    label: "Starts in",
    detail: formatDuration(startTime - now),
  }
}

export function eventPolicyLabel(policy: "open" | "registration"): string {
  return policy === "registration" ? "Registration required" : "Open entry"
}

/**
 * Which fields the server will accept an edit to, for this user, on this event.
 *
 * The list is built per-request in `backend/modules/campuscurrent/events/policy.py`
 * and differs between an admin and the event's own creator — `tag` is admin-only,
 * and the difference is invisible from the response alone. Editing is gated on
 * this rather than on a role check, so a policy change on the server takes
 * effect here without a frontend release.
 *
 * Absent permissions means no permissions: an event fetched by a signed-out
 * visitor carries none, and treating that as "everything is editable" would put
 * a form on screen that every request from then on refuses.
 */
export function canEditField(event: Event, field: string): boolean {
  return event.permissions?.editable_fields.includes(field) ?? false
}
