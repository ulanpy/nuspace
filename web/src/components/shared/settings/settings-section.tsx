import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface SettingsSectionProps {
  title: string
  description?: string
  /** A button beside the title, for the one thing the section leads to. */
  actions?: ReactNode
  className?: string
  children: ReactNode
}

/**
 * One titled block on a settings page.
 *
 * Deliberately uncontainered — the section owns its own heading, and each
 * caller decides whether the content sits in a `Card`, a bordered danger zone,
 * or bare. The old per-page `SectionHeading` + `Card` pairing made that choice
 * impossible to vary, and every settings screen ended up padded the same way.
 *
 * No width prop: the page decides, through `Page width="prose"`. The old
 * `form`/`full` choices were why the settings pages had ragged left edges.
 */
export function SettingsSection({
  title,
  description,
  actions,
  className,
  children,
}: SettingsSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {children}
    </section>
  )
}
