type BrowserLocation = Pick<Location, "origin" | "pathname" | "search" | "hash">

export function currentBrowserPath(location: BrowserLocation): string {
  return `${location.pathname}${location.search}${location.hash}`
}

/**
 * The backend accepts only same-site relative return paths. Normalizing here
 * keeps deep links while ensuring an externally supplied `returnTo` cannot
 * become an open redirect.
 */
export function loginHref({
  returnTo,
  origin,
  reauthenticate = false,
}: {
  returnTo: string
  origin: string
  reauthenticate?: boolean
}): string {
  let safeReturnTo = "/"
  try {
    const appOrigin = new URL(origin).origin
    const parsed = new URL(returnTo, appOrigin)
    if (parsed.origin === appOrigin) {
      safeReturnTo = `${parsed.pathname}${parsed.search}${parsed.hash}`
    }
  } catch {
    // A malformed, user-controlled return target falls back to the app root.
  }
  const params = new URLSearchParams({ return_to: safeReturnTo })
  if (reauthenticate) params.set("reauth", "true")
  return `/api/login?${params.toString()}`
}

type LogoutFetcher = (
  input: string,
  init: RequestInit
) => Promise<Pick<Response, "ok" | "status" | "json">>

export class LogoutError extends Error {
  readonly status: number
  readonly detail: unknown

  constructor(status: number, detail: unknown) {
    super(
      `Logout failed with ${String(status)}: ${
        typeof detail === "object" && detail !== null && "detail" in detail
          ? String(detail.detail)
          : String(detail)
      }`
    )
    this.name = "LogoutError"
    this.status = status
    this.detail = detail
  }
}

export async function requestLogout(
  fetcher: LogoutFetcher = fetch
): Promise<void> {
  const response = await fetcher("/api/logout", {
    method: "GET",
    credentials: "include",
  })
  if (!response.ok) {
    const detail = await response.json().catch(() => undefined)
    throw new LogoutError(response.status, detail)
  }
}
