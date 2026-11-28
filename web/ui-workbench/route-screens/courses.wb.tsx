import { useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  ChevronDownIcon,
  ClipboardListIcon,
  DownloadIcon,
  LifeBuoyIcon,
  PencilIcon,
  PlusIcon,
  Share2Icon,
  TargetIcon,
  Trash2Icon,
  TrendingUpIcon,
} from "lucide-react"

import { CoursesShell } from "../components/courses-shell.wb"

import { Page } from "@/components/shared/page"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  ceilingGpa,
  courseScore,
  courseScoreCeiling,
  formatGpa,
  formatPoints,
  formatWeight,
  isGraded,
  projectedGpa,
  scoreToGpa,
  scoreToLetter,
  semesterGpa,
} from "@/lib/courses/gpa"

import {
  COURSES,
  type PrototypeCourse,
  type PrototypeItem,
} from "./courses.wb.demo"

const GPA_MAX = 4

const ACCENTS = [
  {
    words: ["computing", "data science", "software", "informatics"],
    border: "border-l-chart-3",
    chip: "bg-chart-3/15 text-chart-3",
  },
  {
    words: ["mathematics", "math"],
    border: "border-l-chart-2",
    chip: "bg-chart-2/15 text-chart-2",
  },
  {
    words: ["physics", "engineering", "digital"],
    border: "border-l-chart-5",
    chip: "bg-chart-5/15 text-chart-5",
  },
  {
    words: ["economics", "management", "business"],
    border: "border-l-chart-1",
    chip: "bg-chart-1/15 text-chart-1",
  },
  {
    words: ["chemistry", "science and technology"],
    border: "border-l-chart-4",
    chip: "bg-chart-4/15 text-chart-4",
  },
] as const

function accentFor(school: string) {
  const normalized = school.toLowerCase()
  const named = ACCENTS.find((accent) =>
    accent.words.some((word) => normalized.includes(word))
  )
  if (named) return named

  const hash = normalized.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0)
  return ACCENTS[hash % ACCENTS.length] ?? ACCENTS[0]
}

function toPercent(gpa: number) {
  return `${(Math.min(GPA_MAX, Math.max(0, gpa)) / GPA_MAX) * 100}%`
}

function nextUp(items: PrototypeItem[]): string {
  const pending = items.filter((item) => !isGraded(item))
  if (pending.length === 0) {
    return items.length === 0
      ? "Add assignments to track progress"
      : "All assignments graded"
  }
  return pending[0].item_name
}

export default function Courses() {
  const [courses, setCourses] = useState(COURSES)
  const [selectedId, setSelectedId] = useState(COURSES[0].id)
  const [excluded, setExcluded] = useState<ReadonlySet<number>>(new Set())
  const [editing, setEditing] = useState<{
    courseId: number
    itemId: number | "new"
  } | null>(null)
  const [deleting, setDeleting] = useState<{
    courseId: number
    itemId: number
  } | null>(null)

  const counted = courses.filter((course) => !excluded.has(course.id))
  const selected = courses.find((course) => course.id === selectedId) ?? null

  const save = (draft: Omit<PrototypeItem, "id" | "student_course_id">) => {
    if (!editing) return
    setCourses((previous) =>
      previous.map((course) => {
        if (course.id !== editing.courseId) return course
        if (editing.itemId === "new") {
          const id = Math.max(0, ...course.items.map((i) => i.id)) + 1
          return {
            ...course,
            items: [
              ...course.items,
              { ...draft, id, student_course_id: course.id },
            ],
          }
        }
        return {
          ...course,
          items: course.items.map((item) =>
            item.id === editing.itemId ? { ...item, ...draft } : item
          ),
        }
      })
    )
    setEditing(null)
  }

  const remove = (courseId: number, itemId: number) => {
    setCourses((previous) =>
      previous.map((course) =>
        course.id === courseId
          ? {
              ...course,
              items: course.items.filter((item) => item.id !== itemId),
            }
          : course
      )
    )
    setDeleting(null)
  }

  return (
    <CoursesShell activeId="my-courses">
      <Page title="My Courses">
        <div className="space-y-4">
          <GpaSummary
            current={semesterGpa(counted)}
            projected={projectedGpa(counted)}
            ceiling={ceilingGpa(counted)}
          />

          <div className="grid items-start gap-4 xl:grid-cols-[260px_minmax(0,1fr)_300px]">
            <section
              aria-label="Registered courses"
              className="order-2 min-w-0 xl:sticky xl:top-[4.5rem] xl:order-1"
            >
              <CourseList
                courses={courses}
                selectedId={selectedId}
                excluded={excluded}
                onSelect={setSelectedId}
              />
            </section>

            <section
              aria-label={`${selected?.course.course_code ?? "Course"} assignments`}
              className="order-1 min-w-0 xl:order-2"
            >
              {selected ? (
                <CourseDetail
                  registered={selected}
                  onEdit={(itemId) => {
                    setEditing({ courseId: selected.id, itemId })
                  }}
                  onDelete={(itemId) => {
                    setDeleting({ courseId: selected.id, itemId })
                  }}
                />
              ) : (
                <Card className="p-8 text-center">
                  <p className="text-sm font-medium">Select a course</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Pick a course on the left to manage assignments and grades.
                  </p>
                </Card>
              )}
            </section>

            <aside className="order-3 min-w-0 space-y-4 xl:sticky xl:top-[4.5rem]">
              {selected && (
                <CourseSummary
                  registered={selected}
                  isExcluded={excluded.has(selected.id)}
                  onToggleExcluded={() => {
                    setExcluded((previous) => {
                      const next = new Set(previous)
                      if (next.has(selected.id)) {
                        next.delete(selected.id)
                      } else {
                        next.add(selected.id)
                      }
                      return next
                    })
                  }}
                  onAdd={() => {
                    setEditing({ courseId: selected.id, itemId: "new" })
                  }}
                />
              )}
              <HelpCard />
            </aside>
          </div>
        </div>
      </Page>

      {editing && (
        <AssignmentDialog
          registered={
            courses.find((course) => course.id === editing.courseId) ?? null
          }
          item={
            editing.itemId === "new"
              ? undefined
              : (courses
                  .find((course) => course.id === editing.courseId)
                  ?.items.find((item) => item.id === editing.itemId) ??
                undefined)
          }
          onClose={() => {
            setEditing(null)
          }}
          onSave={save}
        />
      )}

      {deleting && (
        <ConfirmDelete
          name={
            courses
              .find((course) => course.id === deleting.courseId)
              ?.items.find((item) => item.id === deleting.itemId)?.item_name ??
            ""
          }
          onClose={() => {
            setDeleting(null)
          }}
          onConfirm={() => {
            remove(deleting.courseId, deleting.itemId)
          }}
        />
      )}
    </CoursesShell>
  )
}

function GpaSummary({
  current,
  projected,
  ceiling,
}: {
  current: number
  projected: number
  ceiling: number
}) {
  return (
    <Card className="gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
      <div className="flex shrink-0 items-baseline gap-2">
        <p className="text-3xl leading-none font-semibold tracking-tight tabular-nums">
          {formatGpa(current)}
        </p>
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          GPA
        </span>
      </div>

      <div className="min-w-0 flex-1 sm:min-w-[11rem]">
        <div
          aria-hidden
          className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary/25"
            style={{ width: toPercent(projected) }}
          />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary"
            style={{ width: toPercent(current) }}
          />
        </div>
        <div className="mt-1.5 flex w-full justify-between gap-4 text-xs text-muted-foreground tabular-nums">
          <span>0.0</span>
          <span>4.0</span>
        </div>
      </div>

      <dl className="flex shrink-0 items-stretch gap-5 sm:gap-6">
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
    <div className="min-w-[5.5rem]">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        <span>{label}</span>
      </div>
      <p className="mt-1 text-base leading-none font-semibold tabular-nums">
        {value}
      </p>
    </div>
  )
}

function CourseList({
  courses,
  selectedId,
  excluded,
  onSelect,
}: {
  courses: PrototypeCourse[]
  selectedId: number
  excluded: ReadonlySet<number>
  onSelect: (courseId: number) => void
}) {
  const excludedCount = courses.filter((course) =>
    excluded.has(course.id)
  ).length

  return (
    <Card size="sm" className="gap-3 p-3">
      <div className="flex items-center gap-2 px-0.5">
        <h2 className="text-sm font-semibold">Courses</h2>
        <Badge variant="secondary" className="tabular-nums">
          {courses.length}
        </Badge>
        {excludedCount > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            {excludedCount} excluded from GPA
          </span>
        )}
      </div>

      <div className="space-y-1">
        {courses.map((registered) => {
          const accent = accentFor(registered.course.school)
          const pending = registered.items.filter(
            (item) => !isGraded(item)
          ).length
          const isActive = registered.id === selectedId
          const isExcluded = excluded.has(registered.id)

          return (
            <button
              key={registered.id}
              type="button"
              onClick={() => {
                onSelect(registered.id)
              }}
              aria-pressed={isActive}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl border border-l-[3px] px-2.5 py-2 text-left transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                isActive
                  ? cn("bg-muted/50", accent.border)
                  : "border-l-transparent bg-card hover:bg-muted/40"
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold",
                  accent.chip
                )}
              >
                {registered.course.course_code.slice(0, 2)}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] leading-none font-semibold">
                    {registered.course.course_code}
                  </span>
                  {pending > 0 && (
                    <span
                      className="size-1.5 shrink-0 rounded-full bg-warning"
                      title={`${pending} pending`}
                      aria-label={`${pending} pending assignments`}
                    />
                  )}
                  {isExcluded && (
                    <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                      Excluded
                    </span>
                  )}
                </span>
                <span className="mt-1 block truncate text-[12px] leading-none text-muted-foreground">
                  {registered.course.title ??
                    registered.course.school ??
                    "Course"}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

function CourseDetail({
  registered,
  onEdit,
  onDelete,
}: {
  registered: PrototypeCourse
  onEdit: (itemId: number | "new") => void
  onDelete: (itemId: number) => void
}) {
  const { course, items } = registered
  const accent = accentFor(course.school)
  const score = courseScore(items)
  const gpa = scoreToGpa(score)
  const ceiling = scoreToGpa(courseScoreCeiling(items))

  return (
    <Card className="@container gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold",
              accent.chip
            )}
          >
            {course.course_code.slice(0, 2)}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg leading-tight font-semibold">
              {course.course_code}
            </h2>
            {course.title && (
              <p className="truncate text-[13px] text-muted-foreground">
                {course.title}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Grade</p>
            <p className="text-base font-semibold">{scoreToLetter(score)}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">GPA</p>
            <p className="text-base font-semibold tabular-nums">
              {formatGpa(gpa)}
            </p>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-3 py-2">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ClipboardListIcon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium">No assignments yet</p>
            <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
              Use the controls in Course summary to add assignments or manage
              grading setup.
            </p>
          </div>
        </div>
      ) : (
        <>
          <Table className="text-[13px] text-muted-foreground">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-auto pr-3 pb-2 text-muted-foreground">
                  Assignment
                </TableHead>
                <TableHead className="h-auto pr-3 pb-2 text-right text-muted-foreground tabular-nums">
                  Weight
                </TableHead>
                <TableHead className="h-auto pr-3 pb-2 text-right text-muted-foreground tabular-nums">
                  Score
                </TableHead>
                <TableHead className="h-auto pr-3 pb-2 text-right text-muted-foreground tabular-nums">
                  Contribution
                </TableHead>
                <TableHead className="h-auto pr-3 pb-2 text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="h-auto w-16 pb-2" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const done = isGraded(item)
                const contribution = done
                  ? (item.obtained_score / item.max_score) *
                    (item.total_weight_pct ?? 0)
                  : null

                return (
                  <TableRow key={item.id}>
                    <TableCell className="min-w-32 py-2 pr-3 font-medium whitespace-normal text-foreground">
                      {item.item_name}
                    </TableCell>
                    <TableCell className="py-2 pr-3 text-right tabular-nums">
                      {item.total_weight_pct === null
                        ? "—"
                        : formatWeight(item.total_weight_pct)}
                    </TableCell>
                    <TableCell className="py-2 pr-3 text-right tabular-nums">
                      {done
                        ? `${formatPoints(item.obtained_score)} / ${formatPoints(item.max_score)}`
                        : "—"}
                    </TableCell>
                    <TableCell className="py-2 pr-3 text-right tabular-nums">
                      {contribution === null ? "—" : formatWeight(contribution)}
                    </TableCell>
                    <TableCell className="py-2 pr-3">
                      <span
                        className={cn(
                          "text-[12px] font-medium",
                          done ? "text-success" : "text-warning"
                        )}
                      >
                        {done ? "Completed" : "Pending"}
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${item.item_name}`}
                          onClick={() => {
                            onEdit(item.id)
                          }}
                        >
                          <PencilIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive"
                          aria-label={`Delete ${item.item_name}`}
                          onClick={() => {
                            onDelete(item.id)
                          }}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          <GradeBreakdown items={items} />

          <div className="grid grid-cols-2 gap-4 @md:grid-cols-4">
            <Stat label="Current Score" value={formatWeight(score)} />
            {registered.class_average !== null && (
              <Stat
                label="Class avg"
                value={formatWeight(registered.class_average)}
              />
            )}
            <Stat label="Current GPA" value={formatGpa(gpa)} />
            <Stat label="Maximum Possible" value={formatGpa(ceiling)} />
          </div>
        </>
      )}
    </Card>
  )
}

function GradeBreakdown({ items }: { items: PrototypeItem[] }) {
  const totalWeight = items.reduce(
    (sum, item) => sum + (item.total_weight_pct ?? 0),
    0
  )
  const scale = Math.max(100, totalWeight)

  const scoredWeight = items
    .filter((item) => isGraded(item))
    .reduce((sum, item) => sum + (item.total_weight_pct ?? 0), 0)
  const pending = items
    .filter((item) => !isGraded(item))
    .reduce((sum, item) => sum + (item.total_weight_pct ?? 0), 0)
  const earned = courseScore(items)

  const segments = [
    {
      label: `Earned ${formatWeight(earned)}`,
      value: earned,
      tone: "bg-success",
    },
    {
      label: "Below max",
      value: Math.max(0, scoredWeight - earned),
      tone: "bg-muted-foreground",
    },
    { label: "Pending scores", value: pending, tone: "bg-warning" },
    {
      label: "Unassigned weight",
      value: Math.max(0, 100 - totalWeight),
      tone: "bg-foreground/35",
    },
  ].filter((segment) => segment.value > 0.05)

  return (
    <div className="space-y-2">
      <p className="text-[13px] font-medium text-muted-foreground">
        Grade breakdown
      </p>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
        {segments.map((segment) => (
          <div
            key={segment.label}
            title={segment.label}
            className={segment.tone}
            style={{ width: `${(segment.value / scale) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-[12px] text-muted-foreground">
        {segments.map((segment) => (
          <span
            key={segment.label}
            className="inline-flex items-center gap-1.5"
          >
            <span className={cn("size-1.5 rounded-full", segment.tone)} />
            {segment.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function CourseSummary({
  registered,
  isExcluded,
  onToggleExcluded,
  onAdd,
}: {
  registered: PrototypeCourse
  isExcluded: boolean
  onToggleExcluded: () => void
  onAdd: () => void
}) {
  const { course, items } = registered
  const earned = courseScore(items)
  const pending = items.filter((item) => !isGraded(item)).length
  const totalWeight = items.reduce(
    (sum, item) => sum + (item.total_weight_pct ?? 0),
    0
  )
  const barPercent = Math.min(100, (earned / Math.max(100, totalWeight)) * 100)

  const rows = [
    { label: "Term", value: course.term || "—" },
    { label: "School", value: course.school || "—" },
    { label: "Professor", value: registered.professor || "Not in schedule" },
    { label: "ECTS", value: course.credits ? String(course.credits) : "—" },
    {
      label: "Assignments",
      value:
        pending > 0
          ? `${items.length} (${pending} pending)`
          : String(items.length),
    },
    { label: "Next up", value: nextUp(items) },
  ]

  return (
    <Card size="sm" className="gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          Course summary
        </h2>
        {isExcluded && (
          <span className="text-[11px] font-medium text-muted-foreground">
            Excluded from GPA
          </span>
        )}
      </div>

      <dl className="space-y-2.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-start justify-between gap-3"
          >
            <dt className="text-[13px] text-muted-foreground">{row.label}</dt>
            <dd className="max-w-[58%] text-right text-[13px] font-medium">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex items-center justify-between gap-3">
        <Label
          htmlFor="gpa-exclusion"
          className="text-[13px] font-normal text-muted-foreground"
        >
          Include in overall GPA
        </Label>
        <Switch
          id="gpa-exclusion"
          size="sm"
          checked={!isExcluded}
          onCheckedChange={onToggleExcluded}
          aria-label="Include course in overall GPA"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-muted-foreground">Earned grade</span>
          <span className="font-medium text-success tabular-nums">
            {formatWeight(earned)}
          </span>
        </div>
        <Progress
          value={barPercent}
          className="[&_[data-slot=progress-indicator]]:bg-success"
        />
      </div>

      <div className="space-y-2 border-t border-border pt-4">
        <Button size="sm" className="w-full" onClick={onAdd}>
          <PlusIcon aria-hidden />
          Add assignment
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm" className="w-full">
                Grading setup
                <ChevronDownIcon aria-hidden />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>
              <DownloadIcon aria-hidden />
              Import from classmate
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Share2Icon aria-hidden />
              Share with classmates
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  )
}

function HelpCard() {
  return (
    <Card size="sm" className="gap-2 p-4">
      <div className="flex items-center gap-2">
        <LifeBuoyIcon className="size-4 text-muted-foreground" aria-hidden />
        <h2 className="text-[13px] font-medium">Need help?</h2>
      </div>
      <a
        href="https://t.me/kamikadze24"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:underline"
      >
        Contact Support
      </a>
    </Card>
  )
}

function AssignmentDialog({
  registered,
  item,
  onClose,
  onSave,
}: {
  registered: PrototypeCourse | null
  item: PrototypeItem | undefined
  onClose: () => void
  onSave: (draft: Omit<PrototypeItem, "id" | "student_course_id">) => void
}) {
  const [name, setName] = useState(item?.item_name ?? "")
  const [weight, setWeight] = useState(item?.total_weight_pct?.toString() ?? "")
  const [score, setScore] = useState(item?.obtained_score?.toString() ?? "")
  const [outOf, setOutOf] = useState(item?.max_score?.toString() ?? "")

  const number = (value: string) => (value.trim() === "" ? null : Number(value))

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {item ? "Edit assignment" : "Add assignment"}
          </DialogTitle>
          <DialogDescription>
            {registered?.course.course_code} · scores can stay blank until the
            work is graded.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            onSave({
              item_name: name,
              total_weight_pct: number(weight),
              obtained_score: number(score),
              max_score: number(outOf),
            })
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="item_name">Name</Label>
            <Input
              id="item_name"
              value={name}
              placeholder="Midterm"
              onChange={(event) => {
                setName(event.target.value)
              }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="weight">Weight %</Label>
              <Input
                id="weight"
                inputMode="decimal"
                placeholder="25"
                value={weight}
                onChange={(event) => {
                  setWeight(event.target.value)
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="score">Score</Label>
              <Input
                id="score"
                inputMode="decimal"
                placeholder="—"
                value={score}
                onChange={(event) => {
                  setScore(event.target.value)
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="out-of">Out of</Label>
              <Input
                id="out-of"
                inputMode="decimal"
                placeholder="100"
                value={outOf}
                onChange={(event) => {
                  setOutOf(event.target.value)
                }}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Leave the score blank until the work is graded — a blank is not a
            zero.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm">
              Save
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ConfirmDelete({
  name,
  onClose,
  onConfirm,
}: {
  name: string
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete assignment</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{name}&quot;? This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
