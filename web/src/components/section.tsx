import type { ComponentPropsWithoutRef, ElementType } from "react"

import { cn } from "@/lib/utils"

export type SectionSpacing = "default" | "compact" | "none"

const spacingClasses: Record<SectionSpacing, string> = {
  default: "py-14 sm:py-18 lg:py-22",
  compact: "py-8 sm:py-10",
  none: "",
}

type SectionProps<T extends ElementType> = {
  as?: T
  spacing?: SectionSpacing
} & Omit<ComponentPropsWithoutRef<T>, "as">

export function Section<T extends ElementType = "section">({
  as,
  className,
  spacing = "default",
  ...props
}: SectionProps<T>) {
  const Component = as ?? "section"

  return (
    <Component className={cn(spacingClasses[spacing], className)} {...props} />
  )
}
