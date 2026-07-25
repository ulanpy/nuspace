import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api, unwrap } from "@/api/client"
import { qk } from "@/api/query-keys"

/**
 * One request for the home page instead of a fan-out: the backend bundles
 * upcoming events and open recruitment into a single payload.
 */
export const announcementsBundleQueryOptions = queryOptions({
  queryKey: qk.announcements.bundle(),
  queryFn: () => unwrap(api.GET("/announcements/bundle")),
})

/**
 * This route has no response_model on the backend, so OpenAPI reports the body
 * as `unknown` and codegen cannot describe it. Parsing here recovers the shape
 * — see the same situation on /me.
 */
const telegramPostSchema = z.object({
  latest_post_id: z.number(),
})

/** Latest post id from the public Telegram channel, for the embedded feed. */
export const telegramPostQueryOptions = queryOptions({
  queryKey: qk.announcements.telegram(),
  queryFn: async () =>
    telegramPostSchema.parse(await unwrap(api.GET("/announcements/telegram"))),
  // The channel changes far less often than a page view.
  staleTime: 1000 * 60 * 15,
})
