import createClient, { type Middleware } from "openapi-fetch"

import type { paths } from "@/api/schema"

/**
 * Auth is cookie-based and same-origin: nginx proxies /api to FastAPI, and the
 * access/refresh/app tokens are httpOnly cookies the browser sends on its own.
 * There is no Authorization header to attach and no token for the client to
 * hold. `credentials: "include"` keeps that working when the dev server and the
 * API are not literally the same origin.
 */
export const api = createClient<paths>({
  baseUrl: "/api",
  credentials: "include",
})

/** A non-2xx response from the API. */
export class ApiError extends Error {
  readonly status: number
  /** FastAPI's error body: `{"detail": "..."}` or a 422 validation array. */
  readonly detail: unknown

  constructor(status: number, detail: unknown) {
    super(`API request failed with ${status}: ${describe(detail)}`)
    this.name = "ApiError"
    this.status = status
    this.detail = detail
  }

  /** True when the session is missing or expired. */
  get isUnauthorized() {
    return this.status === 401
  }

  /** True when the user is known but not allowed to do this. */
  get isForbidden() {
    return this.status === 403
  }
}

function describe(detail: unknown): string {
  if (typeof detail === "string") return detail
  if (detail && typeof detail === "object" && "detail" in detail) {
    const inner = (detail as { detail: unknown }).detail
    if (typeof inner === "string") return inner
    // 422 bodies are [{loc, msg, type}, ...].
    if (Array.isArray(inner)) {
      return inner
        .map((issue) =>
          issue && typeof issue === "object" && "msg" in issue
            ? String((issue as { msg: unknown }).msg)
            : JSON.stringify(issue)
        )
        .join("; ")
    }
  }
  return JSON.stringify(detail)
}

/**
 * openapi-fetch returns `{ data, error }` rather than throwing. React Query
 * needs a rejected promise to drive its error states, so unwrap at the seam:
 * every hook calls this and gets a value or an ApiError.
 */
export async function unwrap<T>(
  promise: Promise<{ data?: T; error?: unknown; response: Response }>
): Promise<T> {
  const { data, error, response } = await promise
  if (error !== undefined || !response.ok) {
    throw new ApiError(response.status, error)
  }
  // 204/205 responses legitimately carry no body.
  return data as T
}

/** Adds credentials to every request, including ones openapi-fetch retries. */
const credentialsMiddleware: Middleware = {
  onRequest({ request }) {
    return new Request(request, { credentials: "include" })
  },
}

api.use(credentialsMiddleware)
