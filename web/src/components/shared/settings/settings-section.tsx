import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

const widthClasses = {
  form: "max-w-2xl",
  prose: "max-w-3xl",
  full: "",
} as const

interface SettingsSectionProps {
  title: string
  description?: string
  /**
   * `form` for one-column inputs, `full` for tables and lists that need the
   * whole page. Defaults to `form` because stretched fields are the common
   * complaint and the width belongs to the section, not the page.
   */
  width?: keyof typeof widthClasses
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
  width = "form",
  className,
  children,
}: SettingsSectionProps) {
  return (
    <section className={cn("space-y-4", widthClasses[width], className)}>
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
