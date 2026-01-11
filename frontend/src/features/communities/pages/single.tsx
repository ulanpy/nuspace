"use client";

import { Button } from "@/components/atoms/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
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
  const validTabs = ["about", "events"];
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

  const upcomingCount = (upcomingEvents as any)?.items?.length ?? 0;
  const upcomingHasMore = ((upcomingEvents as any)?.total_pages ?? 1) > 1;
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
        <div className="container px-4 md:px-20 lg:px-32">
          {/* Profile Header Card with Banner Background - Wallpaper Style */}
          <Card className="mb-6 overflow-hidden shadow-lg relative">
            <div className="relative w-full aspect-video bg-gradient-to-r from-gray-200 to-gray-500">
              {banner?.url ? (
                <Image
                  src={banner.url}
                  alt={community.name}
                  fill
                  className="object-cover object-center"
                />
              ) : null}
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

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {community.email && (
                      <div className="flex items-center justify-center md:justify-start gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={`mailto:${community.email}`}
                          className="text-primary hover:underline"
                        >
                          {community.email}
                        </a>
                      </div>
                    )}
                    {community.established && (
                      <div className="flex items-center justify-center md:justify-start gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Founded {format(new Date(community.established), "PPP")}
                        </span>
                      </div>
                    )}
                    {community.instagram_url && (
                      <div className="flex items-center justify-center md:justify-start gap-2">
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={community.instagram_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Instagram
                        </a>
                      </div>
                    )}
                    {community.telegram_url && (
                      <div className="flex items-center justify-center md:justify-start gap-2">
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={community.telegram_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Telegram
                        </a>
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

          {/* Pill-style Tabbar */}
          <Tabs value={activeTab} onValueChange={handleNavigate} className="w-full">
            <div className="flex justify-center mb-6">
              <TabsList className="inline-flex rounded-full bg-muted/60 p-1">
                <TabsTrigger
                  value="about"
                  className="flex items-center gap-2 rounded-full px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Lightbulb className="h-4 w-4" />
                  <span>About</span>
                </TabsTrigger>
                <TabsTrigger
                  value="events"
                  className="flex items-center gap-2 rounded-full px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Calendar className="h-4 w-4" />
                  <span>Events</span>
                  {(upcomingCount > 0 || upcomingHasMore) && (
                    <span
                      className="inline-flex items-center gap-1 h-5 min-w-[1.25rem] px-1.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20"
                      title={`${upcomingCount}${upcomingHasMore ? '+' : ''} upcoming`}
                    >
                      <Clock className="h-3 w-3" />
                      {upcomingCount}{upcomingHasMore ? "+" : ""}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Scroll target for smooth navigation */}
            <div ref={contentTopRef} className="h-0 scroll-mt-24 md:scroll-mt-28" />

            <div className="w-full">
              {/* Main Content */}
              <div className="min-w-0">
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
                    </div>
                  </Card>

                  <GallerySection
                    communityId={community.id}
                    canEdit={Boolean(permissions?.can_edit)}
                  />

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
              </div>
            </div>
          </Tabs>
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
