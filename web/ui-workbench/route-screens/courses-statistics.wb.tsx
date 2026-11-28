import { useState } from "react"
import {
  AlertTriangleIcon,
  CheckIcon,
  GitCompareArrowsIcon,
  PieChartIcon,
  Trash2Icon,
  TrendingUpIcon,
  UsersIcon,
  XIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import { CoursesShell } from "../components/courses-shell.wb"

import { Page } from "@/components/shared/page"

import {
  REPORTS,
  TERMS,
  type PrototypeGradeReport,
} from "./courses-statistics.wb.demo"

const MAX_SELECTIONS = 4

/** The old scale, which read the spread as well as the average. */
function difficulty(avg: number, std: number | null): string {
  if (avg >= 3.5 && (std ?? 0) <= 0.5) return "Easy"
  if (avg >= 3) return "Moderate"
  if (avg >= 2.5) return "Hard"
  return "Very Hard"
}

const DIFFICULTY_TONE: Record<string, string> = {
  Easy: "text-success",
  Moderate: "text-primary",
  Hard: "text-warning",
  "Very Hard": "text-destructive",
}

const BANDS = [
  { grade: "A", key: "pct_A", tone: "bg-success" },
  { grade: "B", key: "pct_B", tone: "bg-primary" },
  { grade: "C", key: "pct_C", tone: "bg-warning" },
  { grade: "D", key: "pct_D", tone: "bg-destructive/60" },
  { grade: "F", key: "pct_F", tone: "bg-destructive" },
] as const

function bandPct(
  report: PrototypeGradeReport,
  band: (typeof BANDS)[number]
): number {
  const value = report[band.key]
  return typeof value === "number" ? value : 0
}

function percent(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}%`
}

function DistributionBar({ report }: { report: PrototypeGradeReport }) {
  const total = BANDS.reduce((sum, band) => sum + bandPct(report, band), 0)
  if (total <= 0) return null

  return (
    <div className="relative h-2 w-40 overflow-hidden rounded-full bg-muted">
      {BANDS.map((band, index) => {
        const pct = bandPct(report, band)
        if (pct <= 0) return null
        const before = BANDS.slice(0, index).reduce(
          (sum, earlier) => sum + bandPct(report, earlier),
          0
        )
        return (
          <div
            key={band.grade}
            className={cn("absolute inset-y-0", band.tone)}
            style={{
              left: `${(before / total) * 100}%`,
              width: `${(pct / total) * 100}%`,
            }}
          />
        )
      })}
    </div>
  )
}

function GradeReportCard({
  report,
  selected,
  compareDisabled,
  onToggleCompare,
}: {
  report: PrototypeGradeReport
  selected: boolean
  compareDisabled: boolean
  onToggleCompare: () => void
}) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  const level = difficulty(report.avg_gpa, report.std_dev)

  return (
    <Card
      className={cn(
        "transition-shadow duration-300 hover:shadow-lg",
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
              <Badge variant="outline" className="shrink-0 text-[11px]">
                {report.section}
              </Badge>
              <Badge variant="secondary" className="shrink-0 text-[11px]">
                {report.term}
              </Badge>
              <Badge
                variant="outline"
                className={cn("shrink-0 text-[11px]", DIFFICULTY_TONE[level])}
              >
                {level}
              </Badge>
            </div>
            <p className="mt-0.5 line-clamp-1 text-sm font-medium">
              {report.course_title}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              <UsersIcon
                className="mr-1 inline size-3.5 align-text-bottom"
                aria-hidden
              />
              <span className="font-medium text-foreground">
                {report.faculty} ·{" "}
              </span>
              based on {report.grades_count} students
            </p>
          </div>

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
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[1.75rem] leading-none font-bold tracking-tight tabular-nums">
              {report.avg_gpa.toFixed(2)}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              GPA
            </span>
          </div>

          <div className="h-6 w-px bg-border" />

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <TrendingUpIcon className="size-3.5" aria-hidden />
            <span>
              Median{" "}
              <strong className="text-foreground tabular-nums">
                {report.median_gpa.toFixed(2)}
              </strong>
            </span>
          </div>

          {report.std_dev !== null && (
            <div className="text-sm text-muted-foreground">
              ±
              <strong className="text-foreground tabular-nums">
                {report.std_dev.toFixed(2)}
              </strong>{" "}
              std dev
            </div>
          )}

          {report.pct_W_AW === null ? (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <AlertTriangleIcon className="size-3.5" aria-hidden />
              Withdrawal data not reported
            </div>
          ) : (
            <div
              className={cn(
                "flex items-center gap-1.5 text-sm",
                report.pct_W_AW > 5
                  ? "text-destructive"
                  : "text-muted-foreground"
              )}
            >
              <AlertTriangleIcon className="size-3.5" aria-hidden />
              <span>
                <strong className="tabular-nums">
                  {percent(report.pct_W_AW)}
                </strong>{" "}
                withdrew
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setShowBreakdown(!showBreakdown)
            }}
            className="group ml-auto flex shrink-0 items-center gap-1.5 rounded-md py-1 pr-1.5 pl-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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

        {showBreakdown && (
          <div className="space-y-2 border-t border-border pt-4">
            {BANDS.map((band) => {
              const pct = bandPct(report, band)
              if (pct <= 0) return null
              const count = Math.round((pct / 100) * report.grades_count)
              return (
                <div
                  key={band.grade}
                  className="flex items-center gap-3 text-[13px]"
                >
                  <span
                    className={cn("size-2 shrink-0 rounded-full", band.tone)}
                    aria-hidden
                  />
                  <span className="w-4 font-medium">{band.grade}</span>
                  <span className="w-16 text-muted-foreground tabular-nums">
                    {percent(pct)}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {count} students
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CompareTray({
  selected,
  onRemove,
  onClear,
}: {
  selected: PrototypeGradeReport[]
  onRemove: (id: number) => void
  onClear: () => void
}) {
  if (selected.length === 0) return null

  const rows = [
    {
      label: "Avg GPA",
      value: (r: PrototypeGradeReport) => r.avg_gpa.toFixed(2),
    },
    {
      label: "Difficulty",
      value: (r: PrototypeGradeReport) => difficulty(r.avg_gpa, r.std_dev),
    },
    {
      label: "Withdrawal",
      value: (r: PrototypeGradeReport) => percent(r.pct_W_AW),
    },
    {
      label: "Median",
      value: (r: PrototypeGradeReport) => r.median_gpa.toFixed(2),
    },
    {
      label: "Std Dev",
      value: (r: PrototypeGradeReport) =>
        r.std_dev === null ? "—" : `±${r.std_dev.toFixed(2)}`,
    },
    {
      label: "Students",
      value: (r: PrototypeGradeReport) => String(r.grades_count),
    },
  ]

  const bestGpa = Math.max(...selected.map((report) => report.avg_gpa))
  const lowestWithdrawal = Math.min(
    ...selected.map((report) => report.pct_W_AW ?? Number.POSITIVE_INFINITY)
  )

  return (
    <div className="sticky top-16 z-20 mb-4 border-b border-border bg-background/95 pt-1 pb-3 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="text-sm font-medium">
            Compare{" "}
            <span className="text-muted-foreground tabular-nums">
              {selected.length}/{MAX_SELECTIONS}
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
            className="inline-flex max-w-[220px] shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-left text-[12px] transition-colors hover:bg-muted"
            title="Remove from compare"
          >
            <span className="min-w-0 truncate font-medium">
              {report.course_code} {report.section} · {report.term}
            </span>
            <XIcon
              className="size-3 shrink-0 text-muted-foreground"
              aria-hidden
            />
          </button>
        ))}
      </div>

      {selected.length >= 2 && (
        <div className="mt-3 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[520px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="sticky left-0 z-10 bg-muted/40 px-3 py-2 text-left font-medium text-muted-foreground">
                  Metric
                </th>
                {selected.map((report) => (
                  <th
                    key={report.id}
                    className="px-3 py-2 font-semibold whitespace-nowrap"
                  >
                    {report.course_code}
                    <span className="ml-1 font-normal text-muted-foreground">
                      {report.section}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-border last:border-0"
                >
                  <th className="sticky left-0 z-10 bg-background px-3 py-2 text-left font-medium whitespace-nowrap text-muted-foreground">
                    {row.label}
                  </th>
                  {selected.map((report) => {
                    const best =
                      (row.label === "Avg GPA" && report.avg_gpa === bestGpa) ||
                      (row.label === "Withdrawal" &&
                        report.pct_W_AW === lowestWithdrawal)
                    return (
                      <td
                        key={report.id}
                        className={cn(
                          "px-3 py-2 tabular-nums",
                          best &&
                            "rounded-md bg-success/15 font-semibold text-success"
                        )}
                      >
                        {row.value(report)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function CoursesStatistics() {
  const [selected, setSelected] = useState<PrototypeGradeReport[]>([
    REPORTS[0],
    REPORTS[2],
  ])
  const [query, setQuery] = useState("")
  const [term, setTerm] = useState<string | null>(null)

  const visible = REPORTS.filter((report) => {
    if (term && report.term !== term) return false
    if (!query) return true
    const needle = query.toLowerCase()
    return (
      report.course_code.toLowerCase().includes(needle) ||
      report.course_title.toLowerCase().includes(needle) ||
      report.faculty.toLowerCase().includes(needle)
    )
  })

  return (
    <CoursesShell activeId="statistics">
      <Page title="Statistics">
        <div className="space-y-4">
          <CompareTray
            selected={selected}
            onRemove={(id) => {
              setSelected((previous) =>
                previous.filter((report) => report.id !== id)
              )
            }}
            onClear={() => {
              setSelected([])
            }}
          />

          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[16rem] flex-1">
              <label htmlFor="grade-search" className="sr-only">
                Search past grade statistics
              </label>
              <Input
                id="grade-search"
                value={query}
                placeholder="Search courses"
                onChange={(event) => {
                  setQuery(event.target.value)
                }}
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className="gap-1.5">
                    {term ?? "All terms"}
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setTerm(null)
                  }}
                >
                  All terms
                </DropdownMenuItem>
                {TERMS.map((option) => (
                  <DropdownMenuItem
                    key={option}
                    onClick={() => {
                      setTerm(option)
                    }}
                  >
                    {option}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {visible.map((report) => (
              <GradeReportCard
                key={report.id}
                report={report}
                selected={selected.some((item) => item.id === report.id)}
                compareDisabled={selected.length >= MAX_SELECTIONS}
                onToggleCompare={() => {
                  setSelected((previous) =>
                    previous.some((item) => item.id === report.id)
                      ? previous.filter((item) => item.id !== report.id)
                      : [...previous, report]
                  )
                }}
              />
            ))}
          </div>
        </div>
      </Page>
    </CoursesShell>
  )
}
