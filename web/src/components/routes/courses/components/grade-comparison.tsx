import { Trash2Icon, XIcon } from "lucide-react"

import {
  MAX_GRADE_COMPARISONS,
  comparisonMetrics,
} from "@/lib/courses/comparison"
import type { GradeReport } from "@/lib/courses"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** The header already says which course and section each column is. */
const HEADER_METRICS = new Set(["Course", "Section"])

function chipLabel(report: GradeReport): string {
  return [
    [report.course_code, report.section].filter(Boolean).join(" "),
    report.term,
  ]
    .filter(Boolean)
    .join(" · ")
}

/**
 * The reports picked for comparison, pinned under the site header while the
 * list scrolls beneath, so a pick can be made far down the list and the
 * result stays in view.
 */
export function GradeComparison({
  selected,
  onRemove,
  onClear,
}: {
  selected: GradeReport[]
  onRemove: (id: number) => void
  onClear: () => void
}) {
  if (selected.length === 0) return null
  const metrics = comparisonMetrics(selected).filter(
    (metric) => !HEADER_METRICS.has(metric.label)
  )

  return (
    <section
      aria-label="Compare grade reports"
      className="sticky top-14 z-20 border-b border-border bg-background/95 pt-1 pb-3 backdrop-blur"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="text-sm font-medium">
            Compare{" "}
            <span className="text-muted-foreground tabular-nums">
              {selected.length}/{MAX_GRADE_COMPARISONS}
            </span>
          </p>
          {selected.length === 1 && (
            <span className="text-[13px] text-muted-foreground">
              Select one more to compare
            </span>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-[13px]"
          onClick={onClear}
        >
          <Trash2Icon className="size-3.5" aria-hidden />
          Clear all
        </Button>
      </div>

      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {selected.map((report) => (
          <button
            key={report.id}
            type="button"
            onClick={() => {
              onRemove(report.id)
            }}
            className="inline-flex max-w-[220px] shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-left text-[12px] transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            title="Remove from compare"
            aria-label={`Remove ${chipLabel(report)} from compare`}
          >
            <span className="min-w-0 truncate font-medium">
              {chipLabel(report)}
            </span>
            <XIcon
              className="size-3 shrink-0 text-muted-foreground"
              aria-hidden
            />
          </button>
        ))}
      </div>

      {selected.length >= 2 && (
        <div className="mt-3 max-h-[50svh] overflow-auto rounded-xl border border-border bg-background">
          <table className="w-full min-w-[520px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="sticky left-0 z-10 bg-muted px-3 py-2 text-left font-medium text-muted-foreground">
                  Metric
                </th>
                {selected.map((report) => (
                  <th
                    key={report.id}
                    className="px-3 py-2 text-left font-semibold whitespace-nowrap"
                  >
                    {report.course_code}
                    {report.section && (
                      <span className="ml-1 font-normal text-muted-foreground">
                        {report.section}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr
                  key={metric.label}
                  className="border-b border-border last:border-0"
                >
                  <th className="sticky left-0 z-10 bg-background px-3 py-2 text-left font-medium whitespace-nowrap text-muted-foreground">
                    {metric.label}
                  </th>
                  {metric.values.map((value, index) => (
                    <td
                      key={`${metric.label}-${String(selected[index]?.id ?? index)}`}
                      className={cn(
                        "px-3 py-2 tabular-nums",
                        metric.bestIndexes?.includes(index) &&
                          "rounded-md bg-success/15 font-semibold text-success"
                      )}
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
