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

export function isSafeHref(value: string | undefined): boolean {
  if (!value) return false
  return !isDangerousScheme(value)
}

/** Renders a link provided by the editor, dropping dangerous schemes. */
export function safeHref(value: string | undefined): string | undefined {
  return isSafeHref(value) ? value : undefined
}