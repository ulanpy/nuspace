import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronDownIcon } from "lucide-react"

import type { StatisticsSearch } from "@/routes/_app/courses/stats"
import { qk } from "@/api/query-keys"
import { fetchGradesPage, gradeTermsQueryOptions } from "@/lib/courses"
import { GradeReportCard } from "@/components/routes/courses/components/grade-report-card"
import { GradeComparison } from "@/components/routes/courses/components/grade-comparison"
import {
  MAX_GRADE_COMPARISONS,
  toggleGradeComparison,
} from "@/lib/courses/comparison"
import { normalizeKeyword } from "@/lib/courses/grades"
import type { GradeReport } from "@/lib/courses"
import { useDebounced } from "@/hooks/use-debounced"
import { useInfiniteList } from "@/hooks/use-infinite-list"
import { EmptyState } from "@/components/shared/query/boundary"
import { InfiniteList } from "@/components/shared/query/infinite-list"
import { CardGrid, CardGridSkeleton } from "@/components/shared/page/card-grid"
import { SearchFilter } from "@/components/shared/list-filters"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/** Base UI radio items need a value for "no term filter". */
const ALL_TERMS = "__all__"

export function StatisticsScreen({
  search,
  onSearchChange,
}: {
  search: StatisticsSearch
  onSearchChange: (
    updater: (previous: StatisticsSearch) => StatisticsSearch,
    replace?: boolean
  ) => void
}) {
  const { keyword: urlKeyword, term } = search

  const [input, setInput] = useState(urlKeyword ?? "")
  const [selected, setSelected] = useState<GradeReport[]>([])

  // A link followed while this screen is already open (the field and the URL
  // normally move together, so only a change that did not come from typing
  // reaches here) replaces what the field shows.
  const [seenKeyword, setSeenKeyword] = useState(urlKeyword)
  if (seenKeyword !== urlKeyword) {
    setSeenKeyword(urlKeyword)
    if (urlKeyword !== normalizeKeyword(input)) setInput(urlKeyword ?? "")
  }

  // Every keystroke would otherwise be its own request; the field stays
  // immediate and only the query lags behind.
  const keyword = normalizeKeyword(useDebounced(input))

  const terms = useQuery(gradeTermsQueryOptions())
  // `terms` has a server-side default, so the field is optional in the schema.
  const termOptions = terms.data?.terms ?? []

  const list = useInfiniteList<GradeReport>({
    queryKey: qk.courses.grades({ keyword, term }),
    fetchPage: ({ page, size }) =>
      fetchGradesPage({ page, size, keyword, term }),
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

      <div className="flex flex-wrap items-center gap-3">
        <SearchFilter
          value={input}
          label="Search past grade statistics"
          placeholder="Search by course code, title or instructor"
          className="min-w-64"
          onChange={(next) => {
            setInput(next)
            // `replace` so typing doesn't bury the previous page under one
            // history entry per character.
            onSearchChange(
              (previous) => ({ ...previous, keyword: normalizeKeyword(next) }),
              true
            )
          }}
        />

        {termOptions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  aria-label="Filter by term"
                >
                  {term ?? "All terms"}
                  <ChevronDownIcon aria-hidden />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={term ?? ALL_TERMS}
                onValueChange={(next) => {
                  onSearchChange((previous) => ({
                    ...previous,
                    term: next === ALL_TERMS ? undefined : next,
                  }))
                }}
              >
                <DropdownMenuRadioItem value={ALL_TERMS}>
                  All terms
                </DropdownMenuRadioItem>
                {termOptions.map((option) => (
                  <DropdownMenuRadioItem key={option} value={option}>
                    {option}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

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
        pending={<CardGridSkeleton columns={2} count={4} />}
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
      >
        {(cards) => (
          <CardGrid columns={1} className="lg:grid-cols-2">
            {cards}
          </CardGrid>
        )}
      </InfiniteList>
    </div>
  )
}
