import { useQuery } from "@tanstack/react-query"
import {
  CalendarIcon,
  FileTextIcon,
  GraduationCapIcon,
  SparklesIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import {
  overviewParts,
  overviewQueryOptions,
  type SearchKind,
  type SearchOverview,
  type SearchResult,
} from "@/lib/search"
import { sessionQueryOptions } from "@/lib/user"

const DISCLAIMER =
  "AI-generated from NU sources. It can be wrong — open the citations to check."

const KIND_ICON: Partial<Record<SearchKind, LucideIcon>> = {
  page: FileTextIcon,
  event: CalendarIcon,
  course: GraduationCapIcon,
}

function Frame({
  busy,
  children,
}: {
  busy?: boolean
  children: React.ReactNode
}) {
  return (
    <section
      aria-busy={busy}
      aria-label="AI Overview"
      className="mt-2 mb-6 overflow-hidden rounded-lg border bg-muted"
    >
      <div className="flex items-center px-4 pt-3.5">
        <SparklesIcon aria-hidden className="size-4 text-primary" />
        <span className="ml-2 text-sm font-medium text-foreground">
          AI Overview
        </span>
      </div>
      {children}
      <p className="border-t px-4 py-2 text-xs text-muted-foreground">
        {DISCLAIMER}
      </p>
    </section>
  )
}

function Pending() {
  return (
    <Frame busy>
      <div className="space-y-2 px-4 py-3" aria-hidden>
        <div className="h-3.5 w-full rounded bg-secondary" />
        <div className="h-3.5 w-11/12 rounded bg-secondary" />
        <div className="h-3.5 w-3/4 rounded bg-secondary" />
      </div>
    </Frame>
  )
}

function Answered({
  answer,
  sources,
  results,
}: {
  answer: string
  sources: SearchOverview["sources"]
  results: readonly SearchResult[]
}) {
  const byId = new Map(results.map((source) => [source.id, source]))
  return (
    <Frame>
      <p className="px-4 py-3 text-sm leading-relaxed text-pretty text-foreground">
        {overviewParts(answer).map((part, index) =>
          "cite" in part ? (
            <a
              key={index}
              href={`#source-${part.cite}`}
              className="text-primary hover:underline"
            >
              [{part.cite}]
            </a>
          ) : (
            <span key={index}>{part.text}</span>
          )
        )}
      </p>
      {sources?.length ? (
        <div className="flex gap-3 overflow-x-auto px-4 pb-3">
          {sources.map((cited) => {
            const source = byId.get(cited.id)
            const Icon = source ? KIND_ICON[source.kind] : undefined
            return (
              <a
                key={cited.n}
                href={`#source-${cited.n}`}
                className="w-36 shrink-0"
              >
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-background">
                    {Icon ? <Icon aria-hidden className="size-2.5" /> : null}
                  </span>
                  <span className="truncate">{source?.host ?? cited.url}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm leading-snug text-foreground">
                  {cited.title}
                </p>
              </a>
            )
          })}
        </div>
      ) : null}
    </Frame>
  )
}

/**
 * The AI Overview above the results, for a signed-in viewer only. The results
 * render first and this fills in after: pending while the model answers, then
 * the answer, or nothing at all on an abstention, a failure or a guest.
 */
export function Overview({
  q,
  results,
}: {
  q: string
  results: readonly SearchResult[]
}) {
  const session = useQuery(sessionQueryOptions)
  const signedIn = Boolean(session.data)
  const overview = useQuery({ ...overviewQueryOptions(q), enabled: signedIn })

  if (!signedIn || overview.isError) return null
  if (overview.isPending) return <Pending />
  if (!overview.data?.answer) return null
  return (
    <Answered
      answer={overview.data.answer}
      sources={overview.data.sources}
      results={results}
    />
  )
}
