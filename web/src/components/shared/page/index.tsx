import type { ReactNode } from "react"

import { PageHeader } from "@/components/shared/page/header"
import { cn } from "@/lib/utils"

interface PageProps {
  /** Omit on a page that brings its own heading, e.g. the landing hero. */
  title?: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  actions?: ReactNode
  /**
   * `prose` caps the body at `max-w-3xl` for pages that are read rather than
   * scanned, and centres that column. `wide` leaves the body uncapped inside
   * the box.
   */
  width?: "wide" | "prose"
  /** For the centred header on the public pages; nothing else needs it. */
  headerClassName?: string
  className?: string
  children: ReactNode
}

/**
 * A page: the box, the header, and the body.
 *
 * The box is *always* `max-w-7xl` and only the body is capped. Two pages
 * used to ship their own width for the whole thing, so two pages of the same
 * kind had different left edges and the header on a `prose` page sat 30rem
 * further left than the header above the list next to it.
 *
 * A `prose` page centres its body column, but the header stays at the left of
 * the box so the title does not move when a page switches between the two
 * widths. On a screen narrower than the box that centring is a no-op; it only
 * moves the reading column off the left edge of a very wide screen.
 *
 * The gap below the header lives here too, so it is the same on every screen.
 *
 * A page never sets padding: `layouts/app` and `layouts/public` own that, which
 * is why a page cannot accidentally end up padded twice.
 */
export function Page({
  title,
  description,
  eyebrow,
  actions,
  width = "wide",
  headerClassName,
  className,
  children,
}: PageProps) {
  const hasHeader = Boolean(title ?? description ?? eyebrow ?? actions)

  return (
    <div className={cn("mx-auto w-full max-w-7xl", className)}>
      {hasHeader && (
        <PageHeader
          title={title}
          description={description}
          eyebrow={eyebrow}
          actions={actions}
          className={headerClassName}
        />
      )}
      <div
        className={cn(
          "space-y-6",
          hasHeader && "mt-6",
          width === "prose" && "mx-auto max-w-3xl"
        )}
      >
        {children}
      </div>
    </div>
  )
}
