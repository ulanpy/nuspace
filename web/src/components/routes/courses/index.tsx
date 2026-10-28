import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { CalendarDaysIcon, LifeBuoyIcon, RefreshCcw } from "lucide-react"

import type { MyCoursesSearch } from "@/routes/_app/courses"
import { registeredCoursesQueryOptions } from "@/lib/courses"
import { selectedCourseId } from "@/lib/courses"
import { summarizeGpa, toggleExcluded } from "@/lib/courses/gpa"
import { AssignmentEditor } from "@/components/routes/courses/components/assignment-editor"
import { useAssignmentEditor } from "@/components/routes/courses/components/use-assignment-editor"
import { CourseDetail } from "@/components/routes/courses/components/course-detail"
import { CourseList } from "@/components/routes/courses/components/course-list"
import { CourseSummary } from "@/components/routes/courses/components/course-summary"
import { GpaSummaryCard } from "@/components/routes/courses/components/gpa-summary"
import { RegistrarSync } from "@/components/routes/courses/components/registrar-sync"
import { RegisteredScheduleDialog } from "@/components/routes/courses/components/registered-schedule-dialog"
import { EmptyState, QueryBoundary } from "@/components/shared/query/boundary"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

/**
 * My Courses: the GPA across the top, then three columns at `xl` (courses,
 * the selected course's assignments, its summary) that stack below it. The
 * assignments come first when stacked, because they are what you came for.
 */
export function MyCoursesScreen({
  search,
  onCourseSelect,
}: {
  search: MyCoursesSearch
  onCourseSelect: (courseId: number) => void
}) {
  const { course: requestedCourseId } = search
  const query = useQuery(registeredCoursesQueryOptions())
  const [isSyncOpen, setIsSyncOpen] = useState(false)
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  // Per visit, on purpose: excluding a course is a what-if on the summary and
  // is neither sent to the API nor kept for next time.
  const [excludedIds, setExcludedIds] = useState<ReadonlySet<number>>(
    () => new Set()
  )
  const editor = useAssignmentEditor()

  return (
    <QueryBoundary
      query={query}
      isEmpty={(courses) => courses.length === 0}
      // With no courses there is nothing else to do on this screen, so the
      // sync form is the page rather than something to go looking for.
      empty={
        <div className="space-y-4">
          <EmptyState
            title="Your course list is empty"
            description="Sync with the registrar to pull in this term's courses."
          />
          <RegistrarSync />
        </div>
      }
    >
      {(courses) => {
        const activeCourseId = selectedCourseId(courses, requestedCourseId)
        const activeCourse =
          courses.find((course) => course.id === activeCourseId) ?? null

        return (
          <div className="space-y-4">
            <GpaSummaryCard summary={summarizeGpa(courses, excludedIds)} />

            <div className="grid items-start gap-4 xl:grid-cols-[260px_minmax(0,1fr)_300px]">
              <section
                aria-label="Registered courses"
                className="order-2 min-w-0 xl:sticky xl:top-18 xl:order-1"
              >
                <CourseList
                  courses={courses}
                  selectedId={activeCourseId}
                  excludedIds={excludedIds}
                  onSelect={onCourseSelect}
                />
              </section>

              {activeCourse ? (
                <section
                  aria-label={`${activeCourse.course.course_code} assignments`}
                  className="order-1 min-w-0 xl:order-2"
                >
                  <CourseDetail
                    key={activeCourse.id}
                    registered={activeCourse}
                    onEdit={editor.setEditing}
                    onDelete={editor.setDeleting}
                  />
                </section>
              ) : null}

              <aside className="order-3 min-w-0 space-y-4 xl:sticky xl:top-18">
                {activeCourse ? (
                  <CourseSummary
                    registered={activeCourse}
                    isExcluded={excludedIds.has(activeCourse.id)}
                    onToggleExcluded={() => {
                      setExcludedIds((previous) =>
                        toggleExcluded(previous, activeCourse.id)
                      )
                    }}
                    onAdd={() => {
                      editor.setEditing("new")
                    }}
                  />
                ) : null}

                <Card size="sm" className="gap-3 p-4">
                  <div>
                    <h2 className="text-sm font-semibold">Workspace actions</h2>
                    <p className="text-xs text-muted-foreground">
                      Timetable and registrar tools apply to your full term.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      setIsScheduleOpen(true)
                    }}
                  >
                    <CalendarDaysIcon aria-hidden />
                    Weekly timetable
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      setIsSyncOpen((open) => !open)
                    }}
                  >
                    <RefreshCcw aria-hidden />
                    {isSyncOpen ? "Hide registrar sync" : "Sync registrar"}
                  </Button>
                </Card>
                {isSyncOpen && <RegistrarSync />}

                <Card size="sm" className="gap-2 p-4">
                  <div className="flex items-center gap-2">
                    <LifeBuoyIcon
                      className="size-4 text-muted-foreground"
                      aria-hidden
                    />
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
              </aside>
            </div>

            {activeCourse ? (
              <AssignmentEditor registered={activeCourse} state={editor} />
            ) : null}

            <RegisteredScheduleDialog
              open={isScheduleOpen}
              onOpenChange={setIsScheduleOpen}
            />
          </div>
        )
      }}
    </QueryBoundary>
  )
}
