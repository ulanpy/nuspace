import {
  queryOptions,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"

import { api, unwrap } from "@/api/client"
import { qk } from "@/api/query-keys"
import { hasMediaFormat, pollForMedia } from "@/lib/media-polling"
import { useMediaUpload } from "@/features/media/use-media-upload"
import { assertValidImageBatch, type MediaFormat } from "@/features/media/types"
import { saveWithMedia } from "@/features/media/save-with-media"
import type {
  EventCreate,
  EventStatus,
  EventType,
  EventUpdate,
  RegistrationPolicy,
} from "@/features/events/types"

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
 * `lib/media-polling.ts`), which can take seconds — holding the dialog open and
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
