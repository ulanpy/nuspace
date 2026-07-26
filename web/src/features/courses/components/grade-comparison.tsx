import { XIcon } from "lucide-react"

import {
  MAX_GRADE_COMPARISONS,
  comparisonMetrics,
} from "@/features/courses/grade-comparison"
import type { GradeReport } from "@/features/courses/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

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
    <Card className="sticky top-2 z-20 space-y-3 bg-background/95 p-4 backdrop-blur">
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
                        className="px-3 py-2 tabular-nums"
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
                {metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="flex justify-between gap-3 py-0.5"
                  >
                    <dt className="text-muted-foreground">{metric.label}</dt>
                    <dd className="text-right tabular-nums">
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
