import type { Event, Media } from "@/lib/events"
import { CAMPUS_TIME_ZONE } from "@/lib/utils"

export const NOW = "2026-10-14T14:00:00+05:00"

export type TimeFilter = "upcoming" | "today" | "week" | "month"

/** The campus day an instant falls on. */
function campusDay(ms: number) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CAMPUS_TIME_ZONE,
  }).format(new Date(ms))
}

/**
 * The time filter, against the demo's clock rather than the wall clock: the
 * fixtures are a fortnight of October and the wall clock has moved on.
 */
export function inTimeRange(
  item: Event,
  time: TimeFilter,
  now = new Date(NOW).getTime()
) {
  const start = new Date(item.start_datetime).getTime()
  const end = new Date(item.end_datetime).getTime()
  const day = 86_400_000

  if (time === "upcoming") return end >= now
  if (time === "today") {
    return (
      campusDay(start) === campusDay(now) || campusDay(end) === campusDay(now)
    )
  }
  if (time === "week") return end >= now && start < now + 7 * day

  const monthEnd = new Date(NOW)
  monthEnd.setMonth(monthEnd.getMonth() + 1, 1)
  return end >= now && start < monthEnd.getTime()
}

const creator = {
  sub: "nu0000000000000000001",
  name: "Aruzhan",
  surname: "Sultana",
  picture: "",
}

function poster(id: number, from: string, to: string, label: string): Media {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
</linearGradient></defs>
<rect width="300" height="400" fill="url(#g)"/>
<circle cx="230" cy="90" r="110" fill="#fff" opacity=".14"/>
<circle cx="60" cy="330" r="90" fill="#000" opacity=".12"/>
<text x="24" y="64" font-family="Georgia,serif" font-size="24" fill="#fff" opacity=".95">${label}</text>
</svg>`
  return {
    id: id * 10,
    url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    mime_type: "image/svg+xml",
    entity_type: "community_events",
    entity_id: id,
    media_format: "carousel",
    media_order: 0,
  }
}

function event(
  partial: Pick<
    Event,
    "id" | "name" | "place" | "start_datetime" | "end_datetime" | "type"
  > &
    Partial<Event>
): Event {
  return {
    creator_sub: creator.sub,
    policy: "open",
    registration_link: null,
    description: "",
    status: "approved",
    tag: "regular",
    created_at: "2026-10-01T09:00:00+05:00",
    updated_at: "2026-10-01T09:00:00+05:00",
    creator,
    attendees_count: 0,
    is_going: false,
    ...partial,
  }
}

export const EVENTS: Event[] = [
  event({
    id: 1,
    name: "Autumn Faculty Concert",
    place: "Assembly Hall, Block 1",
    start_datetime: "2026-10-15T19:00:00+05:00",
    end_datetime: "2026-10-15T21:30:00+05:00",
    type: "cultural",
    tag: "promotional",
    description:
      "The Faculty of Humanities opens its season with the autumn concert. Strings, a mixed choir, and four student soloists.\n\nDoors at 18:30. Free, no ticket needed — the hall fills up, so come early.",
    attendees_count: 248,
    is_going: true,
    media: [poster(1, "#7c3aed", "#2563eb", "FACULTY CONCERT")],
    permissions: {
      can_edit: true,
      can_delete: true,
      can_view_attendees: true,
      can_share_access: true,
      can_change_owner: false,
      can_manage_admins: false,
      can_view_admin_link: false,
      editable_fields: [
        "name",
        "place",
        "start_datetime",
        "end_datetime",
        "description",
      ],
    },
  }),
  event({
    id: 2,
    name: "Robotics Club — recruitment",
    place: "Engineering Block 2, Rm 402",
    start_datetime: "2026-10-01T09:00:00+05:00",
    end_datetime: "2026-10-22T23:59:00+05:00",
    type: "recruitment",
    description:
      "We build things that move. No experience needed — the club trains from scratch, and last year's team took second place at the national championship.",
    attendees_count: 64,
    media: [poster(2, "#1d4ed8", "#0f172a", "ROBOTICS CLUB")],
  }),
  event({
    id: 3,
    name: "ICPC Qualifier warm-up",
    place: "Library, Level 3",
    start_datetime: "2026-10-14T13:30:00+05:00",
    end_datetime: "2026-10-14T16:30:00+05:00",
    type: "academic",
    attendees_count: 91,
    media: [poster(3, "#0f766e", "#0ea5e9", "ICPC WARM-UP")],
  }),
  event({
    id: 4,
    name: "Career fair: spring internships",
    place: "Expo Center, Hall B",
    start_datetime: "2026-10-17T10:00:00+05:00",
    end_datetime: "2026-10-17T16:00:00+05:00",
    type: "professional",
    tag: "featured",
    policy: "registration",
    registration_link: "https://career.nu.edu.kz/fair",
    attendees_count: 512,
    media: [poster(4, "#0d9488", "#0369a1", "CAREER FAIR")],
  }),
  event({
    id: 5,
    name: "Ceramics workshop: hand-building",
    place: "Design Block, Studio 2",
    start_datetime: "2026-10-16T15:00:00+05:00",
    end_datetime: "2026-10-16T18:00:00+05:00",
    type: "art",
    description: "Six places, three hours, one finished cup.",
    attendees_count: 6,
    media: [poster(5, "#d97706", "#7c2d12", "CERAMICS")],
  }),
  event({
    id: 6,
    name: "Physics Olympiad — round 2",
    place: "Physics Block, Rm 118",
    start_datetime: "2026-10-18T11:00:00+05:00",
    end_datetime: "2026-10-18T14:00:00+05:00",
    type: "academic",
    attendees_count: 137,
    media: [poster(6, "#1e3a8a", "#4338ca", "OLYMPIAD")],
  }),
  event({
    id: 7,
    name: "Night football: NU vs KBTU",
    place: "University Stadium",
    start_datetime: "2026-10-19T20:00:00+05:00",
    end_datetime: "2026-10-19T22:30:00+05:00",
    type: "sports",
    tag: "featured",
    attendees_count: 1830,
    media: [poster(7, "#b45309", "#7f1d1d", "NIGHT FOOTBALL")],
  }),
  event({
    id: 8,
    name: "Startup mixer with Astana Hub",
    place: "Engineering Block, Atrium",
    start_datetime: "2026-10-20T18:30:00+05:00",
    end_datetime: "2026-10-20T21:00:00+05:00",
    type: "professional",
    policy: "registration",
    registration_link: "https://astanahub.com/mixer",
    attendees_count: 74,
    media: [poster(8, "#059669", "#065f46", "STARTUP MIXER")],
  }),
  event({
    id: 9,
    name: "K-pop cover finals",
    place: "Student Center, Stage",
    start_datetime: "2026-10-16T19:00:00+05:00",
    end_datetime: "2026-10-16T22:00:00+05:00",
    type: "cultural",
    attendees_count: 402,
    media: [poster(9, "#db2777", "#7c3aed", "COVER FINALS")],
  }),
  event({
    id: 10,
    name: "Board games night",
    place: "Student Center, Room 214",
    start_datetime: "2026-10-15T19:00:00+05:00",
    end_datetime: "2026-10-15T23:00:00+05:00",
    type: "social",
    attendees_count: 58,
    media: [poster(10, "#92400e", "#1c1917", "BOARD GAMES")],
  }),
  event({
    id: 11,
    name: "Language exchange: Almaty",
    place: "Library, Language Corner",
    start_datetime: "2026-10-17T18:00:00+05:00",
    end_datetime: "2026-10-17T20:00:00+05:00",
    type: "social",
    attendees_count: 31,
    media: [poster(11, "#0891b2", "#1e40af", "LANGUAGE SWAP")],
  }),
  event({
    id: 12,
    name: "Hiking trip: Big Almaty Lake",
    place: "Meet at the North Gate",
    start_datetime: "2026-10-24T08:00:00+05:00",
    end_datetime: "2026-10-24T18:00:00+05:00",
    type: "recreational",
    attendees_count: 96,
    media: [poster(12, "#15803d", "#0f766e", "HIKING TRIP")],
  }),
  event({
    id: 13,
    name: "Photography walk: the old town",
    place: "Zhibek Zholy, north gate",
    start_datetime: "2026-10-18T16:00:00+05:00",
    end_datetime: "2026-10-18T19:00:00+05:00",
    type: "art",
    attendees_count: 22,
    media: [poster(13, "#6d28d9", "#1e1b4b", "PHOTO WALK")],
  }),
  event({
    id: 14,
    name: "Debate club: semifinals",
    place: "Humanities Block, Rm 301",
    start_datetime: "2026-10-21T17:00:00+05:00",
    end_datetime: "2026-10-21T20:00:00+05:00",
    type: "academic",
    attendees_count: 77,
    media: [poster(14, "#991b1b", "#1c1917", "DEBATE SEMIS")],
  }),
  event({
    id: 15,
    name: "Volunteer call: tree planting",
    place: "Botanical Garden, north gate",
    start_datetime: "2026-10-25T09:00:00+05:00",
    end_datetime: "2026-10-25T14:00:00+05:00",
    type: "recreational",
    tag: "charity",
    attendees_count: 40,
    media: [poster(15, "#15803d", "#365314", "TREE PLANTING")],
  }),
  event({
    id: 16,
    name: "Chess tournament: finals",
    place: "Student Center, Atrium",
    start_datetime: "2026-10-22T12:00:00+05:00",
    end_datetime: "2026-10-22T18:00:00+05:00",
    type: "sports",
    attendees_count: 118,
    media: [poster(16, "#334155", "#0f766e", "CHESS FINALS")],
  }),
  event({
    id: 1042,
    name: "Intro to Machine Learning: how club projects start",
    place: "Block C, room 302",
    start_datetime: "2026-10-22T18:00:00+05:00",
    end_datetime: "2026-10-22T20:00:00+05:00",
    type: "academic",
    description:
      "A two-hour hands-on session for students who want to run their first machine learning project. Bring a laptop; the session covers datasets, training a model, and where to find club AI mentors afterwards.",
    attendees_count: 34,
    media: [poster(1042, "#4338ca", "#0891b2", "INTRO TO ML")],
  }),
]

export const PAGE_SIZE = 8
