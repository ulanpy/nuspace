import type { ComponentPropsWithoutRef } from "react"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const columnClasses = {
  1: "",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 xl:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
} as const

type CardGridProps = {
  columns?: keyof typeof columnClasses
} & ComponentPropsWithoutRef<"div">

/**
 * The responsive grid every card list sits in.
 *
 * `items-stretch` (not `items-start`) so a card with a banner stretches its
 * row instead of leaving a column of empty space. It only works when the
 * children are `h-full`, which `InfiniteList` now guarantees — that pairing is
 * why the ladder lives here instead of being pasted into each page.
 */
export function CardGrid({
  columns = 3,
  className,
  children,
  ...props
}: CardGridProps) {
  return (
    <div
      className={cn(
        "grid items-stretch gap-4",
        columnClasses[columns],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Placeholder tiles in the same grid as the real list.
 *
 * Shape matters more than detail: a stack of full-width lines inside a
 * three-column grid is what this replaces, and it read as a broken layout
 * rather than a loading one.
 */
export function CardGridSkeleton({
  columns = 3,
  count = 6,
}: {
  columns?: keyof typeof columnClasses
  count?: number
}) {
  return (
    <CardGrid columns={columns} aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <Card key={index} size="sm" className="gap-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </Card>
      ))}
    </CardGrid>
  )
}
