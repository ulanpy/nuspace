import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title?: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  actions?: ReactNode
  /**
   * Drawn to the left of the title block, vertically centred against it.
   *
   * The caller's own node rather than a variant, because the two things that
   * want one here want different things: `/account` wants a circular `Avatar`
   * that sizes itself, and the alternative — a fixed-size box for the caller to
   * fill — is what put a `size-12` image inside a `size-10` clipper and cropped
   * it to a rounded rectangle. Optional, so a page without media wraps exactly
   * as it did before this prop existed.
   */
  media?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  media,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {media}
        {/* `flex-1` so the text block takes the remaining width: without media
            this is the same single column it always was, and with media the
            title wraps against the avatar instead of the box edge. */}
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="mb-2 text-sm font-semibold tracking-wider text-primary uppercase">
              {eyebrow}
            </p>
          )}
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h1>
          {description && (
            <div className="mt-2 leading-relaxed text-muted-foreground">
              {description}
            </div>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  )
}
