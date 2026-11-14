import {
  CalendarIcon,
  FileTextIcon,
  GraduationCapIcon,
  SendIcon,
  UserIcon,
} from "lucide-react"

export type SourceKind =
  | "page"
  | "event"
  | "course"
  | "message"
  | "profile"

export const KIND_ICON: Record<SourceKind, typeof FileTextIcon> = {
  page: FileTextIcon,
  event: CalendarIcon,
  course: GraduationCapIcon,
  message: SendIcon,
  profile: UserIcon,
}

export interface Sitelink {
  title: string
  path: string
  note: string
}

export interface SearchSource {
  id: string
  kind: SourceKind
  kindLabel: string
  title: string
  host: string
  path: string
  url: string
  dateLabel: string
  snippetKind: "passage" | "description"
  snippet: string
  blockLabel?: string
  visibility?: "NU only"
  facts: string
  sitelinks?: Sitelink[]
}

export const QUERY = "club ai"
export const TERMS = ["club", "ai"]

export const COUNT_LINE = "About 1,240 Sources (0.31 seconds)"

export const FACETS = [
  { kind: "message", label: "Channel messages", count: 1044 },
  { kind: "page", label: "Pages", count: 96 },
  { kind: "profile", label: "Profiles", count: 61 },
  { kind: "course", label: "Courses", count: 18 },
  { kind: "event", label: "Events", count: 14 },
] as const

export const OVERVIEW =
  "Eleven student clubs at NU answer to the name, and the one most people mean is " +
  "Club AI — a student-run group that meets every Wednesday in Block C and takes " +
  "anyone who shows up[1]. Membership is free and there is no application[1]. The " +
  "closest thing to a course is CS 302, which the club recommends to members who " +
  "want the background[2]. A recruitment post from the Department of Student " +
  "Services ran a similar call last autumn[3]. A Club AI page was updated three " +
  "days ago[4]."

export const OVERVIEW_SOURCES = [
  "Page",
  "Course",
  "Channel message",
  "Channel message",
]

export const SOURCES: readonly SearchSource[] = [
  {
    id: "page:club-ai",
    kind: "page",
    kindLabel: "Page",
    title: "Club AI",
    host: "pages.nuspace.kz",
    path: "p/club-ai",
    url: "?c=pages&q=club+ai&focus=club-ai",
    dateLabel: "Updated 11 Oct 2026",
    snippetKind: "passage",
    blockLabel: "Text block · Joining",
    visibility: "NU only",
    facts: "Owner Aruzhan Suleimenova · 14 admins",
    snippet:
      "Club AI is a student-run community for anything to do with artificial " +
      "intelligence. We meet every Wednesday at 18:00 in Block C, room 302, and " +
      "anyone who shows up is in.",
    sitelinks: [
      {
        title: "Meeting schedule",
        path: "?c=pages#schedule",
        note: "Wednesday 18:00, Block C 302",
      },
      {
        title: "Projects",
        path: "?c=pages#projects",
        note: "Nine running, four recruiting",
      },
      {
        title: "Past talks",
        path: "?c=pages#talks",
        note: "Recordings from 2025–2026",
      },
    ],
  },
  {
    id: "event:1042",
    kind: "event",
    kindLabel: "Event",
    title: "Intro to Machine Learning: how club projects start",
    host: "nuspace.kz",
    path: "events/1042",
    url: "?c=events&event=1042",
    dateLabel: "22 Oct 2026",
    snippetKind: "description",
    facts: "Academic · Block C, room 302 · 34 going",
    snippet:
      "A two-hour hands-on session for students who want to run their first " +
      "machine learning project. Bring a laptop; the session covers datasets, " +
      "training a model, and where to find club AI mentors afterwards.",
  },
  {
    id: "message:nustudentevents/629",
    kind: "message",
    kindLabel: "Channel message",
    title: "Registration for club AI and 6 other student clubs opens Monday",
    host: "t.me",
    path: "nustudentevents/629",
    url: "#",
    dateLabel: "26 Nov 2024",
    snippetKind: "description",
    facts: "Department of Student Services · post 629",
    snippet:
      "Registration for the autumn intake of student clubs opens Monday at 10:00 " +
      "through the portal. Club AI, Robotics and four others have seats left.",
  },
  {
    id: "course:CS 302",
    kind: "course",
    kindLabel: "Course",
    title: "Data Structures and Algorithms",
    host: "nuspace.kz",
    path: "courses?q=CS+302",
    url: "?c=courses?q=CS+302&focus=CS302",
    dateLabel: "Fall 2026 intake",
    snippetKind: "description",
    facts:
      "6 credits · Undergraduate · School of Engineering and Digital Sciences",
    snippet:
      "CS 302 covers trees, graphs, hashing and amortised analysis. The club AI " +
      "reading list uses it as the prerequisite for the spring machine learning " +
      "track.",
  },
  {
    id: "profile:dana.kim",
    kind: "profile",
    kindLabel: "Profile",
    title: "Dana Kim",
    host: "my.nuspace.kz",
    path: "u/dana.kim",
    url: "?c=people&q=club+ai",
    dateLabel: "",
    snippetKind: "description",
    snippet: "",
    facts: "Computer Science",
  },
]

export const SITELINKS_VERSION: SearchSource = SOURCES[0]
export const NO_SITELINKS_VERSION: SearchSource = {
  ...SOURCES[0],
  sitelinks: undefined,
}

export const WEAK_SOURCES: readonly SearchSource[] = [
  SOURCES[2],
  {
    id: "page:ai-safety-summit",
    kind: "page",
    kindLabel: "Page",
    title: "AI Safety Summit 2026 — report",
    host: "pages.nuspace.kz",
    path: "p/ai-safety-summit",
    url: "?c=pages&q=ai+safety&focus=ai-safety-summit",
    dateLabel: "Updated 2 Oct 2026",
    snippetKind: "passage",
    blockLabel: "Text block · Conclusions",
    visibility: "NU only",
    facts: "Owner School of Engineering and Digital Sciences",
    snippet:
      "Forty-one researchers met in September to agree what counts as an AI safety " +
      "problem worth a NU project. The report is long; the conclusions are nine " +
      "bullet points.",
  },
]

export const LINK_COMPARISON = [
  {
    to: "pages.nuspace.kz/p/club-ai",
    lands: "The Page. The term is gone; there is no way back to the list.",
  },
  {
    to: "pages.nuspace.kz/p/club-ai?q=club+ai&focus=club-ai",
    lands:
      "The Page, with the term kept in the bar and the result marked as focused.",
  },
]
