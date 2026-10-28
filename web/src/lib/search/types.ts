import type { components } from "@/api/schema"

export type SearchResponse = components["schemas"]["SearchResponse"]
export type SearchResult = components["schemas"]["SearchResult"]
export type SearchKind = components["schemas"]["SearchKind"]
export type Snippet = components["schemas"]["Snippet"]
export type SourceDate = components["schemas"]["SourceDate"]

/** What the root host's URL carries: `nuspace.kz/?q=…&kind=…`. */
export interface SearchParams {
  q?: string
  kind?: SearchKind
}

export interface SnippetSegment {
  text: string
  match: boolean
}
