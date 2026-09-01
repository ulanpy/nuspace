import { QueryClient } from "@tanstack/react-query"

/**
 * The one and only QueryClient.
 *
 * It is passed to both QueryClientProvider and the router context, so route
 * hooks and components always resolve the same cache. Never construct another
 * one — the old app had two, and every imperative invalidateQueries in
 * use-user.ts operated on a cache no component was subscribed to.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
})
