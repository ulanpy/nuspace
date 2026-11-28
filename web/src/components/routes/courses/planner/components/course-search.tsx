import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CourseLinks } from "@/components/routes/courses/planner/components/course-links"

import {
  courseSearchQueryOptions,
  useAddPlannerCourse,
} from "@/lib/courses/planner"
import {
  normalizeCourseQuery,
  normalizeTitle,
} from "@/lib/courses/planner/schedule"
import type { PlannerSearchResult } from "@/lib/courses/planner"
import type { SyllabusLinks } from "@/lib/courses/planner"
import { syllabusLink } from "@/lib/courses/planner"

interface CourseSearchProps {
  term: string
  termLabel: string
  /** Codes already in the planner, so they can be shown as added. */
  addedCodes: ReadonlySet<string>
  /** Which saved plan the course is added to. */
  scheduleId: number | null
  syllabusLinks: SyllabusLinks
}

export function CourseSearch({
  term,
  termLabel,
  addedCodes,
  scheduleId,
  syllabusLinks,
}: CourseSearchProps) {
  const [input, setInput] = useState("")
  const addCourse = useAddPlannerCourse({ scheduleId })

  // Normalizing before it reaches the query key means a Cyrillic-layout search
  // and its Latin equivalent share one cache entry instead of two.
  const query = useQuery(
    courseSearchQueryOptions(term, normalizeCourseQuery(input))
  )

  const results: PlannerSearchResult[] = query.data?.items ?? []

  return (
    <div className="mt-3 min-w-0 space-y-2">
      <label htmlFor="course-search" className="sr-only">
        Search courses
      </label>
      <Input
        id="course-search"
        value={input}
        onChange={(event) => {
          setInput(event.target.value)
        }}
        placeholder="Search by code (e.g., MATH 161)"
        autoComplete="off"
      />

      {query.isError && (
        <p className="text-sm text-destructive">
          Course search is unavailable right now.
        </p>
      )}

      {query.isSuccess && results.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No courses match that code in {termLabel}.
        </p>
      )}

      {results.length > 0 && (
        <ul className="max-h-96 min-w-0 divide-y divide-border/60 overflow-x-hidden overflow-y-auto rounded-xl border border-border/60 bg-card shadow-lg">
          {results.map((result) => {
            const isAdded = addedCodes.has(result.course_code)
            const meta = [
              result.school,
              result.level,
              result.credits ? `${result.credits} cr` : null,
            ].filter(Boolean)

            return (
              <li key={result.course_code} className="p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {result.course_code}
                    </p>
                    <p className="text-xs wrap-break-word text-muted-foreground">
                      {normalizeTitle(result.title)}
                    </p>
                    {meta.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {meta.join(" · ")}
                      </p>
                    )}
                    <CourseLinks
                      course={result}
                      syllabus={syllabusLink(syllabusLinks, result.course_code)}
                    />
                  </div>

                  <Button
                    size="sm"
                    variant={isAdded ? "secondary" : "default"}
                    className="shrink-0 self-start"
                    disabled={isAdded || addCourse.isPending}
                    onClick={() => {
                      addCourse.mutate({
                        course_code: result.course_code,
                        term_value: term,
                        term_label: termLabel,
                        level: result.level,
                      })
                    }}
                  >
                    {isAdded ? (
                      "Added"
                    ) : (
                      <>
                        <Plus aria-hidden /> Add
                      </>
                    )}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
