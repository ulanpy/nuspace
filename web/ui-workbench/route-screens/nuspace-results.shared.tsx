/**
 * Shared by every state of `nuspace.kz/?q=…`, so the states differ only in what
 * the query came back with. Not a workbench entry — the glob is `*.wb.tsx`.
 *
 * Google's arrangement, on the app's tokens: a 180px left margin, a 652px
 * reading column, 44px pills, 14px body text at 1.58, 20px unbolded titles. The
 * geometry is Google's and the palette is ours, so every colour below is a
 * token and the workbench can still tune it.
 *
 * What is *not* here is the part of a Google SERP that has no counterpart here:
 * no "Tools" and no "Feedback". The kind chips in that row are already the only
 * refinement this index supports. A date range is the obvious next one, and this
 * is where it goes when it lands.
 */
import { Fragment, type ReactNode } from "react"

import { ChevronDownIcon, MoreVerticalIcon, SparklesIcon } from "lucide-react"

import {
  FACETS,
  KIND_ICON,
  OVERVIEW,
  QUERY,
  TERMS,
} from "./nuspace-results.wb.demo"
import type { SearchSource, SourceKind } from "./nuspace-results.wb.demo"

import { SearchField } from "../components/search-field.wb"
import { SignedInToggle } from "../components/signed-in"
import { SiteFooter } from "../components/site-footer.wb"
import { SiteHeader } from "../components/site-header.wb"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
} from "@/components/ui/pagination"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

import { cn } from "@/lib/utils"

export const ACCOUNT = { name: "Aiza Tursyn", handle: "aiza" }
export const DISCLAIMER =
  "AI-generated from NU sources. It can be wrong — open the citations to check."

/** Google's geometry. The results are indented far past the masthead field,
 * which is the detail people read as "Google" without being able to name. */
const MARGIN = "pl-4 xl:pl-44"
const COLUMN = "max-w-2xl"

function Favicon({ kind }: { kind: SourceKind }) {
  const Icon = KIND_ICON[kind]
  return (
    <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-muted">
      <Icon aria-hidden className="size-2.5 text-muted-foreground" />
    </span>
  )
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Google bolds the match and leaves it black. It does not colour it. */
export function highlight(text: string, terms: readonly string[], limit = 4) {
  const pattern = new RegExp(
    `\\b(${terms.map(escapeRegExp).join("|")})\\b`,
    "gi"
  )
  let seen = 0
  return text.split(pattern).map((part, index) => {
    if (index % 2 === 0) return part
    seen += 1
    return seen > limit ? (
      part
    ) : (
      <strong key={index} className="font-bold text-foreground">
        {part}
      </strong>
    )
  })
}

/** The 2×2 sitelinks block. Google shows up to six of these under a strong
 * result, and nothing at all under a weak one — which is the comparison. */
function Sitelinks({ source }: { source: SearchSource }) {
  if (!source.sitelinks) return null

  return (
    <div className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
      {source.sitelinks.map((link) => (
        <div key={link.path}>
          <a
            href={link.path}
            className="text-base leading-tight text-primary hover:underline"
          >
            {link.title}
          </a>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
            {link.note}
          </p>
        </div>
      ))}
    </div>
  )
}

export function Result({
  source,
  index,
}: {
  source: SearchSource
  index: number
}) {
  const segments = source.path.split("/").filter(Boolean)

  return (
    <article
      id={`source-${index + 1}`}
      className="group scroll-mt-24 pt-3 pb-4"
    >
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Favicon kind={source.kind} />
        <span className="shrink-0 text-foreground">{source.host}</span>
        {segments.length > 0 ? (
          <span className="truncate">
            {segments.map((segment, position) => (
              <Fragment key={segment + position}>
                <span aria-hidden className="px-1">
                  ›
                </span>
                {segment}
              </Fragment>
            ))}
          </span>
        ) : null}

        {source.visibility ? (
          <Badge variant="secondary">{source.visibility}</Badge>
        ) : null}

        <span className="ml-auto flex shrink-0 items-center gap-1">
          {source.dateLabel ? <span>{source.dateLabel}</span> : null}
          <MoreVerticalIcon
            aria-hidden
            className="size-4 opacity-0 group-hover:opacity-100"
          />
        </span>
      </div>

      <a href={source.url} className="mt-1 block">
        <h2 className="line-clamp-2 text-xl leading-snug font-normal text-primary hover:underline">
          {source.title}
        </h2>
      </a>

      {source.snippet ? (
        <p className="mt-1 text-sm leading-relaxed text-pretty text-muted-foreground">
          {highlight(source.snippet, TERMS)}
        </p>
      ) : null}

      {source.facts ? (
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {source.snippetKind === "passage" && source.blockLabel ? (
            <span>{source.blockLabel} · </span>
          ) : null}
          {source.facts}
        </p>
      ) : null}

      <Sitelinks source={source} />
    </article>
  )
}

export function Overview({ sources }: { sources: readonly SearchSource[] }) {
  return (
    <section className="mt-2 mb-6 overflow-hidden rounded-lg border bg-muted">
      <div className="flex items-center px-4 pt-3.5">
        <SparklesIcon aria-hidden className="size-4 text-primary" />
        <span className="ml-2 text-sm font-medium text-foreground">
          AI Overview
        </span>
      </div>

      <p className="px-4 py-3 text-sm leading-relaxed text-pretty text-foreground">
        {OVERVIEW.split(/(\[\d+\])/).map((part, index) => {
          const citation = part.match(/^\[(\d+)\]$/)
          if (!citation)
            return <span key={index}>{highlight(part, TERMS)}</span>
          return (
            <a
              key={index}
              href={`#source-${citation[1]}`}
              className="text-primary hover:underline"
            >
              [{citation[1]}]
            </a>
          )
        })}
      </p>

      {/* Google's strip is a row of thumbnails. A corpus of pages, events and
          547-byte messages has no thumbnails, so this is favicon + host +
          title, which is what the strip degrades to anyway. */}
      <div className="flex gap-3 overflow-x-auto px-4 pb-3">
        {sources.slice(0, 4).map((source) => (
          <div key={source.id} className="w-36 shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Favicon kind={source.kind} />
              <span className="truncate">{source.host}</span>
            </div>
            <p className="mt-1 line-clamp-2 text-sm leading-snug text-foreground">
              {source.title}
            </p>
          </div>
        ))}
      </div>

      {/* #403 caps the answer at thirty words, so there is genuinely more. */}
      <Button
        variant="link"
        size="sm"
        className="mx-4 mb-2 h-auto justify-start px-0"
      >
        Show more
        <ChevronDownIcon aria-hidden className="size-4" />
      </Button>

      <p className="border-t px-4 py-2 text-xs text-muted-foreground">
        {DISCLAIMER}
      </p>
    </section>
  )
}

export function OverviewPending() {
  return (
    <section
      aria-busy="true"
      className="mt-2 mb-6 overflow-hidden rounded-lg border bg-muted"
    >
      <div className="flex items-center px-4 pt-3.5">
        <SparklesIcon aria-hidden className="size-4 text-primary" />
        <span className="ml-2 text-sm font-medium text-foreground">
          AI Overview
        </span>
      </div>
      <div className="space-y-2 px-4 py-3" aria-hidden>
        <div className="h-3.5 w-full rounded bg-secondary" />
        <div className="h-3.5 w-11/12 rounded bg-secondary" />
        <div className="h-3.5 w-3/4 rounded bg-secondary" />
      </div>
      <p className="border-t px-4 py-2 text-xs text-muted-foreground">
        {DISCLAIMER}
      </p>
    </section>
  )
}

export function Results({ sources }: { sources: readonly SearchSource[] }) {
  return (
    <ol>
      {sources.map((source, index) => (
        <li key={source.id}>
          <Result source={source} index={index} />
        </li>
      ))}
    </ol>
  )
}

/**
 * The chrome every state shares: the masthead, the field with the query in it,
 * the kind chips, and the session switch. What changes between states is only
 * `children`.
 */
export function ResultsShell({
  signedIn,
  onToggle,
  kind,
  onKindChange,
  countLine,
  children,
}: {
  signedIn: boolean
  onToggle: (next: boolean) => void
  kind: string
  onKindChange: (next: string) => void
  countLine: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-full flex-col bg-background">
      <SiteHeader
        search={
          <div className="w-full max-w-2xl">
            <SearchField defaultValue={QUERY} />
          </div>
        }
        account={signedIn ? ACCOUNT : null}
      />

      {/* The chips sit on the results margin, and so does the field in the bar
          above them: one left edge for the whole page. */}
      <div className={cn("border-b", MARGIN)}>
        <div className="flex items-center gap-2 overflow-x-auto py-2 pr-4">
          <ToggleGroup
            value={[kind]}
            onValueChange={(next) => {
              if (next.length > 0) onKindChange(next[0])
            }}
            className="w-fit"
          >
            {[{ kind: "all", label: "All" }, ...FACETS].map((facet) => (
              <ToggleGroupItem
                key={facet.kind}
                value={facet.kind}
                className="h-8 rounded-full px-3"
              >
                {facet.label}
                {"count" in facet && facet.count ? (
                  <span className="text-muted-foreground">
                    {facet.count.toLocaleString()}
                  </span>
                ) : null}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      <main className={cn("flex-1", MARGIN)}>
        <div className={cn(COLUMN, "py-4 pr-4")}>
          <p className="text-sm text-muted-foreground">{countLine}</p>

          {children}

          <Pagination className="py-8">
            <PaginationContent>
              <PaginationItem>
                <PaginationNext href="?c=nuspace-results" />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </main>

      <SiteFooter />

      <SignedInToggle signedIn={signedIn} onToggle={onToggle} />
    </div>
  )
}
