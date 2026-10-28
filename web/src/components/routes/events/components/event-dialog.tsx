import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import {
  ArrowLeftIcon,
  CalendarPlusIcon,
  CheckIcon,
  ClockIcon,
  ExternalLinkIcon,
  MapPinIcon,
  PencilIcon,
  Share2Icon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react"

import type { Event } from "@/lib/events"
import {
  eventActions,
  eventGoogleCalendarUrl,
  eventPolicyLabel,
  formatEventDateRange,
  getEventTiming,
} from "@/lib/events"
import { selectMedia } from "@/lib/media/functions"
import { cn, formatCampusDate, formatCampusTime } from "@/lib/utils"
import { Markdown } from "@/components/shared/markdown/renderer"
import { ResilientImage } from "@/components/shared/media/resilient-image"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { BOARD_CORK, BOARD_FRAME, PAPER_GRAIN } from "./board-style"
import { EventMediaCarousel } from "./event-media-carousel"
import { DrawnPoster } from "./poster"

/**
 * The frame and cork shared by every state of the dialog.
 *
 * Full-bleed on a phone, a framed board from `sm` up, with the sheet scrolling
 * inside it so the back button at the top and the actions at the foot stay put.
 */
function BoardDialog({
  onClose,
  labelledBy,
  children,
}: {
  onClose: () => void
  labelledBy?: string
  children: ReactNode
}) {
  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent
        aria-labelledby={labelledBy}
        showCloseButton={false}
        style={BOARD_FRAME}
        className="top-0 left-0 flex h-dvh max-h-none w-full max-w-none translate-0 flex-col gap-0 overflow-hidden rounded-none bg-transparent p-1.5 text-sm shadow-2xl ring-1 ring-black/50 sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[90dvh] sm:max-w-3xl sm:-translate-1/2 sm:rounded-2xl sm:p-3"
      >
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-none sm:rounded-lg">
          <div aria-hidden className="absolute inset-0" style={BOARD_CORK} />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 shadow-[inset_0_3px_12px_rgb(0_0_0/0.6),inset_0_0_0_1px_rgb(0_0_0/0.3)]"
          />
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
}

const BAR_BUTTON =
  "text-stone-100 hover:bg-white/15 hover:text-white aria-expanded:bg-white/15"

function BackToBoard({ onClose }: { onClose: () => void }) {
  return (
    <Button
      variant="ghost"
      className={cn("-ml-1 h-11 sm:h-9", BAR_BUTTON)}
      onClick={onClose}
    >
      <ArrowLeftIcon aria-hidden />
      Board
    </Button>
  )
}

/** The pin holding the sheet up. */
function SheetPin() {
  return (
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
  )
}

/** The event's address, with the query and fragment a filtered board adds left off. */
function canonicalUrl() {
  const url = new URL(window.location.href)
  url.search = ""
  url.hash = ""
  return url.toString()
}

export interface EventDialogProps {
  event: Event
  now: number
  onClose: () => void
  /** Marks or unmarks attendance. The caller sends a signed-out visitor to sign in. */
  onToggleGoing: () => void
  isTogglingGoing: boolean
  onEdit: () => void
  onDelete: () => void
  deleteError?: string | null
  /**
   * Rendered inside the dialog's tree. A second dialog opened from here
   * (edit, delete) has to be its child: as a sibling, a press on it counts as
   * a press outside this one and closes it.
   */
  children?: ReactNode
}

/**
 * An event's detail, as a sheet of paper pinned to the same cork board it was
 * opened from. Presentational: the route owns the data and the mutations.
 */
export function EventDialog({
  event,
  now,
  onClose,
  onToggleGoing,
  isTogglingGoing,
  onEdit,
  onDelete,
  deleteError,
  children,
}: EventDialogProps) {
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(copiedTimer.current), [])

  const timing = getEventTiming(
    event.start_datetime,
    event.end_datetime,
    now,
    event.type
  )
  const actions = eventActions(event, timing)
  const isRecruitment = event.type === "recruitment"
  const canEdit = event.permissions?.can_edit ?? false
  const canDelete = event.permissions?.can_delete ?? false

  const posters = (event.media ?? [])
    .filter((media) => media.media_format === "carousel")
    .map((media) => media.url)
  const flyer = selectMedia(event.media, "carousel")

  const copyLink = () => {
    navigator.clipboard
      .writeText(canonicalUrl())
      .then(() => {
        setCopied(true)
        window.clearTimeout(copiedTimer.current)
        copiedTimer.current = window.setTimeout(() => {
          setCopied(false)
        }, 1600)
      })
      // Clipboard access can be refused; the address is written on the sheet
      // either way.
      .catch(() => undefined)
  }

  const stampParts = [
    timing.kind === "upcoming"
      ? `${timing.label} ${timing.detail}`
      : `${timing.label} · ${timing.detail}`,
    eventPolicyLabel(event.policy),
    ...(event.tag === "regular" ? [] : [event.tag]),
  ]

  return (
    <BoardDialog onClose={onClose} labelledBy="event-title">
      <div className="relative flex items-center gap-2 px-1.5 py-2 sm:px-2.5">
        <BackToBoard onClose={onClose} />
        <Button
          variant="ghost"
          aria-label={copied ? "Link copied" : "Copy event link"}
          onClick={copyLink}
          className={cn("ml-auto size-11 sm:size-8", BAR_BUTTON)}
        >
          {copied ? <CheckIcon aria-hidden /> : <Share2Icon aria-hidden />}
        </Button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto px-2 pt-3 pb-5 sm:px-7">
        <article className="relative mx-auto max-w-2xl bg-[#fffdf8] px-4 py-5 text-stone-900 shadow-[0_1px_1px_rgb(0_0_0/0.35),0_18px_28px_-10px_rgb(0_0_0/0.7)] sm:rotate-[-0.4deg] sm:p-6">
          <SheetPin />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-multiply"
            style={{ backgroundImage: PAPER_GRAIN }}
          />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:gap-5">
            <div className="mx-auto w-40 shrink-0 sm:mx-0 sm:w-44">
              {posters.length > 1 ? (
                <EventMediaCarousel
                  images={posters}
                  alt={`Poster for ${event.name}`}
                />
              ) : (
                <div className="relative aspect-3/4 overflow-hidden bg-stone-200 shadow-[0_1px_2px_rgb(0_0_0/0.3)] ring-1 ring-stone-900/10">
                  {flyer ? (
                    <ResilientImage
                      src={flyer.url}
                      alt={`Poster for ${event.name}`}
                      containerClassName="absolute inset-0 size-full"
                      fallback={<DrawnPoster event={event} />}
                    />
                  ) : (
                    <div className="absolute inset-0">
                      <DrawnPoster event={event} />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-stone-500 uppercase">
                {event.type}
              </p>
              <DialogTitle
                id="event-title"

                className="font-serif text-2xl/tight font-bold text-balance sm:text-3xl"
              >
                {event.name}
              </DialogTitle>

              <ul className="space-y-1.5 pt-1 text-sm">
                <li className="flex items-start gap-2">
                  <ClockIcon
                    className="mt-0.5 size-4 shrink-0 text-stone-500"
                    aria-hidden
                  />
                  <span>
                    {isRecruitment
                      ? `Apply by ${formatCampusDate(event.end_datetime)}, ${formatCampusTime(event.end_datetime)}`
                      : `${formatEventDateRange(event.start_datetime, event.end_datetime)}, ${formatCampusTime(event.start_datetime)}`}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <MapPinIcon
                    className="mt-0.5 size-4 shrink-0 text-stone-500"
                    aria-hidden
                  />
                  <span>{event.place}</span>
                </li>
                {!isRecruitment && (
                  <li className="flex items-start gap-2">
                    <UsersIcon
                      className="mt-0.5 size-4 shrink-0 text-stone-500"
                      aria-hidden
                    />
                    <span>{event.attendees_count} going</span>
                  </li>
                )}
              </ul>

              <p className="pt-1">
                <span className="inline-block -rotate-1 border border-stone-400/70 px-1.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase">
                  {stampParts.join(" · ")}
                </span>
              </p>
            </div>
          </div>

          {event.description && (
            <div className="relative mt-5 space-y-2 border-t border-dashed border-stone-300 pt-4">
              <h2 className="font-serif text-base font-bold">
                About this event
              </h2>
              <Markdown className="text-stone-700">
                {event.description}
              </Markdown>
            </div>
          )}

          <p className="relative mt-5 border-t border-dashed border-stone-300 pt-3 text-[11px] break-all text-stone-500">
            {window.location.host}
            {window.location.pathname}
          </p>
        </article>
      </div>

      {(actions.attend ||
        actions.registerAt ||
        actions.calendar ||
        canEdit ||
        canDelete ||
        deleteError) && (
        <div className="relative border-t border-black/25 bg-black/15 px-2 py-3 sm:px-3">
          {deleteError && (
            <p
              role="alert"
              className="mb-2 rounded bg-red-950/60 px-2 py-1 text-sm text-red-100"
            >
              {deleteError}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {actions.attend && (
              <Button
                disabled={isTogglingGoing}
                aria-pressed={event.is_going}
                title={event.is_going ? "Tap to cancel" : undefined}
                onClick={onToggleGoing}
                className={cn(
                  "h-11 w-full bg-stone-50 text-stone-900 hover:bg-white sm:w-auto",
                  event.is_going &&
                    "bg-emerald-200 text-emerald-950 hover:bg-emerald-100"
                )}
              >
                {event.is_going && <CheckIcon aria-hidden />}
                {event.is_going ? "Going" : "I’m going"}
              </Button>
            )}
            {actions.registerAt && (
              <Button
                nativeButton={false}
                className="h-11 w-full bg-stone-50 text-stone-900 hover:bg-white sm:w-auto"
                render={
                  <a
                    href={actions.registerAt}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLinkIcon aria-hidden />
                    Register
                  </a>
                }
              />
            )}
            {actions.calendar && (
              <Button
                nativeButton={false}
                variant="outline"
                className="h-11 w-full border-stone-100/30 bg-transparent text-stone-100 hover:bg-white/10 hover:text-white sm:w-auto"
                render={
                  <a
                    href={eventGoogleCalendarUrl(event)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <CalendarPlusIcon aria-hidden />
                    Add to calendar
                  </a>
                }
              />
            )}
            {canEdit && (
              <Button
                variant="ghost"
                className="h-11 w-full text-stone-200 hover:bg-white/10 hover:text-white sm:w-auto"
                onClick={onEdit}
              >
                <PencilIcon aria-hidden />
                Edit
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                className="h-11 w-full text-red-200 hover:bg-red-950/40 hover:text-red-100 sm:w-auto"
                onClick={onDelete}
              >
                <Trash2Icon aria-hidden />
                Delete
              </Button>
            )}
          </div>
        </div>
      )}

      {children}
    </BoardDialog>
  )
}

/** What the dialog says when the event cannot be opened. */
export function EventUnavailableDialog({ onClose }: { onClose: () => void }) {
  return (
    <BoardDialog onClose={onClose} labelledBy="event-unavailable">
      <div className="relative flex items-center gap-2 px-1.5 py-2 sm:px-2.5">
        <BackToBoard onClose={onClose} />
      </div>
      <div className="relative px-2 pt-3 pb-8 sm:px-7">
        <article className="relative mx-auto max-w-md bg-[#fffdf8] px-4 py-6 text-stone-900 shadow-[0_1px_1px_rgb(0_0_0/0.35),0_18px_28px_-10px_rgb(0_0_0/0.7)] sm:px-6">
          <SheetPin />
          <DialogTitle
            id="event-unavailable"

            className="font-serif text-2xl/tight font-bold"
          >
            This event isn’t here
          </DialogTitle>
          <p className="mt-2 text-stone-700">
            It may have been taken down, or the link is wrong. The board has
            everything that is up.
          </p>
        </article>
      </div>
    </BoardDialog>
  )
}
