const image = (body: string, w: number, h: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`
  )}`

const banner = (a: string, b: string) =>
  image(
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
       <stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/>
     </linearGradient></defs>
     <rect width="400" height="200" fill="url(#g)"/>
     <circle cx="300" cy="40" r="70" fill="#fff" opacity="0.12"/>
     <circle cx="90" cy="170" r="90" fill="#000" opacity="0.10"/>`,
    400,
    200
  )

const square = (fill: string, mark: string) =>
  image(
    `<rect width="200" height="200" fill="${fill}"/>
     <text x="100" y="128" font-family="system-ui,sans-serif" font-size="76"
       font-weight="600" fill="#ffffff" fill-opacity="0.92"
       text-anchor="middle">${mark}</text>`,
    200,
    200
  )

export interface DirectoryPage {
  slug: string
  name: string
  description: string | null
  avatar: string | null
  banner: string | null
}

export const PAGES: DirectoryPage[] = [
  {
    slug: "student-government",
    name: "Student Government",
    description:
      "News, elections, and the open calls you can put your name to.",
    avatar: square("#0f766e", "SG"),
    banner: banner("#0f766e", "#164e63"),
  },
  {
    slug: "ai-society",
    name: "AI Society",
    description:
      "Talks, workshops and the Thursday build night. Open to every faculty.",
    avatar: square("#4338ca", "AI"),
    banner: banner("#4338ca", "#7c3aed"),
  },
  {
    slug: "campus-contacts",
    name: "Campus Contacts",
    description:
      "Every office, helpdesk and emergency number on campus, in one Page.",
    avatar: null,
    banner: banner("#b45309", "#dc2626"),
  },
  {
    slug: "sg-otinish",
    name: "SG Otinish",
    description:
      "How an appeal works, what Student Government does with yours, and how long it takes.",
    avatar: square("#1d4ed8", "SG"),
    banner: null,
  },
  {
    slug: "chess-club",
    name: "Chess Club",
    description:
      "Blitz nights every Tuesday, Library B. Boards and clocks provided.",
    avatar: square("#7c2d12", "♞"),
    banner: banner("#7c2d12", "#a16207"),
  },
  {
    slug: "debate-union",
    name: "Debate Union",
    description:
      "Training on Tuesdays, the Kazakh and English squads, and the spring open.",
    avatar: square("#831843", "DU"),
    banner: banner("#831843", "#9d174d"),
  },
  {
    slug: "film-society",
    name: "Film Society",
    description: null,
    avatar: null,
    banner: null,
  },
  {
    slug: "green-campus",
    name: "Green Campus",
    description:
      "What the waste system actually does, and the two working groups.",
    avatar: square("#166534", "GC"),
    banner: banner("#166534", "#0f766e"),
  },
]
