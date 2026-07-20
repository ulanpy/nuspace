"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpenCheck,
  Calendar,
  Check,
  Github,
  GraduationCap,
  Info,
  LockKeyhole,
  Search,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "@/router/link";
import { Button } from "@/components/atoms/button";
import { useUser } from "@/hooks/use-user";
import { FeatureCarousel } from "@/components/molecules/feature-carousel";
import { ROUTES } from "@/data/routes";
import { cn } from "@/utils/utils";
import { PageContainer } from "@/components/atoms/page-container";
import { Section } from "@/components/atoms/section";
import eventImg1 from "@/assets/images/event_pics/1.webp";
import eventImg2 from "@/assets/images/event_pics/2.webp";
import eventImg3 from "@/assets/images/event_pics/3.webp";
import eventImg4 from "@/assets/images/event_pics/4.webp";
import eventImg5 from "@/assets/images/event_pics/5.webp";

const eventImages = [eventImg1, eventImg2, eventImg3, eventImg4, eventImg5];

interface Feature {
  title: string;
  description: string;
  link: string;
  icon: LucideIcon;
  className: string;
  iconClassName: string;
  stripClassName: string;
  details?: string[];
}

const features: Feature[] = [
  {
    title: "Courses",
    description:
      "Track grades, compare course statistics, build a schedule, and understand your degree progress.",
    link: ROUTES.COURSES,
    icon: GraduationCap,
    className: "md:col-span-2 lg:col-span-3",
    iconClassName: "bg-primary/10 text-primary",
    stripClassName: "bg-primary",
    details: ["Live GPA", "Schedule builder", "Degree audit"],
  },
  {
    title: "Events",
    description:
      "See what is happening across campus and find events worth showing up for.",
    link: ROUTES.EVENTS.ROOT,
    icon: Calendar,
    className: "md:col-span-2 lg:col-span-3",
    iconClassName:
      "bg-warning/15 text-warning-foreground dark:text-warning",
    stripClassName: "bg-warning",
    details: ["Campus calendar", "Recruitment", "Calendar export"],
  },
  {
    title: "Communities",
    description:
      "Find student groups and follow the communities you care about.",
    link: ROUTES.COMMUNITIES.ROOT,
    icon: Users,
    className: "md:col-span-1 lg:col-span-2",
    iconClassName: "bg-community/15 text-community",
    stripClassName: "bg-community",
    details: ["Student clubs", "Recruitment", "Community events"],
  },
  {
    title: "Contacts",
    description:
      "Search essential university services, people, and emergency contacts.",
    link: ROUTES.CONTACTS,
    icon: Info,
    className: "md:col-span-1 lg:col-span-2",
    iconClassName: "bg-contact/15 text-contact",
    stripClassName: "bg-contact",
    details: ["Services", "Emergency contacts", "Search"],
  },
  {
    title: "SG otinish",
    description:
      "Send a request or appeal directly to Student Government and follow its status.",
    link: ROUTES.SGOTINISH.ROOT,
    icon: Shield,
    className: "md:col-span-1 lg:col-span-2",
    iconClassName: "bg-success/15 text-success",
    stripClassName: "bg-success",
    details: ["Requests", "Appeals", "Status tracking"],
  },
];

const onboardingSteps = [
  {
    icon: LockKeyhole,
    title: "Sign in with your NU account",
    description: "Use the same university identity you already know.",
  },
  {
    icon: Search,
    title: "Open the tool you need",
    description:
      "Courses, events, contacts, communities, and requests live in one place.",
  },
  {
    icon: Check,
    title: "Get things done on campus",
    description:
      "Courses, events, contacts, and requests — all accessible from one account.",
  },
];

export default function LandingPage() {
  const { login } = useUser();

  return (
    <div className="flex flex-col bg-background text-foreground">
      <main>
        <section className="relative overflow-hidden py-24 sm:py-32 lg:py-40">
          <PageContainer className="text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Built by NU students, for NU students
            </div>

            <h1 className="mx-auto mb-6 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Track grades, find events, and{" "}
              <span className="text-primary">stay on top of campus</span>
            </h1>

            <p className="mx-auto mb-9 max-w-[65ch] text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Nuspace brings together academics, events, communities, and
              campus services at Nazarbayev University. Sign in with your
              NU account and get started.
            </p>

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild className="gap-2 px-8 text-base">
                <Link href={ROUTES.ANNOUNCEMENTS}>
                  Open Nuspace
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="px-8 text-base"
              >
                <a
                  href="https://github.com/ulanpy/nuspace"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on GitHub
                </a>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-success" aria-hidden="true" />
                NU account sign-in
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-success" aria-hidden="true" />
                Web and Telegram access
              </span>
            </div>
          </PageContainer>
        </section>

        <Section
          id="features"
          className="scroll-mt-8"
        >
          <PageContainer maxWidth="wide">
            <div className="mb-10 max-w-2xl">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.08em] text-primary">
                Campus toolkit
              </p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                The useful parts of NU, brought together
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                Start with what you need now. Every tool uses the same
                navigation and account.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              {features.map((feature) => {
                const Icon = feature.icon;

                return (
                  <Link
                    key={feature.title}
                    href={feature.link}
                    className={cn(
                      "group relative flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card p-6 text-card-foreground transition-[border-color,box-shadow,transform] duration-[var(--duration-panel)] ease-[var(--ease-campus-snap)] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:min-h-56",
                      feature.className,
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute inset-x-0 top-0 h-1",
                        feature.stripClassName,
                      )}
                    />
                    <div className="relative z-10 mb-8 flex items-start justify-between gap-4">
                      <div
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-md",
                          feature.iconClassName,
                        )}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <ArrowRight
                        className="h-5 w-5 text-muted-foreground transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5 group-hover:text-primary"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="relative z-10 mt-auto">
                      <h3 className="text-xl font-bold">{feature.title}</h3>
                      <p className="mt-2 max-w-[52ch] leading-relaxed text-muted-foreground">
                        {feature.description}
                      </p>
                      {feature.details && (
                        <ul
                          className="mt-5 flex flex-wrap gap-2"
                          aria-label={feature.title + " tools"}
                        >
                          {feature.details.map((detail) => (
                            <li
                              key={detail}
                              className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground"
                            >
                              {detail}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </PageContainer>
        </Section>

        <Section>
          <PageContainer maxWidth="wide">
            <div className="grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <div>
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-warning/15 text-warning-foreground dark:text-warning">
                    <Calendar className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-semibold uppercase tracking-[0.08em] text-warning-foreground dark:text-warning">
                    Campus events
                  </p>
                </div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Know what is happening before you miss it
                </h2>
                <p className="mt-4 max-w-[60ch] text-lg leading-relaxed text-muted-foreground">
                  Browse upcoming events, recruitment announcements, and community
                  activities in one campus calendar.
                </p>
                <ul className="mt-6 space-y-3 text-sm font-medium">
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-success" aria-hidden="true" />
                    Filter by date, type, or community
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-success" aria-hidden="true" />
                    Add events to your calendar
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-success" aria-hidden="true" />
                    Discover student-led activities
                  </li>
                </ul>
                <Button variant="outline" asChild className="mt-6 gap-2">
                  <Link href={ROUTES.EVENTS.ROOT}>
                    Browse campus events
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>

              <div className="aspect-[4/3] overflow-hidden rounded-lg border bg-card shadow-sm sm:aspect-video">
                <FeatureCarousel
                  images={eventImages}
                  alt="Students taking part in a Nazarbayev University campus event"
                />
              </div>
            </div>
          </PageContainer>
        </Section>

        <Section>
          <PageContainer maxWidth="wide">
            <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-start lg:gap-16">
              <div>
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <BookOpenCheck className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-semibold uppercase tracking-[0.08em] text-primary">
                    Getting started
                  </p>
                </div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  One NU login, all your campus tools
                </h2>
                <p className="mt-4 max-w-[58ch] text-lg leading-relaxed text-muted-foreground">
                  Sign in once and move between the tools you need without
                  learning another portal.
                </p>
              </div>

              <ol className="grid gap-6 sm:grid-cols-3">
                {onboardingSteps.map((step, index) => {
                  const Icon = step.icon;

                  return (
                    <li key={step.title} className="relative pt-1">
                      <div className="mb-5 flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                          {index + 1}
                        </span>
                        <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                      </div>
                      <h3 className="font-bold">{step.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="mt-12 flex flex-col gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold">Ready when you are.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sign in with your NU account to open your workspace.
                </p>
              </div>
              <Button size="lg" onClick={login} className="gap-2 sm:self-auto">
                Sign in with NU account
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>
          </PageContainer>
        </Section>
      </main>

      <footer className="border-t bg-background text-sm text-muted-foreground">
        <PageContainer
          as="div"
          className="flex flex-col items-center justify-between gap-5 py-8 md:flex-row"
        >
          <p>© {new Date().getFullYear()} Nuspace. Built for the NU community.</p>
          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap justify-center gap-x-6 gap-y-3"
          >
            <Link
              href={ROUTES.ABOUT}
              className="transition-colors hover:text-foreground"
            >
              About
            </Link>
            <Link
              href={ROUTES.PRIVACY_POLICY}
              className="transition-colors hover:text-foreground"
            >
              Privacy Policy
            </Link>
            <Link
              href={ROUTES.TERMS_OF_SERVICE}
              className="transition-colors hover:text-foreground"
            >
              Terms of Service
            </Link>
            <a
              href="https://github.com/ulanpy/nuspace"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
            >
              Open source
              <Github className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </nav>
        </PageContainer>
      </footer>
    </div>
  );
}
