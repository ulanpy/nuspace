import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, unwrap } from "@/api/client"
import { qk } from "@/api/query-keys"

/**
 * Whether the signed-in user hears on Telegram when an event they attend is
 * cancelled or moved. On by default; it only matters once Telegram is connected.
 */
export function useEventNotifications() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: qk.users.eventNotifications(),
    queryFn: () => unwrap(api.GET("/users/me/event-notifications")),
  })

  const mutation = useMutation({
    mutationFn: (enabled: boolean) =>
      unwrap(api.PUT("/users/me/event-notifications", { body: { enabled } })),
    onSuccess: (data) => {
      queryClient.setQueryData(qk.users.eventNotifications(), data)
    },
  })

  return {
    /** Undefined until the first response; the switch stays disabled until then. */
    enabled: query.data?.enabled,
    isSaving: mutation.isPending,
    setEnabled: (enabled: boolean) => {
      mutation.mutate(enabled)
    },
  }
}
