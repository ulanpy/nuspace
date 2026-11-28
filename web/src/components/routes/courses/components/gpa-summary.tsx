import { TargetIcon, TrendingUpIcon } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Card } from "@/components/ui/card"
import { formatGpa, gpaBarFill } from "@/lib/courses/gpa"
import type { GpaSummary } from "@/lib/courses/gpa"

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="min-w-22">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        {label}
      </dt>
      <dd className="mt-1 text-base leading-none font-semibold tabular-nums">
        {value}
      </dd>
    </div>
  )
}

/**
 * The term's GPA: the figure, a two-tone bar of where it stands against where
 * it is heading, and the projected and ceiling readings beside it.
 */
export function GpaSummaryCard({ summary }: { summary: GpaSummary }) {
  const { current, projected, ceiling, excludedCount } = summary

  return (
    <Card className="gap-4 p-4 lg:flex-row lg:items-center lg:gap-6 lg:p-5">
      <div className="flex shrink-0 items-baseline gap-2">
        <p className="text-3xl leading-none font-semibold tracking-tight tabular-nums">
          {formatGpa(current)}
        </p>
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          GPA
        </span>
      </div>

      <div className="min-w-0 flex-1 lg:min-w-44">
        {/* Decorative: the figures beside it are already text, so a
            progressbar role would read the same numbers twice. */}
        <div
          aria-hidden
          className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary/25 transition-[width]"
            style={{ width: `${String(gpaBarFill(projected))}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width]"
            style={{ width: `${String(gpaBarFill(current))}%` }}
          />
        </div>
        <div className="mt-1.5 flex w-full justify-between gap-4 text-xs text-muted-foreground tabular-nums">
          <span>0.0</span>
          {excludedCount > 0 && (
            <span>
              {excludedCount} {excludedCount === 1 ? "course" : "courses"}{" "}
              excluded
            </span>
          )}
          <span>4.0</span>
        </div>
      </div>

      <dl className="flex shrink-0 items-stretch gap-5 lg:gap-6">
        <Metric
          icon={TrendingUpIcon}
          label="Projected"
          value={formatGpa(projected)}
        />
        <Metric
          icon={TargetIcon}
          label="Max possible"
          value={formatGpa(ceiling)}
        />
      </dl>
    </Card>
  )
}
