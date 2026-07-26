import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  actions?: ReactNode
  as?: "h1" | "h2"
  className?: string
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  as: Heading = "h1",
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="max-w-3xl">
        {eyebrow && (
          <p className="mb-2 text-sm font-semibold tracking-wider text-primary uppercase">
            {eyebrow}
          </p>
        )}
        <Heading className="text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </Heading>
        {description && (
          <div className="mt-2 leading-relaxed text-muted-foreground">
            {description}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  )
}
