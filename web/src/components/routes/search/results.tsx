import { useMemo } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { ChevronDownIcon } from "lucide-react"

import {
  EmptyState,
  QueryError,
  SkeletonLines,
} from "@/components/shared/query/boundary"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { destinations } from "@/lib/hosts"
import {
  KIND_LABELS,
  SEARCH_KINDS,
  countLine,
  dedupeResults,
  emptySuggestion,
  isSearchKind,
  searchResultsQueryOptions,
  type SearchKind,
  type SearchResponse,
} from "@/lib/search"

import { SourceCard } from "./source-card"

const ALL = "all"

/**
 * The kind chips: All, then one per kind with its estimated count. The counts
 * come from the first page and do not change with the chip picked, so a chip
 * says what picking it would find.
 */
function KindChips({
  q,
  kind,
  counts,
}: {
  q: string
  kind: SearchKind | undefined
  counts: SearchResponse["counts"] | undefined
}) {
  const navigate = useNavigate()

  return (
    <div className="-mx-1 overflow-x-auto border-b px-1 pb-2">
      <ToggleGroup
        value={[kind ?? ALL]}
        onValueChange={(next) => {
          const picked: unknown = next[0]
          if (picked !== ALL && !isSearchKind(picked)) return
          void navigate({
            to: "/",
            search: { q, kind: picked === ALL ? undefined : picked },
          })
        }}
        className="w-fit"
      >
        <ToggleGroupItem value={ALL} className="h-8 rounded-full px-3">
          All
        </ToggleGroupItem>
        {SEARCH_KINDS.map((each) => {
          const count = counts?.[each]
          return (
            <ToggleGroupItem
              key={each}
              value={each}
              className="h-8 rounded-full px-3"
            >
              {KIND_LABELS[each]}
              {count ? (
                <span
                  className="text-muted-foreground"
                  aria-label={`about ${count.toLocaleString("en-US")}`}
                >
                  {count.toLocaleString("en-US")}
                </span>
              ) : null}
            </ToggleGroupItem>
          )
        })}
      </ToggleGroup>
    </div>
  )
}

/** The index is down: say so, and list the six hosts so the visitor can go on. */
function SearchUnavailable({
  error,
  onRetry,
}: {
  error: unknown
  onRetry: () => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <QueryError error={error} onRetry={onRetry} />
      <EmptyState
        title="The rest of Nuspace"
        action={
          <ul className="space-y-1 text-sm">
            {destinations(window.location.hostname).map((destination) => (
              <li key={destination.key}>
                <a href={destination.href} className="hover:underline">
                  {destination.host}
                </a>
              </li>
            ))}
          </ul>
        }
      />
    </div>
  )
}

function NothingFound({ q, kind }: { q: string; kind?: SearchKind }) {
  const suggestion = emptySuggestion(q, kind)
  return (
    <EmptyState
      title="Nothing for that term"
      description="Try a shorter term, or a different kind above."
      action={
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link to="/" search={suggestion.search} />}
        >
          {suggestion.label}
        </Button>
      }
    />
  )
}

/**
 * `nuspace.kz/?q=…`: the chips, the count, the ranked Sources and the pager.
 *
 * Paging is stateless on the server and cumulative here: "More results" fetches
 * the next ten and appends them, and `dedupeResults` drops any Source an
 * earlier page already showed, in case the ranking shifted in between.
 */
export function Results({ q, kind }: { q: string; kind?: SearchKind }) {
  const query = useInfiniteQuery(searchResultsQueryOptions({ q, kind }))
  const first = query.data?.pages[0]
  const results = useMemo(
    () => dedupeResults(query.data?.pages.map((page) => page.results) ?? []),
    [query.data]
  )

  let body
  if (query.isPending) {
    body = <SkeletonLines count={4} />
  } else if (query.isError && !query.data) {
    body = (
      <SearchUnavailable
        error={query.error}
        onRetry={() => {
          void query.refetch()
        }}
      />
    )
  } else if (results.length === 0) {
    body = <NothingFound q={q} kind={kind} />
  } else {
    body = (
      <>
        {/* #445: the AI Overview goes here, above the results, for a signed-in viewer. */}
        <ol>
          {/* `source-N` is the anchor an Overview citation [N] jumps to (#445). */}
          {results.map((source, index) => (
            <li
              key={source.id}
              id={`source-${index + 1}`}
              className="scroll-mt-24"
            >
              <SourceCard source={source} />
            </li>
          ))}
        </ol>

        {query.hasNextPage ? (
          <div className="flex justify-center py-8">
            <Button
              variant="ghost"
              disabled={query.isFetchingNextPage}
              onClick={() => {
                void query.fetchNextPage()
              }}
            >
              More results
              <ChevronDownIcon data-icon="inline-end" aria-hidden />
            </Button>
          </div>
        ) : null}
      </>
    )
  }

  return (
    <div className="max-w-2xl space-y-3">
      <KindChips q={q} kind={kind} counts={first?.counts} />
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {query.isError && !query.data
          ? "Search is unavailable"
          : first
            ? countLine(first.estimated_total)
            : " "}
      </p>
      {body}
    </div>
  )
}
