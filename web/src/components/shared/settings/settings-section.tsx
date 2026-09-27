import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface SettingsSectionProps {
  title: string
  description?: string
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
 */
export function SettingsSection({
  title,
  description,
  className,
  children,
}: SettingsSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}
