import { useRouterState } from "@tanstack/react-router"

import { currentBrowserPath, loginHref } from "@/lib/user"

/**
 * The link that signs a visitor in and brings them back to the host and path
 * they are on. It goes to this host's `/api/login`, so the backend sends them
 * back to this host, and `return_to` is the browser path here, not the
 * router's.
 */
export function useSignInHref(): string {
  // Re-render on navigation, so the link always carries the current path.
  useRouterState({ select: (state) => state.location.href })

  return loginHref({
    returnTo: currentBrowserPath(window.location),
    origin: window.location.origin,
  })
}
