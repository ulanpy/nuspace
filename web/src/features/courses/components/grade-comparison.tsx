import { XIcon } from "lucide-react"

import {
  MAX_GRADE_COMPARISONS,
  comparisonMetrics,
} from "@/features/courses/grade-comparison"
import type { GradeReport } from "@/features/courses/types"
import { formatPoints } from "@/features/courses/gpa"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const MINI_BANDS = [
  { key: "pct_A", label: "A", className: "bg-chart-2" },
  { key: "pct_B", label: "B", className: "bg-chart-1" },
  { key: "pct_C", label: "C", className: "bg-chart-4" },
  { key: "pct_D", label: "D", className: "bg-chart-5" },
  { key: "pct_F", label: "F", className: "bg-destructive" },
  { key: "pct_W_AW", label: "withdrawn", className: "bg-muted-foreground/30" },
] as const satisfies readonly {
  key: keyof GradeReport
  label: string
  className: string
}[]

function MiniDistribution({ report }: { report: GradeReport }) {
  const summary = MINI_BANDS.flatMap(({ key, label }) => {
    const value = report[key]
    return typeof value === "number" && value > 0
      ? [`${label} ${formatPoints(value)}%`]
      : []
  }).join(", ")

  return (
    <div className="mt-2">
      <span className="sr-only">
        Grade distribution: {summary || "not available"}.
      </span>
      <span
        aria-hidden
        className="flex h-1.5 overflow-hidden rounded-full bg-muted"
      >
        {MINI_BANDS.map(({ key, className }) => {
          const value = report[key]
          return typeof value === "number" && value > 0 ? (
            <span
              key={key}
              className={className}
              style={{ width: `${String(value)}%` }}
            />
          ) : null
        })}
      </span>
    </div>
  )
}

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
  const metrics = comparisonMetrics(selected)

  return (
    <Card className="sticky top-16 z-20 space-y-3 bg-background/95 p-4 backdrop-blur md:top-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">
          Compare {selected.length}/{MAX_GRADE_COMPARISONS}
        </p>
        <Button size="sm" variant="ghost" onClick={onClear}>
          Clear
        </Button>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {selected.map((report) => (
          <Button
            key={report.id}
            size="sm"
            variant="outline"
            onClick={() => {
              onRemove(report.id)
            }}
          >
            {report.course_code} {report.section}
            <XIcon aria-hidden />
          </Button>
        ))}
      </div>

      {selected.length > 1 && (
        <>
          <div className="hidden overflow-x-auto rounded-md border sm:block">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-3 py-2 text-left">Metric</th>
                  {selected.map((report) => (
                    <th
                      key={report.id}
                      className="px-3 py-2 text-left whitespace-nowrap"
                    >
                      {report.course_code} {report.section}
                      <MiniDistribution report={report} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric) => (
                  <tr key={metric.label} className="border-t">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      {metric.label}
                    </th>
                    {metric.values.map((value, index) => (
                      <td
                        key={`${metric.label}-${selected[index]?.id ?? index}`}
                        className={cn(
                          "px-3 py-2 tabular-nums",
                          metric.bestIndexes?.includes(index) &&
                            "bg-primary/10 font-semibold text-primary"
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
          <div className="space-y-2 sm:hidden">
            {selected.map((report, index) => (
              <dl key={report.id} className="rounded-md border p-3 text-sm">
                <div className="mb-2 font-semibold">
                  {report.course_code} {report.section}
                  <MiniDistribution report={report} />
                </div>
                {metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="flex justify-between gap-3 py-0.5"
                  >
                    <dt className="text-muted-foreground">{metric.label}</dt>
                    <dd
                      className={cn(
                        "text-right tabular-nums",
                        metric.bestIndexes?.includes(index) &&
                          "font-semibold text-primary"
                      )}
                    >
                      {metric.values[index]}
                    </dd>
                  </div>
                ))}
              </dl>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}
