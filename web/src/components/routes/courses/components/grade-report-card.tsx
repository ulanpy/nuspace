import { useState } from "react"
import {
  AlertTriangleIcon,
  CheckIcon,
  GitCompareArrowsIcon,
  PieChartIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { difficultyLabel } from "@/lib/courses/comparison"
import { gradeBands } from "@/lib/courses/grades"
import type { GradeBandKey } from "@/lib/courses/grades"
import { formatGpa, formatPoints } from "@/lib/courses/gpa"
import type { GradeReport } from "@/lib/courses"

const DIFFICULTY_TONE: Record<string, string> = {
  Easy: "text-success",
  Moderate: "text-primary",
  Hard: "text-warning",
  "Very Hard": "text-destructive",
}

/** The graded outcomes are coloured; the rest are neutral. */
const BAND_TONE: Record<GradeBandKey, string> = {
  pct_A: "bg-success",
  pct_B: "bg-primary",
  pct_C: "bg-warning",
  pct_D: "bg-destructive/60",
  pct_F: "bg-destructive",
  pct_P: "bg-chart-3",
  pct_I: "bg-muted-foreground/40",
  pct_AU: "bg-muted-foreground/30",
  pct_W_AW: "bg-muted-foreground/20",
}

/**
 * The distribution as one stacked bar.
 *
 * Decorative: the same numbers are in the breakdown below it, so announcing
 * both would read every percentage twice.
 */
function DistributionBar({ report }: { report: GradeReport }) {
  const bands = gradeBands(report)
  const total = bands.reduce((sum, band) => sum + band.pct, 0)
  if (total <= 0) return null

  return (
    <div
      className="flex h-2 w-24 overflow-hidden rounded-full bg-muted sm:w-40"
      aria-hidden
    >
      {bands.map((band) => (
        <div
          key={band.key}
          className={BAND_TONE[band.key]}
          style={{ width: `${String((band.pct / total) * 100)}%` }}
        />
      ))}
    </div>
  )
}

function Breakdown({ report }: { report: GradeReport }) {
  const bands = gradeBands(report)

  if (bands.length === 0) {
    return (
      <p className="border-t border-border pt-4 text-[13px] text-muted-foreground">
        No grade distribution was published for this section.
      </p>
    )
  }

  return (
    <ul className="space-y-2 border-t border-border pt-4">
      {bands.map((band) => (
        <li key={band.key} className="flex items-center gap-3 text-[13px]">
          <span
            className={cn("size-2 shrink-0 rounded-full", BAND_TONE[band.key])}
            aria-hidden
          />
          <span className="w-5 font-medium">{band.label}</span>
          <span className="w-16 text-muted-foreground tabular-nums">
            {formatPoints(band.pct)}%
          </span>
          {band.students !== null && (
            <span className="text-muted-foreground tabular-nums">
              {band.students} {band.students === 1 ? "student" : "students"}
            </span>
          )}
        </li>
      ))}
    </ul>
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
  const [showBreakdown, setShowBreakdown] = useState(false)
  const level = difficultyLabel(report.avg_gpa, report.std_dev)
  const withdrew = report.pct_W_AW

  return (
    <Card
      className={cn(
        "h-full transition-shadow duration-300 hover:shadow-lg",
        selected && "border-primary/40 ring-2 ring-primary/50"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-bold">
                {report.course_code}
              </h3>
              {report.section && (
                <Badge variant="outline" className="shrink-0 text-[11px]">
                  {report.section}
                </Badge>
              )}
              {report.term && (
                <Badge variant="secondary" className="shrink-0 text-[11px]">
                  {report.term}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={cn(
                  "shrink-0 text-[11px]",
                  DIFFICULTY_TONE[level] ?? "text-muted-foreground"
                )}
              >
                {level}
              </Badge>
            </div>
            {report.course_title && (
              <p className="mt-0.5 line-clamp-1 text-sm font-medium">
                {report.course_title}
              </p>
            )}
            <p className="mt-1.5 text-sm text-muted-foreground">
              <UsersIcon
                className="mr-1 inline size-3.5 align-text-bottom"
                aria-hidden
              />
              {report.faculty && (
                <span className="font-medium text-foreground">
                  {report.faculty}
                  {report.grades_count !== null && " · "}
                </span>
              )}
              {report.grades_count !== null &&
                `based on ${String(report.grades_count)} students`}
            </p>
          </div>

          {onToggleCompare && (
            <Button
              type="button"
              size="sm"
              variant={selected ? "default" : "outline"}
              className="h-7 shrink-0 gap-1 rounded-md px-2.5 text-[11px] font-medium"
              disabled={compareDisabled && !selected}
              aria-pressed={selected}
              onClick={onToggleCompare}
            >
              {selected ? (
                <>
                  <CheckIcon className="size-3" aria-hidden />
                  Selected
                </>
              ) : (
                <>
                  <GitCompareArrowsIcon className="size-3" aria-hidden />
                  Compare
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[1.75rem] leading-none font-bold tracking-tight tabular-nums">
              {formatGpa(report.avg_gpa)}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              GPA
            </span>
          </div>

          <div className="h-6 w-px bg-border" aria-hidden />

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <TrendingUpIcon className="size-3.5" aria-hidden />
            <span>
              Median{" "}
              <strong className="text-foreground tabular-nums">
                {formatGpa(report.median_gpa)}
              </strong>
            </span>
          </div>

          {report.std_dev !== null && (
            <div className="text-sm text-muted-foreground">
              ±
              <strong className="text-foreground tabular-nums">
                {formatGpa(report.std_dev)}
              </strong>{" "}
              std dev
            </div>
          )}

          {withdrew === null ? (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <AlertTriangleIcon className="size-3.5" aria-hidden />
              Withdrawal data not reported
            </div>
          ) : (
            <div
              className={cn(
                "flex items-center gap-1.5 text-sm",
                withdrew > 5 ? "text-destructive" : "text-muted-foreground"
              )}
            >
              <AlertTriangleIcon className="size-3.5" aria-hidden />
              <span>
                <strong className="tabular-nums">
                  {formatPoints(withdrew)}%
                </strong>{" "}
                withdrew
              </span>
            </div>
          )}

          <button
            type="button"
            aria-expanded={showBreakdown}
            onClick={() => {
              setShowBreakdown(!showBreakdown)
            }}
            className="ml-auto flex shrink-0 items-center gap-1.5 rounded-md py-1 pr-1.5 pl-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label={
              showBreakdown
                ? "Hide grade distribution breakdown"
                : "Show grade distribution breakdown"
            }
          >
            <DistributionBar report={report} />
            <span className="text-[11px] font-medium underline decoration-dotted underline-offset-2">
              {showBreakdown ? "Hide" : "Breakdown"}
            </span>
            <PieChartIcon className="size-3.5" aria-hidden />
          </button>
        </div>

        {showBreakdown && <Breakdown report={report} />}
      </CardContent>
    </Card>
  )
}
