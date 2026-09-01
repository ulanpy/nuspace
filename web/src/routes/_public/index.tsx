import { Link, createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowRightIcon,
  BookOpenCheckIcon,
  CalendarIcon,
  CheckIcon,
  CodeXmlIcon,
  GraduationCapIcon,
  InfoIcon,
  LockKeyholeIcon,
  SearchIcon,
  ShieldIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react"
import { z } from "zod"
import type { LinkProps } from "@tanstack/react-router"
import type { LucideIcon } from "lucide-react"

import eventPhoto1 from "@/assets/events/1.webp"
import eventPhoto2 from "@/assets/events/2.webp"
import eventPhoto3 from "@/assets/events/3.webp"
import eventPhoto4 from "@/assets/events/4.webp"
import eventPhoto5 from "@/assets/events/5.webp"
import logoUrl from "@/assets/nuspace_logo.svg"
import { beginLogin, sessionQueryOptions } from "@/features/auth/api"
import { EventPhotoCarousel } from "@/features/landing/components/event-photo-carousel"
import { Button } from "@/components/ui/button"
import { PageContainer } from "@/components/page-container"
import { PageHeader } from "@/components/page-header"
import { Section } from "@/components/section"
import { cn } from "@/lib/utils"

const landingSearchSchema = z.object({
  returnTo: z.string().optional(),
})

export const Route = createFileRoute("/_public/")({
  validateSearch: landingSearchSchema,
  beforeLoad: ({ context }) =>
    context.queryClient.ensureQueryData(sessionQueryOptions),
  component: Landing,
})

interface Product {
  title: string
  description: string
  to: LinkProps["to"]
  icon: LucideIcon
  accent: string
  iconClassName: string
  details: string[]
}

const PRODUCTS: Product[] = [
  {
    title: "Courses",
    description:
      "Track grades, compare course statistics, build a schedule, and understand your degree progress.",
    to: "/courses",
    icon: GraduationCapIcon,
    accent: "bg-primary",
    iconClassName: "bg-primary/10 text-primary",
    details: ["Live GPA", "Schedule builder", "Degree audit"],
  },
  {
    title: "Events",
    description:
      "See what is happening across campus and find events worth showing up for.",
    to: "/events",
    icon: CalendarIcon,
    accent: "bg-warning",
    iconClassName: "bg-warning/15 text-warning-foreground dark:text-warning",
    details: ["Campus calendar", "Recruitment", "Calendar export"],
  },
  {
    title: "Communities",
    description:
      "Find student groups and follow the communities you care about.",
    to: "/communities",
    icon: UsersIcon,
    accent: "bg-community",
    iconClassName: "bg-community/15 text-community",
    details: ["Student clubs", "Profiles", "Categories"],
  },
  {
    title: "Opportunities",
    description:
      "Browse internships, scholarships, competitions, and funded programs.",
    to: "/opportunities",
    icon: SparklesIcon,
    accent: "bg-warning",
    iconClassName: "bg-warning/15 text-warning-foreground dark:text-warning",
    details: ["Deadlines", "Eligibility", "Applications"],
  },
  {
    title: "Contacts",
    description:
      "Search essential university services, people, and emergency contacts.",
    to: "/contacts",
    icon: InfoIcon,
    accent: "bg-contact",
    iconClassName: "bg-contact/15 text-contact",
    details: ["Services", "Emergency contacts", "Search"],
  },
  {
    title: "SG otinish",
    description:
      "Send a request or appeal directly to Student Government and follow its status.",
    to: "/sgotinish",
    icon: ShieldIcon,
    accent: "bg-success",
    iconClassName: "bg-success/15 text-success",
    details: ["Requests", "Appeals", "Status tracking"],
  },
]

const ONBOARDING_STEPS = [
  {
    icon: LockKeyholeIcon,
    title: "Sign in with your NU account",
    description: "Use the same university identity you already know.",
  },
  {
    icon: SearchIcon,
    title: "Open the tool you need",
    description:
      "Courses, events, contacts, communities, and requests live in one place.",
  },
  {
    icon: CheckIcon,
    title: "Get things done on campus",
    description:
      "Move between campus tools without learning another portal or signing in again.",
  },
]

const EVENT_PHOTOS = [
  eventPhoto1,
  eventPhoto2,
  eventPhoto3,
  eventPhoto4,
  eventPhoto5,
] as const

function PrimaryCallToAction({
  isSignedIn,
  returnTo,
  final = false,
}: {
  isSignedIn: boolean
  returnTo?: string
  final?: boolean
}) {
  if (isSignedIn) {
    return (
      <Button
        size="lg"
        className="gap-2 px-6"
        render={
          <Link to="/announcements">
            Open Announcements
            <ArrowRightIcon className="size-5" aria-hidden />
          </Link>
        }
      />
    )
  }

  return (
    <Button
      size="lg"
      className="gap-2 px-6"
      onClick={() => {
        beginLogin(returnTo)
      }}
    >
      {final ? "Sign in with NU account" : "Open Nuspace"}
      <ArrowRightIcon className="size-5" aria-hidden />
    </Button>
  )
}

function Landing() {
  const { returnTo } = Route.useSearch()
  const { data: session } = useQuery(sessionQueryOptions)
  const isSignedIn = session != null

  return (
    <div className="overflow-hidden">
      <Section className="relative py-20 sm:py-28 lg:py-32">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-96 max-w-5xl bg-[radial-gradient(circle_at_center,color-mix(in_oklch,var(--primary),transparent_84%),transparent_68%)]"
          aria-hidden
        />
        <PageContainer maxWidth="default" className="text-center">
          <div className="mb-5 inline-flex items-center gap-2.5">
            <img src={logoUrl} alt="" aria-hidden className="size-8" />
            <span className="text-xl font-bold tracking-tight">Nuspace</span>
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl leading-tight font-bold tracking-tight sm:text-6xl">
            Track grades, find events, and{" "}
            <span className="text-primary">stay on top of campus</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Plan your semester with GPA insights, degree audits, course
            planning, and campus resources.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <PrimaryCallToAction isSignedIn={isSignedIn} returnTo={returnTo} />
            <a
              href="https://github.com/ulanpy/nuspace"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <CodeXmlIcon className="size-4" aria-hidden />
              View on GitHub
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
            <span>Open source</span>
            <span aria-hidden className="text-border">
              ·
            </span>
            <span>Web &amp; Telegram</span>
          </div>
        </PageContainer>
      </Section>

      <Section id="features" className="border-y border-border bg-card/35">
        <PageContainer>
          <PageHeader
            eyebrow="Campus toolkit"
            title="The useful parts of NU, brought together"
            description="Start with what you need now. Every tool uses the same navigation and account."
          />

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PRODUCTS.map((product) => {
              const Icon = product.icon

              return (
                <Link
                  key={product.title}
                  to={product.to}
                  className="group relative flex min-h-64 flex-col overflow-hidden rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm transition-[border-color,box-shadow,transform] duration-[var(--duration-panel)] ease-[var(--ease-campus-snap)] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span
                    className={cn(
                      "absolute inset-x-0 top-0 h-1",
                      product.accent
                    )}
                    aria-hidden
                  />
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={cn(
                        "grid size-11 place-items-center rounded-lg",
                        product.iconClassName
                      )}
                    >
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <ArrowRightIcon
                      className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
                      aria-hidden
                    />
                  </div>
                  <div className="mt-auto pt-8">
                    <h2 className="text-xl font-bold">{product.title}</h2>
                    <p className="mt-2 leading-relaxed text-muted-foreground">
                      {product.description}
                    </p>
                    <ul
                      className="mt-5 flex flex-wrap gap-2"
                      aria-label={`${product.title} tools`}
                    >
                      {product.details.map((detail) => (
                        <li
                          key={detail}
                          className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground"
                        >
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Link>
              )
            })}
          </div>
        </PageContainer>
      </Section>

      <Section>
        <PageContainer>
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-lg bg-warning/15 text-warning-foreground dark:text-warning">
                  <CalendarIcon className="size-5" aria-hidden />
                </span>
                <p className="text-sm font-semibold tracking-wider text-warning-foreground uppercase dark:text-warning">
                  Campus events
                </p>
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Know what is happening before you miss it
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                Browse upcoming events, recruitment announcements, and community
                activities in one campus calendar.
              </p>
              <ul className="mt-6 space-y-3 text-sm font-medium">
                {[
                  "Filter by date or type",
                  "Add events to your calendar",
                  "Discover student-led activities",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckIcon className="size-4 text-success" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                className="mt-6 gap-2"
                render={
                  <Link to="/events">
                    Browse campus events
                    <ArrowRightIcon className="size-4" aria-hidden />
                  </Link>
                }
              />
            </div>

            <div className="aspect-[4/3] overflow-hidden rounded-xl border border-border bg-card shadow-sm sm:aspect-video">
              <EventPhotoCarousel
                images={EVENT_PHOTOS}
                alt="Students taking part in a Nazarbayev University campus event"
              />
            </div>
          </div>
        </PageContainer>
      </Section>

      <Section className="border-t border-border bg-card/35">
        <PageContainer>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:items-start lg:gap-16">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary">
                  <BookOpenCheckIcon className="size-5" aria-hidden />
                </span>
                <p className="text-sm font-semibold tracking-wider text-primary uppercase">
                  Getting started
                </p>
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                One NU login, all your campus tools
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                Sign in once and move between the tools you need without
                learning another portal.
              </p>
            </div>

            <ol className="grid gap-7 sm:grid-cols-3">
              {ONBOARDING_STEPS.map((step, index) => {
                const Icon = step.icon

                return (
                  <li key={step.title}>
                    <div className="mb-5 flex items-center gap-3">
                      <span className="grid size-9 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {index + 1}
                      </span>
                      <Icon className="size-5 text-primary" aria-hidden />
                    </div>
                    <h3 className="font-bold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </li>
                )
              })}
            </ol>
          </div>

          <div className="mt-12 flex flex-col gap-5 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold">Ready when you are.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isSignedIn
                  ? "Catch up on what is happening across campus."
                  : "Sign in with your NU account to open your workspace."}
              </p>
            </div>
            <PrimaryCallToAction
              isSignedIn={isSignedIn}
              returnTo={returnTo}
              final
            />
          </div>
        </PageContainer>
      </Section>
    </div>
  )
}
