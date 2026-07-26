/**
 * URL checks for the community form.
 *
 * Ported from `frontend/src/features/communities/utils/url-validation.ts`,
 * which was the only tested module in the old app — its test came with it and
 * lives beside this file.
 *
 * The zod schemas the original wrapped these rules in are gone; every one of
 * them ended in a `refine` that re-parsed the string with `new URL` anyway, so
 * the schema layer only obscured what was being checked.
 *
 * The interesting case, and the reason the tests exist, is that `new URL`
 * accepts far more than it looks like it does. `https://wtf://t.me/x` parses
 * happily, with `wtf:` as the *host* — so a bare protocol check would let it
 * through and someone would end up with a link that goes nowhere near Telegram.
 * Hence the "exactly one `://`" rule.
 */

const TELEGRAM_HOSTS = new Set(["t.me", "telegram.me"])
const INSTAGRAM_HOSTS = new Set(["instagram.com", "instagr.am"])

/** Anything with a second `://` is not the URL it appears to be. */
function hasSingleSchemeDelimiter(value: string): boolean {
  const first = value.indexOf("://")
  return first !== -1 && first === value.lastIndexOf("://")
}

/** Parses only what is genuinely an http(s) URL, and nothing else. */
function parseHttpUrl(value: string): URL | null {
  const trimmed = value.trim()
  if (!hasSingleSchemeDelimiter(trimmed)) return null

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  return url.protocol === "http:" || url.protocol === "https:" ? url : null
}

function hostMatches(value: string, hosts: ReadonlySet<string>): boolean {
  const url = parseHttpUrl(value)
  if (!url) return false
  // Exact host match after dropping `www.`: `evil.t.me` is not `t.me`.
  return hosts.has(url.hostname.toLowerCase().replace(/^www\./, ""))
}

/**
 * Adds a scheme to a bare domain so `t.me/nuspace` is accepted as typed.
 *
 * Only when there is no scheme at all. A value that already names one is left
 * exactly as it is, including a nonsensical one — rewriting `wtf://` to
 * `https://wtf://` would turn a typo into a plausible-looking wrong URL, and
 * the validators below are what should reject it.
 */
export function normalizeHttpUrl(
  value: string | undefined | null
): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  return /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`
}

/** An error message, or undefined when the value is acceptable. */
export function getHttpsUrlError(value: string): string | undefined {
  return parseHttpUrl(value)?.protocol === "https:"
    ? undefined
    : "Enter an HTTPS URL"
}

export function getTelegramUrlError(value: string): string | undefined {
  return hostMatches(value, TELEGRAM_HOSTS) ? undefined : "Enter a Telegram URL"
}

export function getInstagramUrlError(value: string): string | undefined {
  return hostMatches(value, INSTAGRAM_HOSTS)
    ? undefined
    : "Enter an Instagram URL"
}
