const DANGEROUS_PROTOCOL = /^(javascript|vbscript|data):/i

function trimToLower(value: string): string {
  return value.trim().toLowerCase()
}

/** Detects dangerous schemes including encoded variations (e.g. `java%73cript:`). */
function isDangerousScheme(value: string): boolean {
  try {
    return DANGEROUS_PROTOCOL.test(
      trimToLower(decodeURIComponent(value)).split(";")[0]
    )
  } catch {
    return false
  }
}

function sanitizeAttributes(
  el: Element,
  allowed: readonly string[],
  urlAttrs: readonly string[]
): void {
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase()
    if (name.startsWith("on") || !allowed.includes(name)) {
      el.removeAttribute(attr.name)
    } else if (urlAttrs.includes(name) && isDangerousScheme(attr.value)) {
      el.removeAttribute(attr.name)
    }
  }
}

/** Keeps plain formatting plus simple links/media; strips scripts, event
 * handlers, styles and dangerous URL schemes. */
export function sanitizeHtml(html: string): string {
  if (typeof DOMParser === "undefined") return ""
  const doc = new DOMParser().parseFromString(html, "text/html")
  if (!doc.body) return ""

  for (const el of Array.from(doc.body.querySelectorAll("*"))) {
    const tag = el.tagName.toLowerCase()
    if (
      tag === "script" ||
      tag === "style" ||
      tag === "iframe" ||
      tag === "object"
    ) {
      el.remove()
      continue
    }
    el.removeAttribute("style")
    if (tag === "img") {
      sanitizeAttributes(el, ["src", "alt", "width", "height"], ["src"])
    } else {
      sanitizeAttributes(el, ["href", "target", "rel", "title"], ["href"])
    }
  }

  return doc.body.innerHTML
}

export function isSafeHref(value: string | undefined): boolean {
  if (!value) return false
  return !isDangerousScheme(value)
}

/** Renders a link provided by the editor, dropping dangerous schemes. */
export function safeHref(value: string | undefined): string | undefined {
  return isSafeHref(value) ? value : undefined
}
