import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"

import { api, unwrap } from "@/api/client"
import { qk } from "@/api/query-keys"
import { hostOf, serviceByKey } from "@/lib/hosts"
import { slugSchema } from "@/lib/slug"
import { ACCOUNT_RESERVED_WORDS, NEW_PROFILE_DESIGN } from "./constants"
import type {
  ProfileDesign,
  ProfileSettings,
  ProfileSettingsUpdate,
} from "./types"

/**
 * A handle: the slug rules, reserved slugs included, plus the account host's
 * own words. The server's `validate_handle` is the same two checks.
 */
export function handleSchema() {
  return slugSchema().refine(
    (value) => !ACCOUNT_RESERVED_WORDS.includes(value),
    { message: "That handle is reserved" }
  )
}

/**
 * Where a handle's profile page lives, as the settings screen prints it: on
 * the account host of the environment the viewer is in, so staging never
 * shows a production address. An unknown host gets production's.
 */
export function profileAddress(handle: string, hostname: string): string {
  const environment = hostOf(hostname)?.environment ?? "production"
  return `${serviceByKey("my").hosts[environment]}/u/${handle}`
}

/**
 * The design the editor opens on. A profile never saved (`null`) starts from
 * About and Links; once saved, the editor opens on exactly what was saved,
 * even if the person cleared it.
 */
export function designToEdit(content: ProfileDesign | null): ProfileDesign {
  return content ?? structuredClone(NEW_PROFILE_DESIGN)
}

export function myProfileQueryOptions() {
  return queryOptions({
    queryKey: qk.profiles.mine(),
    queryFn: () => unwrap(api.GET("/me/profile")),
  })
}

export function profileQueryOptions(handle: string) {
  return queryOptions({
    queryKey: qk.profiles.detail(handle),
    queryFn: () =>
      unwrap(api.GET("/profiles/{handle}", { params: { path: { handle } } })),
  })
}

/**
 * Every profile write answers with the viewer's settings, so the cache takes
 * the answer as is. Read-by-handle entries are dropped: a rename or a new tier
 * changes what they say.
 */
function useSettleProfile() {
  const queryClient = useQueryClient()
  return (settings: ProfileSettings) => {
    queryClient.setQueryData(qk.profiles.mine(), settings)
    void queryClient.invalidateQueries({ queryKey: qk.profiles.details() })
  }
}

export function useUpdateProfileSettings() {
  const settle = useSettleProfile()
  return useMutation({
    mutationFn: (body: ProfileSettingsUpdate) =>
      unwrap(api.PATCH("/me/profile", { body })),
    onSuccess: settle,
  })
}

export function useSaveProfileDesign() {
  const settle = useSettleProfile()
  return useMutation({
    mutationFn: (content: ProfileDesign) =>
      unwrap(api.PUT("/me/profile/content", { body: { content } })),
    onSuccess: settle,
  })
}
