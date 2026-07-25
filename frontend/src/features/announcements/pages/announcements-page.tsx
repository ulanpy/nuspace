"use client";

import Link from "@/router/link";
import { Calendar, ArrowRight, Users } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { TelegramFeed } from '@/features/announcements/components/telegram-feed';
import { useAnnouncementsBundle } from "@/features/announcements/api/use-announcements-bundle";
import { PresidentialElectionBanner } from "@/features/elections/presidential-election-banner";
import { FadeInImage } from "@/components/shared/fade-in-image";

/** Flip to `true` when you want the election block back on announcements. */
const SHOW_PRESIDENTIAL_ELECTION_BANNER = false;

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
}

function isEventOngoing(event: any) {
    const now = Date.now();
    const start = new Date(event.start_datetime).getTime();
    const end = new Date(event.end_datetime).getTime();
    return start <= now && end > now;
}

function EventRowSkeleton({ thumbClassName }: { thumbClassName: string }) {
    return (
        <div className="flex items-center gap-4 p-4 rounded-xl border bg-card">
            <div className={`${thumbClassName} animate-pulse rounded-lg bg-muted`} />
            <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            </div>
        </div>
    );
}

export default function AnnouncementsPage() {
    const { user } = useUser();
    const greeting = getGreeting();

    const { data: bundle, isLoading: bundleLoading } = useAnnouncementsBundle();

    const upcomingEvents = (bundle?.events?.items || []).filter(
        (event: any) => event.type !== "recruitment"
    );
    const recruitmentEvents = bundle?.recruitment_events?.items ?? [];

    return (
        <div className="container mx-auto px-4 py-8 space-y-8">
            {SHOW_PRESIDENTIAL_ELECTION_BANNER ? <PresidentialElectionBanner /> : null}

            <div className="flex items-center gap-4">
                {user?.picture && (
                    <FadeInImage
                        src={user.picture}
                        alt=""
                        priority
                        className="h-12 w-12 sm:h-14 sm:w-14 rounded-full"
                    />
                )}
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">
                        {greeting}, {user?.given_name || "there"}!
                    </h1>
                    <p className="text-muted-foreground">Here's what's happening at Nuspace</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Current Events</h2>
                            <Link
                                href="/events"
                                className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                                View all <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>

                        {bundleLoading ? (
                            <div className="space-y-3">
                                {Array.from({ length: 3 }).map((_, idx) => (
                                    <EventRowSkeleton key={idx} thumbClassName="h-16 w-16 flex-shrink-0" />
                                ))}
                            </div>
                        ) : upcomingEvents.length > 0 ? (
                            <div className="space-y-3">
                                {upcomingEvents.slice(0, 5).map((event: any, index: number) => (
                                    <Link
                                        key={event.id}
                                        href={`/events/?id=${event.id}`}
                                        className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
                                    >
                                        {event.media?.[0]?.url ? (
                                            <FadeInImage
                                                src={event.media[0].url}
                                                alt={event.name}
                                                priority={index < 2}
                                                className="h-16 w-16 flex-shrink-0 rounded-lg"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                <Calendar className="w-6 h-6 text-primary" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-medium truncate flex-1">{event.name}</h3>
                                                {isEventOngoing(event) && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 flex-shrink-0">
                                                        Ongoing
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(event.start_datetime).toLocaleDateString()} • {event.place}
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center rounded-xl border bg-card">
                                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                                <p className="text-muted-foreground">No upcoming events</p>
                                <Link
                                    href="/events"
                                    className="inline-block mt-3 text-sm text-primary hover:underline"
                                >
                                    Browse all events
                                </Link>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Now Recruiting</h2>
                            <Link
                                href="/events"
                                className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                                View all <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>

                        {bundleLoading ? (
                            <div className="space-y-3">
                                {Array.from({ length: 3 }).map((_, idx) => (
                                    <EventRowSkeleton key={idx} thumbClassName="h-12 w-12 flex-shrink-0" />
                                ))}
                            </div>
                        ) : recruitmentEvents.length > 0 ? (
                            <div className="space-y-3">
                                {recruitmentEvents.map((event: any) => (
                                    <Link
                                        key={event.id}
                                        href={`/events/?id=${event.id}`}
                                        className="flex items-start gap-3 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
                                    >
                                        {event.media?.[0]?.url ? (
                                            <FadeInImage
                                                src={event.media[0].url}
                                                alt={event.name}
                                                className="h-12 w-12 flex-shrink-0 rounded-lg"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                <Users className="w-6 h-6 text-primary" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium truncate">{event.name}</h3>
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {event.place}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                                                <span>
                                                    {new Date(event.start_datetime).toLocaleDateString()}
                                                </span>
                                                <span className="capitalize px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                                    Recruitment
                                                </span>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 text-center rounded-xl border bg-card">
                                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                                <p className="text-muted-foreground">No recruitment events right now</p>
                                <Link
                                    href="/events"
                                    className="inline-block mt-3 text-sm text-primary hover:underline"
                                >
                                    Browse all events
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <TelegramFeed />
                </div>
            </div>
        </div>
    );
}
