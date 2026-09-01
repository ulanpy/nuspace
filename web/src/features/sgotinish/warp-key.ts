/**
 * WarpKey: the secret that owns an anonymous ticket.
 *
 * The client generates the key, derives `owner_hash = SHA256(key)` and sends
 * only the hash. The backend stores the hash and no `author_sub`, so nothing
 * server-side links the ticket to a person — which is the entire point, and
 * also why losing the key means losing the ticket permanently. There is no
 * recovery path by design.
 *
 * Two rules follow from that and are load-bearing:
 *
 *  - The key travels in the URL *fragment* (`/t#key=...`). Fragments are never
 *    sent to the server, so it stays out of request lines, access logs and
 *    `Referer`. The previous app used `?key=`, which put the secret in the
 *    query string and therefore into nginx's logs.
 *  - Only the hash is ever sent, and only in the `X-Owner-Hash` header — never
 *    as a query parameter, for the same reason.
 */

const KEY_BYTES = 32

/** A fresh, URL-safe key. */
export function generateWarpKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(KEY_BYTES))

  // base64url so the key survives a URL fragment without escaping.
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

/** `SHA256(key)` as lowercase hex — the 64 characters the backend stores. */
export async function deriveOwnerHash(key: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(key)
  )

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

/**
 * Read the key from the URL fragment.
 *
 * Accepts `#key=...` and a bare `#...` so a link that loses the prefix still
 * works. Returns null rather than throwing: a malformed fragment is a
 * mistyped link, not an error worth crashing a page over.
 */
export function readKeyFromFragment(hash: string): string | null {
  const fragment = hash.replace(/^#/, "")
  if (!fragment) return null

  const params = new URLSearchParams(fragment)
  const key = params.get("key")
  if (key) return key

  // A fragment with no `=` is the key itself.
  return fragment.includes("=") ? null : fragment
}

/** The shareable link for a ticket — the only copy of the key that exists. */
export function warpKeyLink(key: string, origin: string): string {
  return `${origin}/t#key=${key}`
}
