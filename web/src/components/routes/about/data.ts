import adil from "@/assets/team/adil.jpg"
import aisana from "@/assets/team/aisana.jpg"
import alan from "@/assets/team/alan.jpg"
import bakhtiyar from "@/assets/team/bakhtiyar.jpg"
import ulan from "@/assets/team/ulan.jpg"
import yelnur from "@/assets/team/yelnur.jpg"

export type ContactKind = "GitHub" | "LinkedIn" | "Telegram" | "Website"

export interface TeamMember {
  name: string
  role: string
  /** Not everyone has supplied a photo; the card falls back to initials. */
  photo?: string
  links: { kind: ContactKind; href: string }[]
}

/**
 * The people who built Nuspace. Carried over from the old about page.
 *
 * Links with no destination are dropped rather than rendered disabled — an
 * unclickable icon reads as a broken link, and the absence says the same thing
 * more clearly.
 */
export const TEAM: TeamMember[] = [
  {
    name: "Ulan",
    role: "Head",
    photo: ulan,
    links: [
      { kind: "GitHub", href: "https://github.com/ulanpy/" },
      { kind: "Telegram", href: "https://t.me/kamikadze24" },
    ],
  },
  {
    name: "Turdaly Yelnur",
    role: "Frontend Developer",
    photo: yelnur,
    links: [
      { kind: "GitHub", href: "https://github.com/Turdaly/" },
      { kind: "Telegram", href: "https://t.me/yelnurturdaly" },
    ],
  },
  {
    name: "Alan",
    role: "Backend Developer",
    photo: alan,
    links: [
      { kind: "GitHub", href: "https://github.com/queshee" },
      { kind: "Telegram", href: "https://t.me/quesheee" },
    ],
  },
  {
    name: "Bakhtiyar",
    role: "Developer & Product Manager",
    photo: bakhtiyar,
    links: [
      { kind: "GitHub", href: "https://github.com/sagyzdop" },
      { kind: "LinkedIn", href: "https://www.linkedin.com/in/sagyzdop/" },
      { kind: "Website", href: "https://sagyzdop.com" },
    ],
  },
  {
    name: "Aisana",
    role: "Frontend Developer",
    photo: aisana,
    links: [
      { kind: "GitHub", href: "https://github.com/aisana-abdrayeva/" },
      {
        kind: "LinkedIn",
        href: "https://www.linkedin.com/in/aisana-abdrayeva",
      },
      { kind: "Telegram", href: "https://t.me/aisana_abdrayeva" },
    ],
  },
  {
    name: "Adil",
    role: "Supervisor",
    photo: adil,
    links: [
      { kind: "GitHub", href: "https://github.com/weeebdev" },
      { kind: "LinkedIn", href: "https://www.linkedin.com/in/adildev/" },
      { kind: "Telegram", href: "https://t.me/weeebdev" },
    ],
  },
  {
    name: "Myrza Arslan",
    role: "Frontend Developer",
    links: [
      { kind: "GitHub", href: "https://github.com/myrzaarslan" },
      { kind: "Telegram", href: "https://t.me/myrzaarslan" },
    ],
  },
  {
    name: "Asqar",
    role: "Backend Developer",
    links: [
      { kind: "GitHub", href: "https://github.com/Ioonchik" },
      { kind: "LinkedIn", href: "https://www.linkedin.com/in/askar-ivan/" },
      { kind: "Telegram", href: "https://t.me/askarikoo" },
    ],
  },
  {
    name: "Ibrahim",
    role: "Backend Developer",
    links: [
      { kind: "GitHub", href: "https://github.com/tolbra" },
      { kind: "LinkedIn", href: "https://www.linkedin.com/in/tolbra/" },
      { kind: "Telegram", href: "https://t.me/tolbra" },
    ],
  },
  {
    name: "Nurdaulet Zhalmuratov",
    role: "Backend Developer",
    // GitHub omitted on purpose: the old data pointed this entry at
    // github.com/tolbra, which is Ibrahim's account above. Rather than carry a
    // wrong profile forward, the link is left out until the right one is known.
    links: [
      {
        kind: "LinkedIn",
        href: "https://linkedin.com/in/nurdaulet-zhalmuratov",
      },
      { kind: "Telegram", href: "https://t.me/nurdauletzhalmuratov" },
    ],
  },
  {
    name: "Bekarys Maksutbek",
    role: "Backend Developer",
    links: [
      { kind: "GitHub", href: "https://github.com/b2k4rys" },
      {
        kind: "LinkedIn",
        href: "https://kz.linkedin.com/in/bekarys-maksutbek",
      },
      { kind: "Telegram", href: "https://t.me/b2k4rys" },
    ],
  },
]
