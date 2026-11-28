// The events host: a cork board of posters. An event's detail is a dialog over
// the board, not a page of its own, so a shared link opens the board with the
// dialog already up.
import { useEffect, useMemo, useState } from "react"

import { EVENTS, NOW, PAGE_SIZE, inTimeRange } from "./events.wb.demo"
import { SiteHeader } from "../components/site-header.wb"
import { SignedInToggle } from "../components/signed-in"
import { SiteFooter } from "../components/site-footer.wb"
import { EventDialog } from "../components/event-dialog.wb"
import { EventPinboard } from "../components/event-pinboard.wb"
import { type PinboardFilter } from "../components/board-style"
import type { Event } from "@/lib/events"

const NOW_MS = new Date(NOW).getTime()

const ACCOUNT = { name: "Aiza Tursyn", handle: "@aiza.t" }

/** The event a shared link points at, when it points at one on this board. */
function eventFromUrl() {
  const id = Number(new URLSearchParams(location.search).get("event"))
  return EVENTS.some((event) => event.id === id) ? id : null
}

export default function EventsBoard() {
  const [signedIn, setSignedIn] = useState(false)
  const [query, setQuery] = useState("")
  const [loaded, setLoaded] = useState(PAGE_SIZE)
  const [isFetching, setIsFetching] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(eventFromUrl)
  const [filter, setFilter] = useState<PinboardFilter>("upcoming")

  // Keep the address bar shareable: the dialog is part of the board's URL.
  useEffect(() => {
    const url = new URL(location.href)
    if (selectedId === null) url.searchParams.delete("event")
    else url.searchParams.set("event", String(selectedId))
    history.replaceState(null, "", url)
  }, [selectedId])

  const events = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return EVENTS.filter((event) => {
      if (!inTimeRange(event, filter)) return false
      if (!needle) return true
      return `${event.name} ${event.place} ${event.type}`
        .toLowerCase()
        .includes(needle)
    })
  }, [filter, query])

  const hasMore = loaded < events.length

  const loadMore = () => {
    if (!hasMore || isFetching) return
    setIsFetching(true)
    window.setTimeout(() => {
      setLoaded((previous) => previous + PAGE_SIZE)
      setIsFetching(false)
    }, 1800)
  }

  const selected = EVENTS.find((event) => event.id === selectedId) ?? null
  const trimmed = query.trim()

  return (
    <div className="flex min-h-full flex-col bg-background">
      <SiteHeader account={signedIn ? ACCOUNT : null} />
      <SignedInToggle signedIn={signedIn} onToggle={setSignedIn} />

      <main className="flex-1 px-4 py-6 sm:px-6">
        <EventPinboard
          events={events.slice(0, loaded)}
          title="Events"
          subtitle={
            trimmed
              ? `${events.length} matching “${trimmed}”`
              : `${events.length} on the board`
          }
          filter={filter}
          onFilterChange={(next) => {
            setFilter(next)
            setLoaded(PAGE_SIZE)
          }}
          query={query}
          onQueryChange={setQuery}
          hasNextPage={hasMore}
          isFetchingNextPage={isFetching}
          onLoadMore={loadMore}
          onOpen={(event: Event) => {
            setSelectedId(event.id)
          }}
          onCreate={() => {}}
        />
      </main>

      <SiteFooter />

      <EventDialog
        event={selected}
        now={NOW_MS}
        onClose={() => {
          setSelectedId(null)
        }}
      />
    </div>
  )
}
