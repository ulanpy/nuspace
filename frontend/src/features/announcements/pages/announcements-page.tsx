"use client";

import { ArrowRight, Calendar, Users } from "lucide-react";
import Link from "@/router/link";
import { useUser } from "@/hooks/use-user";
import { TelegramFeed } from "@/features/announcements/components/telegram-feed";
import { useAnnouncementsBundle } from "@/features/announcements/api/use-announcements-bundle";
import { PresidentialElectionBanner } from "@/features/elections/presidential-election-banner";
import { FadeInImage } from "@/components/shared/fade-in-image";
import { FeaturedEventCard } from "@/features/announcements/components/featured-event-card";
import {
  EventPosterStrip,
  EventPosterStripSkeleton,
} from "@/features/announcements/components/event-poster-strip";
import {
  RecruitmentEventRow,
  RecruitmentEventRowSkeleton,
} from "@/features/announcements/components/recruitment-event-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/data/routes";
import type { Event } from "@/features/shared/campus/types";

/** Flip to `true` when you want the election block back on announcements. */
const SHOW_PRESIDENTIAL_ELECTION_BANNER = false;
const STRIP_LIMIT = 6;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function isEventOngoing(event: Event) {
  const now = Date.now();
  const start = new Date(event.start_datetime).getTime();
  const end = new Date(event.end_datetime).getTime();
  return start <= now && end > now;
}

function pickFeaturedEvent(events: Event[]): {
  featured: Event | null;
  rest: Event[];
} {
  if (events.length === 0) {
    return { featured: null, rest: [] };
  }

  const ongoingIndex = events.findIndex(isEventOngoing);
  const featuredIndex = ongoingIndex >= 0 ? ongoingIndex : 0;
  const featured = events[featuredIndex];
  const rest = events.filter((_, index) => index !== featuredIndex).slice(0, STRIP_LIMIT);

  return { featured, rest };
}

export default function AnnouncementsPage() {
  const { user } = useUser();
  const greeting = getGreeting();

  const { data: bundle, isLoading: bundleLoading } = useAnnouncementsBundle();

  const upcomingEvents = ((bundle?.events?.items || []) as Event[]).filter(
    (event) => event.type !== "recruitment",
  );
  const recruitmentEvents = (bundle?.recruitment_events?.items ?? []) as Event[];
  const { featured, rest } = pickFeaturedEvent(upcomingEvents);

  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      {SHOW_PRESIDENTIAL_ELECTION_BANNER ? <PresidentialElectionBanner /> : null}

      <div className="flex items-center gap-4">
        {user?.picture ? (
          <FadeInImage
            src={user.picture}
            alt=""
            priority
            className="h-12 w-12 rounded-full sm:h-14 sm:w-14"
          />
        ) : null}
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            {greeting}, {user?.name || "there"}!
          </h1>
          <p className="text-muted-foreground">Here's what's happening at Nuspace</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Current Events</h2>
              <Button asChild variant="link" size="sm" className="h-auto gap-1 px-0">
                <Link href={ROUTES.EVENTS.ROOT}>
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            {bundleLoading ? (
              <div className="space-y-4">
                <Card>
                  <CardContent className="flex gap-4 p-4 sm:gap-5 sm:p-5">
                    <Skeleton className="aspect-[3/4] w-28 flex-shrink-0 rounded-lg sm:w-36" />
                    <div className="flex-1 space-y-3">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-2/5" />
                    </div>
                  </CardContent>
                </Card>
                <EventPosterStripSkeleton />
              </div>
            ) : featured ? (
              <div className="space-y-4">
                <FeaturedEventCard event={featured} isOngoing={isEventOngoing(featured)} />
                {rest.length > 0 ? (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">More upcoming</p>
                      <EventPosterStrip events={rest} />
                    </div>
                  </>
                ) : null}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">No upcoming events</p>
                  <Button asChild variant="link" className="mt-2">
                    <Link href={ROUTES.EVENTS.ROOT}>Browse all events</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Club Recruitments</h2>
              <Button asChild variant="link" size="sm" className="h-auto gap-1 px-0">
                <Link href={ROUTES.EVENTS.ROOT}>
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            {bundleLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <RecruitmentEventRowSkeleton key={idx} />
                ))}
              </div>
            ) : recruitmentEvents.length > 0 ? (
              <div className="space-y-3">
                {recruitmentEvents.map((event) => (
                  <RecruitmentEventRow key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <Users className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">No recruitment events right now</p>
                  <Button asChild variant="link" className="mt-2">
                    <Link href={ROUTES.EVENTS.ROOT}>Browse all events</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>
        </div>

        <div className="lg:col-span-1">
          <TelegramFeed />
        </div>
      </div>
    </div>
  );
}
