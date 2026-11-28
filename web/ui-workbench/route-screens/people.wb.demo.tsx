const image = (body: string, w: number, h: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`
  )}`

const square = (fill: string, mark: string) =>
  image(
    `<rect width="200" height="200" fill="${fill}"/>
     <text x="100" y="128" font-family="system-ui,sans-serif" font-size="76"
       font-weight="600" fill="#ffffff" fill-opacity="0.92"
       text-anchor="middle">${mark}</text>`,
    200,
    200
  )

export type Visibility = "public" | "NU only" | "private"

export interface ProfilePerson {
  handle: string
  name: string
  picture: string | null
  department: string | null
  visibility: Visibility
}

const person = (
  name: string,
  handle: string,
  department: string | null,
  visibility: Visibility = "public",
  picture: string | null = null
): ProfilePerson => ({ name, handle, department, visibility, picture })

export const PEOPLE: ProfilePerson[] = [
  person(
    "Aiza Tursyn",
    "aiza.t",
    "Physics II · Senior",
    "public",
    square("#be123c", "AT")
  ),
  person(
    "Dastan Abdu",
    "d.abdu",
    "International Relations · Junior",
    "public",
    square("#1e40af", "DA")
  ),
  person("Madina Sadykova", "m.sadykova", "Computer Science · Senior"),
  person("Saule Zhumagalieva", "s.zhum", "Industrial Engineering · Sophomore"),
  person("Yerlan Bekov", "yerlan.b", null, "public", square("#047857", "YB")),
  person("Timur Ismailov", "t.ismailov", "Economics · exchange student"),
  person("Nurtas Ospanov", "n.ospanov", null),
  person(
    "Aigerim Qossymova",
    "a.qossymova",
    "Law · Student adviser",
    "public",
    square("#6d28d9", "AQ")
  ),
  person("Bekzat Nurdaulet", "b.nurdaulet", "Mechanical Engineering · Senior"),
  person(
    "Kamila Yesset",
    "k.yesset",
    "Design · Junior",
    "public",
    square("#0e7490", "KY")
  ),
  person("Ruslan Abishev", "r.abishev", "Mathematics · Senior"),
  person("Dinara Sadvakasova", "d.sadvak", "Chemistry · Sophomore"),
  person("Arman Sadybayev", "a.sadybayev", "Physics III · Senior", "NU only"),
  person(
    "Gulnara Omarova",
    "g.omarova",
    "Student Government · Secretary",
    "NU only"
  ),
  person("Zhansultan Kozybayev", "z.kozybayev", "Law · Senior", "private"),
]

export const NU_ONLY = PEOPLE.filter(
  (person) => person.visibility === "NU only"
)

export const PRIVATE = PEOPLE.filter(
  (person) => person.visibility === "private"
)

export const visibleTo = (viewer: "anonymous" | "signed-in") =>
  PEOPLE.filter((person) =>
    viewer === "anonymous"
      ? person.visibility === "public"
      : person.visibility !== "private"
  )

export interface DirectoryPage {
  slug: string
  name: string
  description: string | null
  avatar: string | null
  banner: string | null
}
