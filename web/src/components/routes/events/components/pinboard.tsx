import { useMemo, useRef } from "react"
import type { ReactNode } from "react"
import { PlusIcon } from "lucide-react"

import type { Event } from "@/lib/events"
import { assignColumns, estimatePosterHeight, hangPoster } from "@/lib/events"
import { useIntersection } from "@/hooks/use-intersection"
import { cn } from "@/lib/utils"
import { QueryError } from "@/components/shared/query/boundary"
import { BOARD_CORK, BOARD_FRAME, NOTE_LINED } from "./board-style"
import {
  useBoardSway,
  useColumnCount,
  usePrefersReducedMotion,
} from "./board-motion"
import { GhostSheet, Pinned, Poster } from "./poster"

/** What each ghost sheet adds to a column while a page is loading. */
const GHOST_HEIGHT = 2
/** Ghosts on first load, enough to fill a tall screen at four columns. */
const FIRST_LOAD_GHOSTS = 8

export interface BoardFilterOption<T extends string> {
  value: T
  label: string
}

/** A highlighter pen over the chosen word. */
function Highlighted({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "relative isolate rounded-[3px] px-2.5 py-1 text-sm font-medium transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-stone-900/60",
        active
          ? "text-stone-950"
          : "text-stone-600 hover:bg-black/6 hover:text-stone-950"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 -z-10 origin-left -rotate-1 rounded-[3px] bg-amber-300/80 mix-blend-multiply transition-transform duration-300 ease-[cubic-bezier(0.3,1.3,0.5,1)] motion-reduce:transition-none",
          active ? "scale-x-100" : "scale-x-0"
        )}
      />
      {children}
    </button>
  )
}

/** A note pinned to the board, for headings and messages. */
function Note({ id, children }: { id: number; children: ReactNode }) {
  return (
    <Pinned hang={{ ...hangPoster(id), mount: "pin" }} tone="#fffbe6">
      <div className="flex flex-col gap-2 p-4 text-center font-serif">
        {children}
      </div>
    </Pinned>
  )
}

function HeadingNote<T extends string>({
  title,
  subtitle,
  time,
  timeOptions,
  onTimeChange,
  recruitmentOnly,
  onRecruitmentOnlyChange,
  onCreate,
}: {
  title: string
  subtitle?: string
  time: T
  timeOptions: readonly BoardFilterOption<T>[]
  onTimeChange: (time: T) => void
  recruitmentOnly: boolean
  onRecruitmentOnlyChange: (next: boolean) => void
  onCreate: () => void
}) {
  return (
    <div className="mx-auto mb-10 max-w-xl sm:mb-14">
      <Pinned
        hang={{ ...hangPoster(0), rotation: -1, mount: "pin", pinX: 50 }}
        tone="#fffbe6"
        paperStyle={NOTE_LINED}
      >
        <div className="py-5 pr-5 pl-10 sm:py-6 sm:pl-12">
          <h1 className="font-serif text-3xl/tight font-bold text-balance sm:text-4xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-stone-600">{subtitle}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <fieldset className="-ml-2.5 flex flex-wrap gap-x-1 gap-y-1.5 border-0 p-0">
              <legend className="sr-only">Filter events by date</legend>
              {timeOptions.map((option) => (
                <Highlighted
                  key={option.value}
                  active={option.value === time}
                  onClick={() => {
                    onTimeChange(option.value)
                  }}
                >
                  {option.label}
                </Highlighted>
              ))}
            </fieldset>
            <Highlighted
              active={recruitmentOnly}
              onClick={() => {
                onRecruitmentOnlyChange(!recruitmentOnly)
              }}
            >
              Club recruitments
            </Highlighted>

            <button
              type="button"
              onClick={onCreate}
              className="ml-auto inline-flex items-center gap-1.5 rounded-[3px] border border-dashed border-stone-500/60 px-2.5 py-1 text-sm font-medium text-stone-700 transition-colors hover:bg-black/5 hover:text-stone-950 focus-visible:ring-2 focus-visible:ring-stone-900/60 focus-visible:outline-none"
            >
              <PlusIcon className="size-3.5" aria-hidden />
              Create event
            </button>
          </div>
        </div>
      </Pinned>
    </div>
  )
}

/**
 * The events board: posters pinned to cork in a masonry of columns.
 *
 * Each poster goes into the shortest column by its estimated height, which is
 * known before its image arrives, so nothing moves while images load. A
 * poster's column depends only on the posters before it, so a new page lands
 * under the ones already there without reflowing them (see `assignColumns`).
 * The sentinel at the foot asks for the next page before it is reached.
 */
export function EventPinboard<T extends string>({
  events,
  title,
  subtitle,
  time,
  timeOptions,
  onTimeChange,
  recruitmentOnly,
  onRecruitmentOnlyChange,
  onCreate,
  isLoading,
  isError,
  error,
  onRetry,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: {
  events: readonly Event[]
  title: string
  subtitle?: string
  time: T
  timeOptions: readonly BoardFilterOption<T>[]
  onTimeChange: (time: T) => void
  recruitmentOnly: boolean
  onRecruitmentOnlyChange: (next: boolean) => void
  onCreate: () => void
  isLoading: boolean
  isError: boolean
  error?: unknown
  onRetry?: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadMore: () => void
}) {
  const reduceMotion = usePrefersReducedMotion()
  const columnCount = useColumnCount()
  const boardRef = useRef<HTMLDivElement>(null)
  useBoardSway(boardRef, reduceMotion)

  // Observing again after every page means a board still shorter than the
  // screen keeps loading until it is full.
  const sentinelRef = useIntersection<HTMLDivElement>(onLoadMore, {
    enabled: hasNextPage && !isFetchingNextPage && !isLoading && !isError,
    rootMargin: "800px",
  })

  const ghostCount = isLoading
    ? FIRST_LOAD_GHOSTS
    : isFetchingNextPage
      ? columnCount
      : 0

  const columns = useMemo(() => {
    const heights = [
      ...events.map((event) => estimatePosterHeight(event.name)),
      ...Array.from({ length: ghostCount }, () => GHOST_HEIGHT),
    ]
    const placed = assignColumns(heights, columnCount)
    const grouped = Array.from({ length: columnCount }, () => [] as number[])
    placed.forEach((column, index) => grouped[column].push(index))
    return grouped
  }, [events, ghostCount, columnCount])

  const isEmpty = !isLoading && !isError && events.length === 0
  const isFinished =
    !isLoading && !isError && !hasNextPage && !isFetchingNextPage && !isEmpty

  return (
    <section
      aria-label="Events"
      style={BOARD_FRAME}
      // `isolate` keeps a lifted poster's z-index inside the board, so it can
      // never paint over the sticky header.
      className="relative isolate rounded-2xl p-2.5 shadow-2xl ring-1 shadow-black/40 ring-black/50 sm:p-4"
    >
      <div className="relative overflow-hidden rounded-lg">
        <div
          aria-hidden
          className="absolute inset-0 dark:brightness-[0.65]"
          style={BOARD_CORK}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 shadow-[inset_0_3px_12px_rgb(0_0_0/0.6),inset_0_0_0_1px_rgb(0_0_0/0.3)]"
        />

        <div
          ref={boardRef}
          aria-busy={isLoading || isFetchingNextPage}
          className="relative min-h-[70svh] px-4 py-8 sm:px-8 sm:py-10"
        >
          <HeadingNote
            title={title}
            subtitle={subtitle}
            time={time}
            timeOptions={timeOptions}
            onTimeChange={onTimeChange}
            recruitmentOnly={recruitmentOnly}
            onRecruitmentOnlyChange={onRecruitmentOnlyChange}
            onCreate={onCreate}
          />

          {isError ? (
            <div className="mx-auto max-w-sm">
              <Note id={-1}>
                <QueryError error={error} onRetry={onRetry} />
              </Note>
            </div>
          ) : isEmpty ? (
            <div className="mx-auto w-56 pt-6">
              <Note id={-2}>
                <h2 className="text-xl/tight font-bold">Nothing pinned yet</h2>
                <p className="font-sans text-sm text-stone-600">
                  {time === "upcoming" && !recruitmentOnly
                    ? "New events will show up here."
                    : "Try a wider range."}
                </p>
              </Note>
            </div>
          ) : (
            <div className="flex items-start gap-4 sm:gap-6 md:gap-8">
              {columns.map((indices, columnIndex) => (
                <ul
                  // A column is a position, never reordered.
                  // eslint-disable-next-line react/no-array-index-key
                  key={columnIndex}
                  className="flex min-w-0 flex-1 flex-col gap-6 sm:gap-8"
                >
                  {indices.map((index, row) => {
                    const delay = columnIndex * 80 + (row % 3) * 40
                    const event = events.at(index)
                    return event ? (
                      <li key={event.id}>
                        <Poster event={event} delay={delay} />
                      </li>
                    ) : (
                      <li key={`ghost-${index - events.length}`} aria-hidden>
                        <GhostSheet
                          hang={hangPoster(-1000 - (index - events.length))}
                        />
                      </li>
                    )
                  })}
                </ul>
              ))}
            </div>
          )}

          <div ref={sentinelRef} aria-hidden className="h-px" />

          {isFinished ? (
            <div className="mx-auto mt-12 w-52">
              <Note id={-3}>
                <p className="text-base/snug font-bold text-balance">
                  That&rsquo;s everything on the board
                </p>
              </Note>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
