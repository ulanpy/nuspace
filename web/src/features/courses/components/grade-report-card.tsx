import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { formatGpa, formatPoints } from "../gpa"
import type { GradeReport } from "../types"

/**
 * The distribution bands, in the order they stack.
 *
 * A/B/C/D/F are the graded outcomes; P (pass), I (incomplete), AU (audit) and
 * W/AW (withdrawn) are not grades at all but do account for enrolled students,
 * so leaving them out would make the bar not add up.
 */
const BANDS = [
  { key: "pct_A", label: "A", className: "bg-chart-2" },
  { key: "pct_B", label: "B", className: "bg-chart-1" },
  { key: "pct_C", label: "C", className: "bg-chart-4" },
  { key: "pct_D", label: "D", className: "bg-chart-5" },
  { key: "pct_F", label: "F", className: "bg-destructive" },
  { key: "pct_P", label: "P", className: "bg-chart-3" },
  { key: "pct_I", label: "I", className: "bg-muted-foreground/40" },
  { key: "pct_AU", label: "AU", className: "bg-muted-foreground/30" },
  { key: "pct_W_AW", label: "W", className: "bg-muted-foreground/20" },
] as const satisfies readonly {
  key: keyof GradeReport
  label: string
  className: string
}[]

interface Band {
  label: string
  className: string
  pct: number
}

function bands(report: GradeReport): Band[] {
  return BANDS.flatMap(({ key, label, className }) => {
    const pct = report[key]
    return typeof pct === "number" && pct > 0 ? [{ label, className, pct }] : []
  })
}

/**
 * The distribution as one stacked bar.
 *
 * Described in text beside it rather than through the bar itself — the
 * segments are the same information as the legend below, and announcing both
 * would read every percentage twice.
 */
function DistributionBar({ report }: { report: GradeReport }) {
  const segments = bands(report)
  if (segments.length === 0) return null

  return (
    <div className="space-y-1.5">
      <div
        className="flex h-2 overflow-hidden rounded-full bg-muted"
        aria-hidden
      >
        {segments.map(({ label, className, pct }) => (
          <div
            key={label}
            className={className}
            style={{ width: `${String(pct)}%` }}
          />
        ))}
      </div>

      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {segments.map(({ label, className, pct }) => (
          <li key={label} className="flex items-center gap-1">
            <span
              className={cn("size-2 shrink-0 rounded-full", className)}
              aria-hidden
            />
            <span className="tabular-nums">
              {label} {formatPoints(pct)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function GradeReportCard({
  report,
  selected = false,
  compareDisabled = false,
  onToggleCompare,
}: {
  report: GradeReport
  selected?: boolean
  compareDisabled?: boolean
  onToggleCompare?: () => void
}) {
  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h3 className="font-semibold">
            {report.course_code}
            {report.section && (
              <span className="font-normal text-muted-foreground">
                {" "}
                · {report.section}
              </span>
            )}
          </h3>
          {report.course_title && (
            <p className="text-sm text-muted-foreground">
              {report.course_title}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {[
              report.faculty,
              report.term,
              report.grades_count === null
                ? null
                : `${String(report.grades_count)} students`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        <dl className="flex shrink-0 gap-4 text-right">
          <div>
            <dt className="text-xs text-muted-foreground">Average</dt>
            <dd className="text-lg font-semibold tabular-nums">
              {formatGpa(report.avg_gpa)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Median</dt>
            <dd className="text-lg font-semibold tabular-nums">
              {formatGpa(report.median_gpa)}
            </dd>
          </div>
          <div>
            {/* Spread matters as much as the average: a 3.0 mean with a 0.2
                deviation is a very different course from one with 0.9. */}
            <dt className="text-xs text-muted-foreground">Spread</dt>
            <dd className="text-lg font-semibold tabular-nums">
              {report.std_dev === null ? "—" : `±${formatGpa(report.std_dev)}`}
            </dd>
          </div>
        </dl>
        {onToggleCompare && (
          <Button
            size="sm"
            variant={selected ? "default" : "outline"}
            aria-pressed={selected}
            disabled={compareDisabled && !selected}
            onClick={onToggleCompare}
          >
            {selected ? "Selected" : "Compare"}
          </Button>
        )}
      </div>

      <DistributionBar report={report} />
    </Card>
  )
}
