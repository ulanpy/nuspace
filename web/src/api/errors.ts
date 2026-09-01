import { ApiError } from "@/api/client"

/**
 * A message safe to put in front of a user for a failed API call.
 *
 * The old app open-coded this twice — once in `opportunity-form.tsx` and once
 * in the SG membership manager — as ~70 lines apiece of re-reading the
 * `Response` body and re-parsing JSON that the fetch layer had already parsed.
 * Both copies rendered whatever `detail` came back, whatever the status.
 *
 * This one follows the rule established in
 * `features/courses/registrar-errors.ts`: **never render a 5xx `detail`.**
 * FastAPI runs with `debug=True` locally, so a 500 body is a Python traceback;
 * in production it is still an internal description written for developers.
 * A 4xx detail is the opposite — deliberate, addressed to the caller, and
 * usually the only thing that explains what to fix.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    // Network failures, aborted requests and thrown strings all land here.
    return error instanceof Error && error.message.trim()
      ? error.message
      : fallback
  }

  if (error.status >= 500) return fallback

  return extractDetail(error.detail) ?? fallback
}

/** True when the failure is the session having gone away. */
export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.isUnauthorized
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

/**
 * FastAPI answers with `{"detail": "..."}` for a raised HTTPException and with
 * `{"detail": [{loc, msg, type}, ...]}` for a request that failed validation.
 * Pydantic's `msg` is short and readable ("String should have at most 75
 * characters"); `loc` names the field, which the form has already labelled, so
 * only `msg` is worth showing.
 */
function extractDetail(body: unknown): string | null {
  const detail = isRecord(body) && "detail" in body ? body.detail : body

  if (typeof detail === "string") {
    const trimmed = detail.trim()
    return trimmed === "" ? null : trimmed
  }

  if (Array.isArray(detail)) {
    const issues: unknown[] = detail
    const messages = issues
      .map((issue) =>
        isRecord(issue) && typeof issue.msg === "string" ? issue.msg : null
      )
      .filter((message) => message !== null)
    return messages.length > 0 ? messages.join(". ") : null
  }

  /**
   * `{"code": "...", "message": "..."}`, which the planner raises on its 409s
   * so the caller can branch on `code` while still having something to show.
   * Only `message` is for a person; `code` is for a machine and must not reach
   * the screen.
   */
  if (isRecord(detail) && typeof detail.message === "string") {
    const trimmed = detail.message.trim()
    return trimmed === "" ? null : trimmed
  }

  return null
}
