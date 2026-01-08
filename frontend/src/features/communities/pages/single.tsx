"use client";

import { Button } from "@/components/atoms/button";
import {
  Tabs,
  TabsContent,
} from "@/components/atoms/tabs";
import Image from "next/image";
import { Badge } from "@/components/atoms/badge";
import { VerificationBadge } from "@/components/molecules/verification-badge";
import { MarkdownContent } from '@/components/molecules/markdown-content';
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/atoms/avatar";
import { EventCard } from '@/features/events/components/event-card';
import { Card, CardContent, CardHeader } from "@/components/atoms/card";
import profilePlaceholder from "@/assets/svg/profile-placeholder.svg";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";


import {
  Mail,
  Calendar,
  ExternalLink,
  Settings,
  UserRoundPlus,
  Clock,
  Lightbulb,
} from "lucide-react";

import { Media } from "@/features/media/types/types";
import { useCommunity } from "@/features/communities/hooks/use-community";
import { useEvents } from '@/features/events/hooks/use-events'; // Import useEvents
import { Event } from "@/features/shared/campus/types";
import { useUser } from "@/hooks/use-user";

import { CommunityModal } from '@/features/communities/components/community-modal';
import { EventModal } from '@/features/events/components/event-modal';
import { AchievementsSection } from "../components/achievements-section";
import { AchievementsModal } from '@/features/communities/components/achievements-modal';
import { GallerySection } from '@/features/communities/components/gallery-section';
import { MediaFormat } from "@/features/media/types/types";

// Helpers
// const getUserInitials = (name?: string, surname?: string) => {
//   const first = (name?.trim()?.[0] || "").toUpperCase();
//   const last = (surname?.trim()?.[0] || "").toUpperCase();
//   const initials = `${first}${last}`;
//   return initials || "?";
// };

// Reusable EventsGrid component rendered as a horizontal carousel
const EventsGrid = ({
  isLoading,
  isError,
  events,
}: {
  isLoading: boolean;
  isError: boolean;
  events: Event[] | null;
}) => {
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return <div>Error loading events.</div>;
  }

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No events found</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          There are no events scheduled for this period.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-x-auto">
      <div className="flex items-stretch gap-4 pb-2 snap-x snap-mandatory">
        {(events || []).map((event) => (
          <div
            key={event.id}
            className="snap-start w-[195px] sm:w-[225px] md:w-[240px] flex-none"
          >
            <EventCard {...event} compact />
          </div>
        ))}
      </div>
    </div>
  );
};

export default function CommunityDetailPage() {
  const {
    community,
    permissions,
    isLoading: isCommunityLoading,
  } = useCommunity();
  const { user } = useUser();
  const [isEditCommunityModalOpen, setIsEditCommunityModalOpen] =
    useState(false);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [isEditAchievementsModalOpen, setIsEditAchievementsModalOpen] = useState(false);

  const queryClient = useQueryClient();

  // Use URL search params for tab persistence across page refreshes
  const searchParams = useSearchParams();
  const router = useRouter();
  const validTabs = ["about", "requests", "events", "gallery"];
  const tabFromUrl = searchParams?.get("tab");
  const activeTab = validTabs.includes(tabFromUrl || "") ? tabFromUrl! : "about";

  const setActiveTab = useCallback((tab: string) => {
    const newParams = new URLSearchParams(searchParams?.toString() || "");
    if (tab === "about") {
      newParams.delete("tab"); // Clean URL for default tab
    } else {
      newParams.set("tab", tab);
    }
    const queryString = newParams.toString();
    router.replace(queryString ? `?${queryString}` : window.location.pathname, { scroll: false });
  }, [searchParams, router]);

  const contentTopRef = useRef<HTMLDivElement | null>(null);

  const handleNavigate = (tabValue: string) => {
    setActiveTab(tabValue);
    // Smooth scroll to the content area so the selected tab is visible on mobile
    // Use a timeout to allow layout to settle if needed
    window.requestAnimationFrame(() => {
      contentTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  // // Reset achievements pagination when modal closes (after editing)
  useEffect(() => {
    if (!isEditAchievementsModalOpen && community?.id) {
      queryClient.invalidateQueries({
        queryKey: ["campusCurrent", "community", String(community.id), "achievements"],
      });
    }
  }, [isEditAchievementsModalOpen, community?.id, queryClient]);

  // Fetch events for this community
  const today = new Date().toISOString().split("T")[0];
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  })();

  // Fetch upcoming events
  const {
    events: upcomingEvents,
    isLoading: isLoadingUpcoming,
    isError: isErrorUpcoming,
  } = useEvents({
    start_date: today,
    community_id: community?.id ?? null,
    event_scope: "community",
    size: 20,
  });

  // Fetch past events
  const {
    events: pastEvents,
    isLoading: isLoadingPast,
    isError: isErrorPast,
  } = useEvents({
    start_date: "2000-01-01",
    end_date: yesterday,
    community_id: community?.id ?? null,
    event_scope: "community",
    size: 20,
  });

  // Fetch pending (requests) events
  const isHead = Boolean(permissions?.can_edit);
  const creatorSub = user?.user?.sub ?? null;
  const {
    events: pendingEvents,
    isLoading: isLoadingPending,
    isError: isErrorPending,
  } = useEvents({
    event_status: "pending",
    community_id: community?.id ?? null,
    event_scope: "community",
    creator_sub: isHead ? null : creatorSub,
    size: 20,
  });

  // Fallback: fetch recent community events without date filter, then split client-side
  const { events: recentCommunityEvents } = useEvents({
    community_id: community?.id ?? null,
    event_scope: "community",
    size: 50,
  });

  const upcomingList = useMemo(
    () => upcomingEvents?.items ?? [],
    [upcomingEvents]
  );
  const pendingList = useMemo(
    () => pendingEvents?.items ?? [],
    [pendingEvents]
  );
  const upcomingCount = (upcomingEvents as any)?.items?.length ?? 0;
  const upcomingHasMore = ((upcomingEvents as any)?.total_pages ?? 1) > 1;
  const pendingCount = (pendingEvents as any)?.items?.length ?? 0;
  const pendingHasMore = ((pendingEvents as any)?.total_pages ?? 1) > 1;
  const pastList = useMemo(() => {
    const serverPast = pastEvents?.items ?? [];
    if (serverPast.length > 0) return serverPast;
    const all = recentCommunityEvents?.items ?? [];
    const todayDate = new Date(today);
    return all.filter((e) => new Date(e.end_datetime) < todayDate);
  }, [pastEvents, recentCommunityEvents, today]);

  if (isCommunityLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-40 bg-muted rounded-md"></div>
        <div className="h-20 bg-muted rounded-full w-20 -mt-10 ml-4 border-4 border-background"></div>
        <div className="h-6 bg-muted rounded w-1/3"></div>
        <div className="h-4 bg-muted rounded w-1/4"></div>
        <div className="h-20 bg-muted rounded"></div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold">Community not found</h2>
        <p className="text-muted-foreground mt-2">
          The community you're looking for doesn't exist or has been removed.
        </p>
      </div>
    );
  }

  const banner = community.media?.find(
    (media: Media) =>
      media.entity_type === "communities" &&
      media.media_format === MediaFormat.banner
  );
  const profile = community.media?.find(
    (media: Media) =>
      media.entity_type === "communities" &&
      media.media_format === MediaFormat.profile
  );

  return (
    <div className="flex flex-col min-h-screen">
      {/* <Navbar /> */}
      <main className="flex-grow">
        <div className="container px-4 md:px-6">
          {/* Profile Header Card with Banner Background - Wallpaper Style */}
          <Card className="mb-6 overflow-hidden shadow-lg relative">
            {/* Banner Background - Responsive letterbox aspect ratios (less vertical height on larger screens) */}
            <div className="relative w-full aspect-video bg-gradient-to-r from-gray-500 to-white-500 ">
              {banner?.url ? (
                <Image
                  src={banner.url}
                  alt={community.name}
                  fill
                  sizes="(min-width: 1024px) 1024px, 100vw"
                  className="object-cover object-center"
                />
              ) : (
                <div
                  className="w-full h-full"
                  style={{
                    background:
                      "linear-gradient(90deg, #414757 0%, #B5B6BB 100%)",
                  }}
                />
              )}
              {/* Overlay for better text readability */}
              <div className="absolute inset-0 bg-black/20"></div>
            </div>

            {/* Profile Content: avatar overlaps, text sits below banner */}
            <div className="relative p-6">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                {/* Profile Image - Only element overlapping the banner */}
                <div className="-mt-12 md:-mt-16 w-28 h-28 md:w-36 md:h-36 rounded-full border-4 border-white overflow-hidden bg-white shadow-xl flex-shrink-0">
                  <Image
                    src={profile?.url || profilePlaceholder}
                    onError={(e) => {
                      e.currentTarget.src = profilePlaceholder;
                    }}
                    alt={community.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Profile Info */}
                <div className="flex-grow text-center md:text-left min-w-0 pt-0 md:pt-1">
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight break-words mb-3 md:mb-2 flex flex-col md:flex-row md:items-center md:gap-2">
                    <span className="w-full md:w-auto break-words" title={community.name}>
                      {community.name}
                    </span>
                    {community.verified && (
                      <VerificationBadge size={14} className="mt-2 md:mt-0 md:flex-shrink-0" />
                    )}
                  </h1>

                  {/* Tags */}
                  <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 mb-4">
                    <Badge variant="secondary" className="capitalize font-medium px-3 py-1">
                      {community.category}
                    </Badge>
                    <Badge variant="secondary" className="capitalize font-medium px-3 py-1">
                      {community.type}
                    </Badge>
                    <Badge
                      variant={community.recruitment_status === "open" ? "default" : "outline"}
                      className="capitalize font-medium px-3 py-1"
                    >
                      Recruitment {community.recruitment_status}
                    </Badge>
                  </div>

                  {/* Quick Info */}
                  <div className="text-sm text-muted-foreground space-y-1">
                    {community.email && (
                      <div className="flex items-center justify-center md:justify-start gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{community.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 w-full md:w-auto md:self-start md:ml-0 md:items-start">
                  {(() => {
                    const isOpen = community.recruitment_status === "open";
                    const link = community.recruitment_link || "";
                    if (isOpen && link) {
                      return (
                        <Button asChild className="w-full md:w-56 h-10 px-4 justify-center">
                          <a href={link} target="_blank" rel="noopener noreferrer">
                            <UserRoundPlus className="h-4 w-4 mr-2" />
                            Join Community
                          </a>
                        </Button>
                      );
                    }
                    if (!isOpen) {
                      return (
                        <Button
                          variant="secondary"
                          disabled
                          className="w-full md:w-56 h-10 px-4 justify-center"
                          title="This club is not currently recruiting"
                        >
                          <UserRoundPlus className="h-4 w-4 mr-2" />
                          Not Recruiting
                        </Button>
                      );
                    }
                    return (
                      <Button
                        variant="secondary"
                        disabled
                        className="w-full md:w-56 h-10 px-4 justify-center"
                        title="Recruitment link was not provided"
                      >
                        <UserRoundPlus className="h-4 w-4 mr-2" />
                        Join (link unavailable)
                      </Button>
                    );
                  })()}

                  {permissions?.can_edit && (
                    <Button
                      variant="outline"
                      onClick={() => setIsEditCommunityModalOpen(true)}
                      className="w-full md:w-56 h-10 px-4 justify-center"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Community
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-6">
            {/* Sidebar */}
            <div className="flex flex-col gap-4">

              {/* Commented out for future reference if I come up wiht something useful to display here */}

              {/* President Card
              <Card className="p-0 overflow-hidden order-1 lg:order-1">
                <div className="p-4 border-b">
                  <h3 className="font-semibold text-lg">President</h3>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={community.head_user?.picture || ""} />
                      <AvatarFallback className="text-lg">
                        {getUserInitials(
                          community.head_user?.name,
                          community.head_user?.surname
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-base">
                        {(community.head_user?.name || "").trim()}{" "}
                        {(community.head_user?.surname || "").trim()}
                      </p>
                      <p className="text-sm text-muted-foreground">Community Leader</p>
                    </div>
                  </div>
                </div>
              </Card> */}

              {/* Sidebar Navigation - after Connect on mobile */}
              <Card className="p-0 overflow-hidden order-3 lg:order-2">
                <div className="p-4 border-b">
                  <h3 className="font-semibold text-lg">Navigate</h3>
                </div>
                <nav className="p-2">
                  {(
                    [
                      { value: "about", label: "About", icon: "📋" },
                      // Requests tab shown above Events: visible to head always, or to creator only when they have pending
                      ...((isHead || (creatorSub && pendingCount > 0))
                        ? [{ value: "requests", label: "Requests", icon: "📝" }]
                        : []),
                      { value: "events", label: "Events", icon: "🎉" },
                      { value: "gallery", label: "Gallery", icon: "🖼️" },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.value}
                      onClick={() => handleNavigate(item.value)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors hover:bg-muted/50 appearance-none border-0 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${activeTab === item.value
                        ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/90"
                        : "text-foreground active:bg-muted/70 dark:active:bg-muted/30"
                        }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="font-medium truncate">{item.label}</span>
                      {item.value === "events" && (upcomingCount > 0 || upcomingHasMore) && (
                        <span
                          className="ml-auto inline-flex items-center gap-1 h-5 min-w-[1.25rem] px-2 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20"
                          title={`${upcomingCount}${upcomingHasMore ? '+' : ''} upcoming`}
                        >
                          <Clock className="h-3 w-3 animate-pulse" />
                          {upcomingCount}
                          {upcomingHasMore ? "+" : ""}
                        </span>
                      )}
                      {item.value === "requests" && (pendingCount > 0 || isHead) && (
                        <span
                          className="ml-auto inline-flex items-center gap-1 h-5 min-w-[1.25rem] px-2 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200"
                          title={`${pendingCount}${pendingHasMore ? '+' : ''} pending`}
                        >
                          <Clock className="h-3 w-3" />
                          {pendingCount}
                          {pendingHasMore ? "+" : ""}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </Card>
              {/* Social Links */}
              {(community.instagram_url || community.telegram_url) && (
                <Card className="p-0 overflow-hidden order-2 lg:order-3">
                  <div className="p-4 border-b">
                    <h3 className="font-semibold text-lg">Connect</h3>
                  </div>
                  <div className="p-2">
                    {community.instagram_url && (
                      <a
                        href={community.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-lg">📸</span>
                        <span className="font-medium">Instagram</span>
                        <ExternalLink className="h-4 w-4 ml-auto" />
                      </a>
                    )}
                    {community.telegram_url && (
                      <a
                        href={community.telegram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-lg">💬</span>
                        <span className="font-medium">Telegram</span>
                        <ExternalLink className="h-4 w-4 ml-auto" />
                      </a>
                    )}
                  </div>
                </Card>
              )}
            </div>
            {/* Main Content */}
            <div className="min-w-0">
              {/* Scroll target for smooth navigation */}
              <div ref={contentTopRef} className="h-0 scroll-mt-24 md:scroll-mt-28" />
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                {(isHead || (creatorSub && pendingCount >= 0)) && (
                  <TabsContent value="requests" className="mt-0">
                    <Card className="p-0 overflow-hidden mb-6">
                      <div className="p-6 border-b">
                        <h2 className="text-2xl font-bold">Requests</h2>
                      </div>
                      <div className="p-6">
                        <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg mb-4">
                          <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-yellow-800 dark:text-yellow-200">
                            {isHead
                              ? "Event requests are sent by all users. By default, they are not publicly visible. You should review each request and update the status by editing the event. Approved events will be visible to all users."
                              : "Your event status is pending. The community head will review it and update the status. Approved events will be visible to all users."}
                          </div>
                        </div>
                        <EventsGrid
                          isLoading={isLoadingPending}
                          isError={isErrorPending}
                          events={pendingList}
                        />
                      </div>
                    </Card>
                  </TabsContent>
                )}

                <TabsContent value="about" className="mt-0 flex flex-col gap-y-4" >
                  <Card className="p-0 overflow-hidden">
                    <div className="p-6 border-b">
                      <h2 className="text-2xl font-bold">About Us</h2>
                    </div>
                    <div className="p-6">
                      <div className="prose max-w-none">
                        <MarkdownContent
                          content={community.description}
                          fallback="No description available."
                        />
                      </div>

                      {/* Additional Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-6 border-t">
                        <div className="space-y-4">
                          <h3 className="font-semibold text-lg">Contact Information</h3>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <Mail className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-sm">Email</p>
                                {community.email ? (
                                  <a
                                    href={`mailto:${community.email}`}
                                    className="text-sm text-primary hover:underline"
                                  >
                                    {community.email}
                                  </a>
                                ) : (
                                  <span className="text-sm text-muted-foreground">
                                    Not provided
                                  </span>
                                )}
                              </div>
                            </div>
                            {community.established && (
                              <div className="flex items-center gap-3">
                                <Calendar className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <p className="font-medium text-sm">Founded</p>
                                  <p className="text-sm">{format(new Date(community.established), "PPP")}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="font-semibold text-lg">Community Type</h3>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Category</span>
                              <Badge variant="secondary" className="capitalize">
                                {community.category}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Type</span>
                              <Badge variant="secondary" className="capitalize">
                                {community.type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <AchievementsSection
                    communityId={community.id}
                    canEdit={Boolean(permissions?.can_edit)}
                    onEditAchievements={() => setIsEditAchievementsModalOpen(true)}
                  />
                </TabsContent>

                <TabsContent value="events" className="mt-0">
                  <Card className="p-0 overflow-hidden mb-6">
                    <div className="p-6 border-b">
                      <h2 className="text-2xl font-bold">Events</h2>
                    </div>
                    <div className="p-6">
                      <div className="space-y-8">
                        {/* Requests (Pending) - visible to community head or the creator (own requests only) */}
                        {(isHead ? pendingList.length > 0 : (creatorSub && pendingList.length > 0)) && (
                          <div>
                            <h3 className="text-xl font-semibold mb-4">Requests</h3>
                            <EventsGrid
                              isLoading={isLoadingPending}
                              isError={isErrorPending}
                              events={pendingList}
                            />
                          </div>
                        )}

                        <div>
                          <h3 className="text-xl font-semibold mb-4">Upcoming Events</h3>
                          <EventsGrid
                            isLoading={isLoadingUpcoming}
                            isError={isErrorUpcoming}
                            events={upcomingList}
                          />
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold mb-4">Past Events</h3>
                          <EventsGrid
                            isLoading={isLoadingPast}
                            isError={isErrorPast}
                            events={pastList}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card className="mt-8">
                    <CardHeader className="text-lg font-semibold">
                      Create event for this community
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Are you a club member? Create an event for this community!
                        Then wait for it to get approved by the club's President.
                      </p>
                      <Button
                        className="w-full"
                        onClick={() => setIsCreateEventModalOpen(true)}
                      >
                        Create Event
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="gallery" className="mt-0">
                  <GallerySection
                    communityId={community.id}
                    canEdit={Boolean(permissions?.can_edit)}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>

      {/* Community Edit Modal */}
      <CommunityModal
        isOpen={isEditCommunityModalOpen}
        onClose={() => setIsEditCommunityModalOpen(false)}
        isEditMode={true}
        community={community}
        permissions={permissions ?? undefined}
      />

      {/* Create Event Modal */}
      <EventModal
        isOpen={isCreateEventModalOpen}
        onClose={() => setIsCreateEventModalOpen(false)}
        isEditMode={false}
        communityId={community?.id}
        initialCommunity={community ?? undefined}
      />

      {/* Achievements Modal */}
      {community && (
        <AchievementsModal
          isOpen={isEditAchievementsModalOpen}
          onClose={() => setIsEditAchievementsModalOpen(false)}
          onSaved={() => {
            queryClient.invalidateQueries({
              queryKey: ["campusCurrent", "community", String(community.id), "achievements"],
            });
          }}
          communityId={community.id}
          initialAchievements={community.achievements || []}
        />
      )}
    </div>
  );
}
