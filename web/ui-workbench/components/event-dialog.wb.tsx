import { useState } from "react"
import {
  ArrowLeftIcon,
  CalendarPlusIcon,
  CheckIcon,
  ClockIcon,
  ExternalLinkIcon,
  MapPinIcon,
  Share2Icon,
  UsersIcon,
} from "lucide-react"

import type { Event } from "@/lib/events"
import {
  eventPolicyLabel,
  formatEventDateRange,
  getEventTiming,
} from "@/lib/events"
import { selectMedia } from "@/lib/media"
import { cn, formatCampusTime } from "@/lib/utils"
import { ResilientImage } from "@/components/shared/media/resilient-image"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { BOARD_CORK, BOARD_FRAME, BOARD_GRAIN } from "./board-style"
import { eventUrl } from "./service-hosts"
import { EVENTS, NOW } from "../route-screens/events.wb.demo"

/**
 * An event's detail, as a sheet of paper pinned to the same cork board it was
 * opened from.
 *
 * The detail is a dialog rather than a page: a shared event link opens the
 * board with this already up, and closing it puts you back where you were.
 * Full-bleed on a phone, a framed board from `sm` up, with the sheet scrolling
 * inside it so the pins at the top and the actions at the foot stay put.
 */
export function EventDialog({
  event,
  now,
  onClose,
}: {
  event: Event | null
  now: number
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const timing = event
    ? getEventTiming(event.start_datetime, event.end_datetime, now, event.type)
    : null

  const copyLink = () => {
    if (!event) return
    const url = new URL(location.href)
    url.searchParams.set("c", "events")
    url.searchParams.set("event", String(event.id))
    navigator.clipboard
      .writeText(url.toString())
      .then(() => {
        setCopied(true)
        window.setTimeout(() => {
          setCopied(false)
        }, 1600)
      })
      // Clipboard access can be refused; the address is written on the sheet
      // either way.
      .catch(() => {})
  }

  return (
    <Dialog
      open={event !== null}
      onOpenChange={(next) => {
        if (!next) {
          setCopied(false)
          onClose()
        }
      }}
    >
      {event && (
        <DialogContent
          aria-labelledby="event-title"
          showCloseButton={false}
          style={BOARD_FRAME}
          className="flex max-h-[100dvh] w-full max-w-none flex-col gap-0 overflow-hidden rounded-none bg-transparent p-1.5 text-sm shadow-2xl ring-1 ring-black/50 sm:max-h-[90dvh] sm:max-w-3xl sm:rounded-2xl sm:p-3"
        >
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-none sm:rounded-lg">
            <div aria-hidden className="absolute inset-0" style={BOARD_CORK} />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 shadow-[inset_0_3px_12px_rgb(0_0_0/0.6),inset_0_0_0_1px_rgb(0_0_0/0.3)]"
            />

            <div className="relative flex items-center gap-2 px-1.5 py-2 sm:px-2.5">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-1 h-9 text-stone-100 hover:bg-white/15 hover:text-white"
                onClick={onClose}
              >
                <ArrowLeftIcon aria-hidden />
                Board
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={copied ? "Link copied" : "Copy event link"}
                onClick={copyLink}
                className="ml-auto text-stone-100 hover:bg-white/15 hover:text-white"
              >
                {copied ? <CheckIcon /> : <Share2Icon />}
              </Button>
            </div>

            <div className="relative min-h-0 flex-1 overflow-y-auto px-2 pt-3 pb-5 sm:px-7">
              <article className="relative mx-auto max-w-2xl -rotate-[0.4deg] bg-[#fffdf8] px-4 py-5 text-stone-900 shadow-[0_1px_1px_rgb(0_0_0/0.35),0_18px_28px_-10px_rgb(0_0_0/0.7)] sm:px-6 sm:py-6">
                {/* The pin holding the sheet up. */}
                <span
                  aria-hidden
                  className="absolute -top-2 left-1/2 -ml-2 size-4 rounded-full"
                  style={{
                    backgroundColor: "#e5484d",
                    backgroundImage:
                      "radial-gradient(circle at 32% 28%, rgb(255 255 255 / 0.8), transparent 45%)",
                    boxShadow:
                      "0 3px 3px rgb(0 0 0 / 0.45), inset -1px -2px 2px rgb(0 0 0 / 0.35)",
                  }}
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-multiply"
                  style={{ backgroundImage: BOARD_GRAIN }}
                />

                <div className="relative flex flex-col gap-4 sm:flex-row sm:gap-5">
                  <div className="mx-auto w-40 shrink-0 sm:mx-0 sm:w-44">
                    <div className="relative aspect-[3/4] overflow-hidden bg-stone-200 shadow-[0_1px_2px_rgb(0_0_0/0.3)] ring-1 ring-stone-900/10">
                      <ResilientImage
                        src={selectMedia(event.media, "carousel")?.url}
                        alt={`Poster for ${event.name}`}
                        containerClassName="absolute inset-0 size-full"
                      />
                    </div>
                  </div>

                  <div className="min-w-0 space-y-2">
                    <p className="text-[11px] font-semibold tracking-[0.14em] text-stone-500 uppercase">
                      {event.type}
                    </p>
                    <h1
                      id="event-title"
                      className="font-serif text-2xl leading-tight font-bold text-balance sm:text-3xl"
                    >
                      {event.name}
                    </h1>

                    <ul className="space-y-1.5 pt-1 text-sm">
                      <li className="flex items-start gap-2">
                        <ClockIcon
                          className="mt-0.5 size-4 shrink-0 text-stone-500"
                          aria-hidden
                        />
                        <span>
                          {formatEventDateRange(
                            event.start_datetime,
                            event.end_datetime
                          )}
                          , {formatCampusTime(event.start_datetime)}
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <MapPinIcon
                          className="mt-0.5 size-4 shrink-0 text-stone-500"
                          aria-hidden
                        />
                        <span>{event.place}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <UsersIcon
                          className="mt-0.5 size-4 shrink-0 text-stone-500"
                          aria-hidden
                        />
                        <span>{event.attendees_count} going</span>
                      </li>
                    </ul>

                    <p className="pt-1">
                      <span className="inline-block -rotate-1 border border-stone-400/70 px-1.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase">
                        {timing?.label} · {timing?.detail} ·{" "}
                        {eventPolicyLabel(event.policy)}
                      </span>
                    </p>
                  </div>
                </div>

                {event.description && (
                  <div className="relative mt-5 space-y-2 border-t border-dashed border-stone-300 pt-4">
                    <h2 className="font-serif text-base font-bold">
                      About this event
                    </h2>
                    {event.description
                      .split("\n")
                      .filter(Boolean)
                      .map((paragraph) => (
                        <p
                          key={paragraph}
                          className="leading-relaxed text-stone-700"
                        >
                          {paragraph}
                        </p>
                      ))}
                  </div>
                )}

                <p className="relative mt-5 border-t border-dashed border-stone-300 pt-3 text-[11px] break-all text-stone-500">
                  {eventUrl(event.id)}
                </p>
              </article>
            </div>

            <div className="relative flex flex-wrap items-center gap-2 border-t border-black/25 bg-black/15 px-2 py-3 sm:px-3">
              {event.policy === "open" ? (
                <Button
                  className={cn(
                    "h-11 w-full bg-stone-50 text-stone-900 hover:bg-white sm:w-auto",
                    event.is_going &&
                      "bg-emerald-200 text-emerald-950 hover:bg-emerald-100"
                  )}
                >
                  {event.is_going && <CheckIcon aria-hidden />}
                  {event.is_going ? "Going" : "I’m going"}
                </Button>
              ) : (
                <Button
                  nativeButton={false}
                  className="h-11 w-full bg-stone-50 text-stone-900 hover:bg-white sm:w-auto"
                  render={
                    // The organiser's own page is outside the app; here it has
                    // nowhere to go.
                    // oxlint-disable-next-line jsx-a11y/anchor-is-valid
                    <a
                      href={event.registration_link ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Register on the organiser’s site"
                    />
                  }
                >
                  <ExternalLinkIcon aria-hidden />
                  Register
                </Button>
              )}
              <Button
                variant="outline"
                className="h-11 flex-1 border-stone-100/30 bg-transparent text-stone-100 hover:bg-white/10 hover:text-white sm:flex-none"
              >
                <CalendarPlusIcon aria-hidden />
                Add to calendar
              </Button>
              {event.permissions?.can_edit && (
                <Button
                  variant="ghost"
                  className="h-11 text-stone-200 hover:bg-white/10 hover:text-white"
                >
                  Edit
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  )
}

export default function EventDialogPreview() {
  return (
    <div className="min-h-full bg-background p-6">
      <EventDialog
        event={EVENTS[0]}
        now={new Date(NOW).getTime()}
        onClose={() => {}}
      />
    </div>
  )
}
