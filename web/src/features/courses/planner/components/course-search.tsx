import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ExternalLinkIcon, Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { courseSearchQueryOptions, useAddPlannerCourse } from "../api"
import { normalizeCourseQuery, normalizeTitle } from "../schedule"
import type { PlannerSearchResult } from "../types"
import type { SyllabusLinks } from "../syllabus"
import { syllabusLink } from "../syllabus"

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
    <div className="space-y-3">
      <div>
        <label htmlFor="course-search" className="sr-only">
          Search courses
        </label>
        <Input
          id="course-search"
          value={input}
          onChange={(event) => {
            setInput(event.target.value)
          }}
          placeholder={`Search ${termLabel} courses — e.g. CSCI 151`}
          autoComplete="off"
        />
      </div>

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

      <ul className="space-y-2">
        {results.map((result) => {
          const isAdded = addedCodes.has(result.course_code)
          const syllabus = syllabusLink(syllabusLinks, result.course_code)

          return (
            <li
              key={result.course_code}
              className="flex items-start justify-between gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold">{result.course_code}</p>
                <p className="text-sm text-muted-foreground">
                  {normalizeTitle(result.title)}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {result.credits && (
                    <Badge variant="secondary">{result.credits} cr</Badge>
                  )}
                  {result.school && (
                    <Badge variant="outline">{result.school}</Badge>
                  )}
                </div>
                {syllabus && (
                  <a
                    href={syllabus}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Syllabus
                    <ExternalLinkIcon className="size-3" aria-hidden />
                  </a>
                )}
              </div>

              <Button
                size="sm"
                variant={isAdded ? "secondary" : "default"}
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
            </li>
          )
        })}
      </ul>
    </div>
  )
}
