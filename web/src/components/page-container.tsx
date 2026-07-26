import type { ComponentPropsWithoutRef, ElementType } from "react"

import { cn } from "@/lib/utils"

export type PageWidth = "prose" | "default" | "wide" | "full"
export type PagePadding = "default" | "dense" | "none"

const widthClasses: Record<PageWidth, string> = {
  prose: "max-w-3xl",
  default: "max-w-5xl",
  wide: "max-w-7xl",
  full: "",
}

const paddingClasses: Record<PagePadding, string> = {
  default: "px-3 sm:px-4 lg:px-6",
  dense: "px-3 sm:px-4",
  none: "",
}

type PageContainerProps<T extends ElementType> = {
  as?: T
  maxWidth?: PageWidth
  padding?: PagePadding
} & Omit<ComponentPropsWithoutRef<T>, "as">

export function PageContainer<T extends ElementType = "div">({
  as,
  className,
  maxWidth = "wide",
  padding = "default",
  ...props
}: PageContainerProps<T>) {
  const Component = as ?? "div"

  return (
    <Component
      className={cn(
        "mx-auto w-full",
        widthClasses[maxWidth],
        paddingClasses[padding],
        className
      )}
      {...props}
    />
  )
}
