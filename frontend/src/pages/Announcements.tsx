"use client";

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ArrowRight, Users } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useEvents } from "@/features/events/hooks/useEvents";
import { ROUTES } from "@/data/routes";
import { TelegramFeed } from "@/features/announcements/components/TelegramFeed";
import { campuscurrentAPI } from "@/features/communities/api/communitiesApi";

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
}

export default function Announcements() {
    const { user } = useUser();
    const greeting = getGreeting();

    // Fetch upcoming events
    const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
    const { events: eventsData, isLoading: eventsLoading } = useEvents({
        start_date: todayStr,
        size: 5
    });

    const upcomingEvents = eventsData?.events || [];
    const { data: recruitingCommunitiesData, isLoading: recruitingLoading } = useQuery(
        campuscurrentAPI.getCommunitiesQueryOptions({
            page: 1,
            size: 5,
            recruitment_status: "open",
        })
    );
    const recruitingCommunities = recruitingCommunitiesData?.communities ?? [];

    return (
        <div className="container mx-auto px-4 py-8 space-y-8">
            {/* Welcome Header */}
            <div className="flex items-center gap-4">
                {user?.picture && (
                    <img
                        src={user.picture}
                        alt=""
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full"
                    />
                )}
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">
                        {greeting}, {user?.given_name || "there"}!
                    </h1>
                    <p className="text-muted-foreground">Here's what's happening at Nuspace</p>
                </div>
            </div>

            {/* Main content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Events Widget */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Upcoming Events</h2>
                            <Link
                                to={ROUTES.EVENTS.ROOT}
                                className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                                View all <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>

                        {eventsLoading ? (
                            <div className="h-40 rounded-xl bg-muted animate-pulse" />
                        ) : upcomingEvents.length > 0 ? (
                            <div className="space-y-3">
                                {upcomingEvents.slice(0, 5).map((event: any) => (
                                    <Link
                                        key={event.id}
                                        to={ROUTES.EVENTS.DETAIL_FN(String(event.id))}
                                        className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
                                    >
                                        {event.media?.[0]?.url ? (
                                            <img
                                                src={event.media[0].url}
                                                alt={event.name}
                                                className="w-16 h-16 rounded-lg object-cover"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Calendar className="w-6 h-6 text-primary" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium truncate">{event.name}</h3>
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
                                    to={ROUTES.EVENTS.ROOT}
                                    className="inline-block mt-3 text-sm text-primary hover:underline"
                                >
                                    Browse all events
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Communities recruiting now */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Communities recruiting now</h2>
                            <Link
                                to={{
                                    pathname: ROUTES.COMMUNITIES.ROOT,
                                    search: "recruitment_status=open",
                                }}
                                className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                                View all <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>

                        {recruitingLoading ? (
                            <div className="space-y-3">
                                {Array.from({ length: 3 }).map((_, idx) => (
                                    <div key={idx} className="h-20 rounded-xl bg-muted animate-pulse" />
                                ))}
                            </div>
                        ) : recruitingCommunities.length > 0 ? (
                            <div className="space-y-3">
                                {recruitingCommunities.map((community: any) => (
                                    <Link
                                        key={community.id}
                                        to={ROUTES.COMMUNITIES.DETAIL_FN(String(community.id))}
                                        className="flex items-start gap-3 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
                                    >
                                        {community.media?.[0]?.url ? (
                                            <img
                                                src={community.media[0].url}
                                                alt={community.name}
                                                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Users className="w-6 h-6 text-primary" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium truncate">{community.name}</h3>
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {community.description}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                                                <span className="capitalize">{community.category}</span>
                                                <span className="capitalize px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                                    {community.recruitment_status}
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
                                <p className="text-muted-foreground">No communities are recruiting right now</p>
                                <Link
                                    to={{
                                        pathname: ROUTES.COMMUNITIES.ROOT,
                                        search: "recruitment_status=open",
                                    }}
                                    className="inline-block mt-3 text-sm text-primary hover:underline"
                                >
                                    Browse all communities
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Telegram Feed - spans 1 column */}
                <div className="lg:col-span-1">
                    <TelegramFeed />
                </div>
            </div>
        </div>
    );
}
