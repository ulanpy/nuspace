import { ApiError } from "@/api/client"

/**
 * A message safe to put on screen for a failed registrar operation.
 *
 * Never renders the server's `detail` for a 5xx. FastAPI runs with `debug=True`
 * locally, which puts the entire Python traceback in the response body — that
 * once ended up printed across the page in place of an error message. Even in
 * production a 5xx detail is an internal description written for developers,
 * not something a student can act on.
 *
 * 4xx details are different: those are deliberate, written for the caller, and
 * worth showing.
 */
export function registrarErrorMessage(error: unknown, action: string): string {
  if (!(error instanceof ApiError)) {
    return `Something went wrong ${action}.`
  }

  if (error.status === 401 || error.status === 403) {
    return "The registrar rejected that username or password."
  }

  if (error.status === 502 || error.status === 504) {
    // Deliberately does not mention the password: this is the path taken when
    // the registrar is unreachable or its sign-in page changed, and sending
    // someone to reset a working password wastes their time.
    return `Could not reach the registrar to finish ${action}. This is not a problem with your password — try again shortly.`
  }

  if (error.status >= 500) {
    return `Something went wrong ${action}. This one is on us, not on your credentials.`
  }

  return error.message
}
