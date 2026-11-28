import type { PageVisibilityValue } from "@/lib/pages/types"

export type ProfileBlock =
  | { kind: "rich-text"; heading: string; body: string }
  | {
      kind: "link-tree"
      heading: string
      links: { label: string; href: string }[]
    }

export interface ProfileFixture {
  sub: string
  name: string
  surname: string
  handle: string
  email: string
  visibility: PageVisibilityValue
  department: string | null
  sgRole: string | null
  keycloakPicture: string | null
  customPicture: string | null
  banner: string | null
  blocks: ProfileBlock[]
}

function svg(fillA: string, fillB: string, label: string) {
  const body = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${fillA}"/><stop offset="1" stop-color="${fillB}"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><text x="320" y="200" font-family="Inter,sans-serif" font-size="46" fill="white" text-anchor="middle" opacity="0.55">${label}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(body)}`
}

function face(tint: string, label: string) {
  const body = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="${tint}"/><circle cx="120" cy="94" r="44" fill="white" opacity="0.85"/><path d="M40 240c0-46 36-74 80-74s80 28 80 74z" fill="white" opacity="0.85"/><text x="228" y="232" font-family="Inter,sans-serif" font-size="22" fill="white" opacity="0.6" text-anchor="end">${label}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(body)}`
}

export const ABOUT = {
  kind: "rich-text",
  heading: "About",
  body: "Third-year computer science. Building the campus timetable nobody asked for, on the CS help desk Tuesdays.",
} as const satisfies ProfileBlock

export const LINKS = {
  kind: "link-tree",
  heading: "Links",
  links: [
    { label: "GitHub", href: "#" },
    { label: "Telegram", href: "#" },
  ],
} as const satisfies ProfileBlock

export const ME = {
  name: "Aiger Bergenov",
  handle: "aigerb",
  email: "aiger.bergenov@nu.edu.kz",
}

export const ME_PROFILE: ProfileFixture = {
  sub: "9f2c41a8-0d3e-4c77-9b10-5a6f7e8d9c01",
  name: "Aiger",
  surname: "Bergenov",
  handle: ME.handle,
  email: ME.email,
  visibility: "public",
  department: "Computer Science",
  sgRole: "capo",
  keycloakPicture: face("#1d4ed8", "Keycloak"),
  customPicture: face("#0f766e", "Uploaded"),
  banner: svg("#1e3a8a", "#0f766e", "Banner"),
  blocks: [ABOUT, LINKS],
}

export const GRADUATED: ProfileFixture = {
  sub: "3ac81d50-6e29-42b7-9f14-77a2b3c4d5e6",
  name: "Daulet",
  surname: "Serikov",
  handle: "daulets",
  email: "daulet.serikov@alumni.nu.edu.kz",
  visibility: "internal",
  department: "Computer Science",
  sgRole: null,
  keycloakPicture: null,
  customPicture: null,
  banner: null,
  blocks: [
    {
      kind: "rich-text",
      heading: "About",
      body: "Graduated May 2026. Backend work in Almaty now. Still on the CS help desk rota, which nobody told the rota about.",
    } satisfies ProfileBlock,
  ],
}

export const EMPTY: ProfileFixture = {
  sub: "e15b8c37-0d6a-4f82-93bc-5a0e1d2c3b4a",
  name: "Timur",
  surname: "Zhumabaev",
  handle: "timurzh",
  email: "timur.zhumabaev@nu.edu.kz",
  visibility: "public",
  department: "Civil Engineering",
  sgRole: null,
  keycloakPicture: face("#0e7490", "Keycloak"),
  customPicture: null,
  banner: null,
  blocks: [],
}

const BANNERS = [
  ["#1d4ed8", "#0e7490"],
  ["#7c3aed", "#2563eb"],
  ["#0f766e", "#164e63"],
  ["#b45309", "#dc2626"],
  ["#4338ca", "#7c3aed"],
  ["#047857", "#0f766e"],
  ["#be123c", "#9d174d"],
  ["#ca8a04", "#a16207"],
] as const

export interface MyPageFixture {
  id: string
  name: string
  slug: string
  description: string
  role: "owner" | "admin"
  visibility: PageVisibilityValue
  banner: string
  avatar: string
}

const PAGE_SEEDS = [
  {
    id: "1",
    name: "ICPC 2026",
    slug: "icpc-2026",
    description: "The contest, the practice rounds, and who is on which team.",
    role: "owner",
    visibility: "public",
  },
  {
    id: "2",
    name: "Cyber School",
    slug: "cyber-school",
    description:
      "Two weeks of security for people who have never touched a router.",
    role: "admin",
    visibility: "public",
  },
  {
    id: "3",
    name: "Data Structures — notes",
    slug: "ds-notes",
    description:
      "Lecture notes, past papers and the one algorithm that keeps coming back.",
    role: "owner",
    visibility: "internal",
  },
  {
    id: "4",
    name: "NU Ball",
    slug: "nu-ball",
    description:
      "The ball, the committee, and the forms nobody has signed yet.",
    role: "admin",
    visibility: "internal",
  },
  {
    id: "5",
    name: "Robotics Lab",
    slug: "robotics-lab",
    description: "Machines, meeting times, and who has the spare motors.",
    role: "owner",
    visibility: "private",
  },
  {
    id: "6",
    name: "Dorms 2026",
    slug: "dorms-2026",
    description: "Housing applications, blocks, and the waitlist.",
    role: "owner",
    visibility: "internal",
  },
  {
    id: "7",
    name: "Math Circle",
    slug: "math-circle",
    description:
      "Wednesday sessions for anyone who wants to argue about proofs.",
    role: "admin",
    visibility: "public",
  },
  {
    id: "8",
    name: "Startup Grant 2025",
    slug: "startup-grant",
    description: "The shortlist, the criteria, and the application form.",
    role: "owner",
    visibility: "private",
  },
] as const satisfies readonly Omit<MyPageFixture, "banner" | "avatar">[]

export const MY_PAGES: MyPageFixture[] = PAGE_SEEDS.map((page, index) => ({
  ...page,
  banner: svg(BANNERS[index][0], BANNERS[index][1], page.name),
  avatar: face(BANNERS[index][0], page.name.charAt(0)),
}))
