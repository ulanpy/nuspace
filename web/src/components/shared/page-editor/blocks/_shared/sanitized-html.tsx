import { useMemo, type CSSProperties } from "react"
import { sanitizeHtml } from "../_lib/sanitize"

/**
 * Renders editor-provided rich HTML through a sanitizer so the `.nuspace-richtext`
 * styles can actually style `h*`, lists, links etc. instead of React escaping them.
 */
export function SanitizedHtml({
  html,
  className,
  style,
}: {
  html?: string
  className?: string
  style?: CSSProperties
}) {
  const sanitized = useMemo(() => {
    if (!html) return ""
    try {
      return sanitizeHtml(html)
    } catch {
      return ""
    }
  }, [html])

  return (
    <div
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}
