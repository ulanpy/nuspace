import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { z } from "zod"

import { qk } from "@/api/query-keys"
import { fetchGradesPage, gradeTermsQueryOptions } from "@/features/courses/api"
import { GradeReportCard } from "@/features/courses/components/grade-report-card"
import { GradeComparison } from "@/features/courses/components/grade-comparison"
import {
  MAX_GRADE_COMPARISONS,
  toggleGradeComparison,
} from "@/features/courses/grade-comparison"
import type { GradeReport } from "@/features/courses/types"
import { useDebounced } from "@/hooks/use-debounced"
import { useInfiniteList } from "@/hooks/use-infinite-list"
import { EmptyState } from "@/components/query-boundary"
import { InfiniteList } from "@/components/infinite-list"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const statisticsSearchSchema = z.object({
  q: z.string().optional(),
  /** A term code like `FA2025`; absent means every term. */
  term: z.string().optional(),
})

export const Route = createFileRoute("/_app/courses/statistics")({
  validateSearch: statisticsSearchSchema,
  component: Statistics,
})

function Statistics() {
  const { q, term } = Route.useSearch()
  const navigate = Route.useNavigate()

  const [input, setInput] = useState(q ?? "")
  const [selected, setSelected] = useState<GradeReport[]>([])
  // Every keystroke would otherwise be its own request; the field stays
  // immediate and only the query lags behind.
  const keyword = useDebounced(input)

  const terms = useQuery(gradeTermsQueryOptions())
  // `terms` has a server-side default, so the field is optional in the schema.
  const termOptions = terms.data?.terms ?? []

  const list = useInfiniteList<GradeReport>({
    queryKey: qk.courses.grades({ keyword, term }),
    fetchPage: ({ page, size }) =>
      fetchGradesPage({ page, size, keyword: keyword || undefined, term }),
  })

  return (
    <div className="space-y-4">
      <GradeComparison
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
      <div>
        <label htmlFor="grade-search" className="sr-only">
          Search past grade statistics
        </label>
        <Input
          id="grade-search"
          value={input}
          onChange={(event) => {
            const next = event.target.value
            setInput(next)
            // `replace` so typing doesn't bury the previous page under one
            // history entry per character.
            void navigate({
              search: (prev) => ({ ...prev, q: next || undefined }),
              replace: true,
            })
          }}
          placeholder="Search by course code, title or instructor"
          autoComplete="off"
        />
      </div>

      {termOptions.length > 0 && (
        <fieldset className="flex flex-wrap gap-1">
          <legend className="sr-only">Term</legend>
          {[undefined, ...termOptions].map((option) => {
            const isActive = term === option

            return (
              <button
                key={option ?? "all"}
                type="button"
                aria-pressed={isActive}
                onClick={() => {
                  void navigate({
                    search: (prev) => ({ ...prev, term: option }),
                  })
                }}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  isActive
                    ? "border-primary bg-primary/10 font-medium"
                    : "text-muted-foreground hover:bg-muted/60"
                )}
              >
                {option ?? "All terms"}
              </button>
            )
          })}
        </fieldset>
      )}

      <InfiniteList
        items={list.items}
        getKey={(report) => report.id}
        renderItem={(report) => (
          <GradeReportCard
            report={report}
            selected={selected.some((item) => item.id === report.id)}
            compareDisabled={selected.length >= MAX_GRADE_COMPARISONS}
            onToggleCompare={() => {
              setSelected((previous) => toggleGradeComparison(previous, report))
            }}
          />
        )}
        isPending={list.isPending}
        isError={list.isError}
        error={list.error}
        refetch={() => {
          void list.refetch()
        }}
        hasNextPage={list.hasNextPage}
        isFetchingNextPage={list.isFetchingNextPage}
        fetchNextPage={() => {
          void list.fetchNextPage()
        }}
        empty={
          <EmptyState
            title="No grade statistics match"
            description={
              keyword
                ? `Nothing found for “${keyword}”.`
                : "No published statistics for this term yet."
            }
          />
        }
      />
    </div>
  )
}
