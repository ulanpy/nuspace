/** Mirrors the backend's `CONTENT_TEXT_MAX_LENGTH`. */
export const CONTENT_TEXT_MAX_LENGTH = 100_000

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
}

/** Text of an HTML string: tags dropped (never gluing words together), common entities decoded. */
export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITIES[entity])
}

// Keys whose strings are identifiers, not words a reader sees.
const SKIPPED_KEYS = new Set(["id", "type"])

function collect(value: unknown, out: string[]): void {
  if (typeof value === "string") {
    const text = stripHtml(value).replace(/\s+/g, " ").trim()
    if (text) out.push(text)
  } else if (Array.isArray(value)) {
    for (const item of value) collect(item, out)
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (!SKIPPED_KEYS.has(key)) collect(child, out)
    }
  }
}

/**
 * The text inside a Puck document, for search. Walks every string prop at every
 * depth, so a `Grid` or `Flex` slot (an array of `{ type, props }`) is
 * recursed into like any other value, and strips HTML from `RichText` and
 * `Hero` descriptions. Capped at what the backend accepts.
 */
export function pageContentText(data: unknown): string {
  const out: string[] = []
  collect(data, out)
  return out.join(" ").slice(0, CONTENT_TEXT_MAX_LENGTH)
}
