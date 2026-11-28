import { useState } from "react"
import {
  ChevronDownIcon,
  ClipboardCopyIcon,
  CropIcon,
  InfoIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

import type { PlannerCourse } from "@/lib/courses/planner"
import { WeeklyGrid } from "@/components/routes/courses/planner/components/weekly-grid"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

import { CoursesShell } from "../components/courses-shell.wb"

import { Page } from "@/components/shared/page"

import { PLANS, PLANNER, SEARCH_RESULTS } from "./courses-schedule.wb.demo"

function selectedEvents(courses: PlannerCourse[]) {
  return courses.flatMap((course) =>
    course.sections
      .filter((section) => section.is_selected)
      .map((section) => ({ course, section }))
  )
}

function ShortlistCard({
  course,
  isActive,
  onSelect,
  onRemove,
}: {
  course: PlannerCourse
  isActive: boolean
  onSelect: () => void
  onRemove: () => void
}) {
  const meta = [course.school, course.term_label, course.level].filter(Boolean)

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition focus-within:ring-2 focus-within:ring-primary",
        isActive ? "border-primary bg-primary/5" : "border-border/60 bg-card"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onSelect}
          className="min-w-0 flex-1 text-left"
        >
          <p className="font-semibold">{course.course_code}</p>
          {course.title && (
            <p className="text-xs text-muted-foreground">{course.title}</p>
          )}
          {meta.length > 0 && (
            <p className="text-xs text-muted-foreground">{meta.join(" · ")}</p>
          )}
        </button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive"
          aria-label={`Remove ${course.course_code}`}
          onClick={onRemove}
        >
          <Trash2Icon className="size-4" aria-hidden />
        </Button>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <Button size="xs" variant="link" className="px-0 text-xs">
          Priorities &amp; requisites
        </Button>
        <span className="text-border" aria-hidden>
          |
        </span>
        <Button size="xs" variant="link" className="px-0 text-xs">
          Syllabus
        </Button>
      </div>
    </div>
  )
}

export default function CoursesSchedule() {
  const [planId, setPlanId] = useState(1)
  const [activeCourseId, setActiveCourseId] = useState(1)
  const [query, setQuery] = useState("MATH")
  const [searchOpen, setSearchOpen] = useState(true)
  const [collapseEmptyEdges, setCollapseEmptyEdges] = useState(false)
  const [courses, setCourses] = useState(PLANNER.courses)

  const events = selectedEvents(courses)
  const plan = PLANS.find((candidate) => candidate.id === planId) ?? PLANS[0]

  return (
    <CoursesShell activeId="schedule">
      <Page title="Schedule Builder">
        <div className="space-y-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
            <aside className="w-full min-w-0 shrink-0 space-y-4 xl:w-72">
              <section className="min-w-0 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">Find a course</h3>
                  <Badge variant="secondary" className="font-normal">
                    Fall 2026
                  </Badge>
                </div>

                <div className="mt-3 min-w-0 space-y-2">
                  <Input
                    placeholder="Search by code (e.g., MATH 161)"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value)
                      setSearchOpen(true)
                    }}
                  />

                  {searchOpen && (
                    <div className="min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card shadow-lg">
                      {SEARCH_RESULTS.map((result, index) => (
                        <div
                          key={result.course_code}
                          className={cn(
                            "px-3 py-3",
                            index > 0 && "border-t border-border/60"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold">
                                {result.course_code}
                              </p>
                              <p className="text-xs break-words text-muted-foreground">
                                {result.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {[result.school, result.level, result.term]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                                <Button
                                  size="xs"
                                  variant="link"
                                  className="h-auto min-h-0 px-0 py-0 text-xs whitespace-normal"
                                >
                                  Priorities &amp; requisites
                                </Button>
                                <span className="text-border" aria-hidden>
                                  |
                                </span>
                                <Button
                                  size="xs"
                                  variant="link"
                                  className="h-auto min-h-0 px-0 py-0 text-xs whitespace-normal"
                                >
                                  Syllabus
                                </Button>
                              </div>
                            </div>
                            <Button size="sm" className="shrink-0 self-start">
                              <PlusIcon className="size-4" aria-hidden />
                              Add
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="max-h-[500px] overflow-x-hidden overflow-y-auto rounded-xl border border-border/60 bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">Courses</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5"
                        >
                          Actions
                          <ChevronDownIcon
                            className="size-4 opacity-70"
                            aria-hidden
                          />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end" className="w-64">
                      <DropdownMenuLabel>Course actions</DropdownMenuLabel>
                      <DropdownMenuItem className="items-start py-2">
                        <div className="min-w-0">
                          <p className="leading-none font-medium">
                            Refresh courses
                          </p>
                          <p className="mt-1 text-xs font-normal text-muted-foreground">
                            Reload section times and instructors from registrar.
                          </p>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="items-start py-2">
                        <div className="min-w-0">
                          <p className="leading-none font-medium">Auto-build</p>
                          <p className="mt-1 text-xs font-normal text-muted-foreground">
                            Pick a conflict-free set of sections.
                          </p>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-3 space-y-2">
                  {courses.map((course) => (
                    <ShortlistCard
                      key={course.id}
                      course={course}
                      isActive={activeCourseId === course.id}
                      onSelect={() => {
                        setActiveCourseId(course.id)
                      }}
                      onRemove={() => {
                        setCourses((previous) =>
                          previous.filter(
                            (candidate) => candidate.id !== course.id
                          )
                        )
                      }}
                    />
                  ))}
                </div>
              </section>
            </aside>

            <section className="min-w-0 flex-1">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="outline" size="sm" className="gap-1.5">
                          {plan.name}
                          <ChevronDownIcon className="size-4" aria-hidden />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="start" className="w-64">
                      <DropdownMenuRadioGroup
                        value={String(planId)}
                        onValueChange={(value) => {
                          setPlanId(Number(value))
                        }}
                      >
                        {PLANS.map((candidate) => (
                          <DropdownMenuRadioItem
                            key={candidate.id}
                            value={String(candidate.id)}
                            className="items-start py-2"
                          >
                            <div className="flex min-w-0 flex-col gap-0.5 pr-6">
                              <span className="truncate leading-none">
                                {candidate.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {candidate.course_count} courses
                              </span>
                            </div>
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <PlusIcon className="size-4" aria-hidden />
                        New plan
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive">
                        <Trash2Icon className="size-4" aria-hidden />
                        Delete plan
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Badge
                    variant="secondary"
                    className="h-6 px-1.5 text-[11px] font-semibold"
                  >
                    Fit
                  </Badge>

                  <div className="flex items-center gap-1.5">
                    <Switch
                      id="collapse-empty-edges"
                      size="sm"
                      checked={collapseEmptyEdges}
                      onCheckedChange={(checked) => {
                        setCollapseEmptyEdges(checked)
                      }}
                    />
                    <Label
                      htmlFor="collapse-empty-edges"
                      className="cursor-pointer text-xs font-normal text-muted-foreground"
                    >
                      <CropIcon
                        className="size-3.5 shrink-0 opacity-70"
                        aria-hidden
                      />
                      Crop
                    </Label>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="size-7 text-muted-foreground"
                    aria-label="Schedule insights"
                  >
                    <InfoIcon className="size-3.5" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="h-7 gap-1 px-2 font-medium text-muted-foreground hover:text-foreground"
                  >
                    <ClipboardCopyIcon className="size-3.5" aria-hidden />
                    Copy
                  </Button>
                </div>
              </div>

              <WeeklyGrid
                events={events}
                onSelect={() => {}}
                collapseEmptyEdges={collapseEmptyEdges}
              />
            </section>
          </div>
        </div>
      </Page>
    </CoursesShell>
  )
}
