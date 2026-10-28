import { infiniteQueryOptions } from "@tanstack/react-query"
import { format, isValid, parseISO } from "date-fns"

import { api, unwrap } from "@/api/client"
import { qk } from "@/api/query-keys"
import { PAGE_SIZE, SEARCH_KINDS, SUGGESTED_TERMS } from "./constants"
import type {
  SearchKind,
  SearchParams,
  SearchResponse,
  SearchResult,
  Snippet,
  SnippetSegment,
  SourceDate,
} from "./types"

export function isSearchKind(value: unknown): value is SearchKind {
  return SEARCH_KINDS.some((kind) => kind === value)
}

/**
 * One query's results, a page of ten at a time.
 *
 * The pager is stateless: page two is a fresh request with `offset=10`, which
 * the backend answers by re-ranking from the top. If the corpus changed in
 * between, a result can come back on both pages — `dedupeResults` is what
 * keeps it to one.
 */
export function searchResultsQueryOptions({
  q,
  kind,
}: {
  q: string
  kind?: SearchKind
}) {
  return infiniteQueryOptions({
    queryKey: qk.search.results({ q, kind }),
    queryFn: ({ pageParam }) =>
      unwrap(
        api.GET("/search/results", {
          params: { query: { q, kind, offset: pageParam, limit: PAGE_SIZE } },
        })
      ),
    initialPageParam: 0,
    getNextPageParam: (last: SearchResponse) => last.next_offset ?? undefined,
    staleTime: 60_000,
  })
}

/**
 * The results of every page fetched so far, each Source once, where it was
 * first shown. A result's `id` is unique across kinds (`page:12`, `event:12`).
 */
export function dedupeResults(
  pages: readonly (readonly SearchResult[])[]
): SearchResult[] {
  const seen = new Set<string>()
  const results: SearchResult[] = []
  for (const page of pages) {
    for (const result of page) {
      if (seen.has(result.id)) continue
      seen.add(result.id)
      results.push(result)
    }
  }
  return results
}

/**
 * A snippet as runs of plain and matched text. The backend sends match offsets
 * in UTF-16 code units, which is what a JavaScript string is indexed in, so
 * they slice the text as they are. A match that overlaps the one before it or
 * runs past the text is dropped rather than trusted.
 */
export function snippetSegments(snippet: Snippet): SnippetSegment[] {
  const { text } = snippet
  const segments: SnippetSegment[] = []
  let position = 0
  const matches = [...(snippet.matches ?? [])].sort((a, b) => a.start - b.start)
  for (const { start, length } of matches) {
    const end = start + length
    if (length <= 0 || start < position || end > text.length) continue
    if (start > position) {
      segments.push({ text: text.slice(position, start), match: false })
    }
    segments.push({ text: text.slice(start, end), match: true })
    position = end
  }
  if (position < text.length) {
    segments.push({ text: text.slice(position), match: false })
  }
  return segments
}

/** Every count is an estimate, so it always reads "About N". */
export function countLine(total: number): string {
  if (total === 0) return "No Sources"
  return `About ${total.toLocaleString("en-US")} ${total === 1 ? "Source" : "Sources"}`
}

const DATE_PREFIX: Record<SourceDate["role"], string> = {
  updated: "Updated ",
  starts: "",
  deadline: "Deadline ",
}

/** "Updated 11 Oct 2026", "Deadline 14 Nov 2026", or an event's "22 Oct 2026". */
export function sourceDateLabel(date: SourceDate | null | undefined): string {
  if (!date) return ""
  // A bare `2026-11-14` parses as that local calendar day, not UTC midnight.
  const parsed = parseISO(date.value)
  if (!isValid(parsed)) return ""
  return `${DATE_PREFIX[date.role]}${format(parsed, "d MMM yyyy")}`
}

/**
 * What the empty state offers instead: every kind if a kind was picked, else
 * the query without its last word, else a suggested term.
 */
export function emptySuggestion(
  q: string,
  kind: SearchKind | undefined
): { label: string; search: SearchParams } {
  const query = q.trim()
  if (kind) {
    return {
      label: `Search every kind for “${query}”`,
      search: { q: query },
    }
  }
  const words = query.split(/\s+/)
  if (words.length > 1) {
    const shorter = words.slice(0, -1).join(" ")
    return { label: `Search “${shorter}” instead`, search: { q: shorter } }
  }
  const term =
    SUGGESTED_TERMS.find(
      (each) => each.toLowerCase() !== query.toLowerCase()
    ) ?? SUGGESTED_TERMS[0]
  return { label: `Search “${term}” instead`, search: { q: term } }
}
