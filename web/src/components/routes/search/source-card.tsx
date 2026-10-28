import { Fragment } from "react"
import {
  CalendarIcon,
  FileTextIcon,
  GraduationCapIcon,
  MegaphoneIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { visibilityLabel } from "@/components/shared/pages/visibilities"
import { Badge } from "@/components/ui/badge"
import {
  snippetSegments,
  sourceDateLabel,
  type SearchKind,
  type SearchResult,
} from "@/lib/search"

const KIND_ICON: Record<SearchKind, LucideIcon> = {
  page: FileTextIcon,
  event: CalendarIcon,
  opportunity: MegaphoneIcon,
  course: GraduationCapIcon,
}

/**
 * One result, Google's card: favicon, host › path, the badge and the date on
 * the breadcrumb line; the title as the link; the snippet with its matches in
 * bold; then the kind's facts.
 *
 * The title opens the Source's bare canonical address, the one everyone else
 * sees. No sitelinks and no passage label: a flat crop cannot produce either.
 */
export function SourceCard({ source }: { source: SearchResult }) {
  const Icon = KIND_ICON[source.kind]
  const segments = source.path.split("/").filter(Boolean)
  const badge = source.visibility ? visibilityLabel(source.visibility) : null
  const date = sourceDateLabel(source.date)
  const facts = source.facts ?? []

  return (
    <article className="pt-3 pb-4">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-muted">
          <Icon aria-hidden className="size-2.5 text-muted-foreground" />
        </span>
        <span className="shrink-0 text-foreground">{source.host}</span>
        {segments.length > 0 ? (
          <span className="truncate">
            {segments.map((segment, position) => (
              <Fragment key={`${segment}-${position}`}>
                <span aria-hidden className="px-1">
                  ›
                </span>
                {segment}
              </Fragment>
            ))}
          </span>
        ) : null}

        {badge ? <Badge variant="secondary">{badge}</Badge> : null}

        {date ? <span className="ml-auto shrink-0">{date}</span> : null}
      </div>

      <a href={source.url} className="mt-1 block">
        <h2 className="line-clamp-2 text-xl/snug font-normal text-primary hover:underline">
          {source.title}
        </h2>
      </a>

      {source.snippet ? (
        <p className="mt-1 text-sm/relaxed text-pretty text-muted-foreground">
          {snippetSegments(source.snippet).map((segment, position) =>
            segment.match ? (
              <strong key={position} className="font-bold text-foreground">
                {segment.text}
              </strong>
            ) : (
              <Fragment key={position}>{segment.text}</Fragment>
            )
          )}
        </p>
      ) : null}

      {facts.length > 0 ? (
        <p className="mt-1.5 text-sm/relaxed text-muted-foreground">
          {facts.join(" · ")}
        </p>
      ) : null}
    </article>
  )
}
