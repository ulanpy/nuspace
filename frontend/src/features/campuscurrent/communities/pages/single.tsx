"use client";

// import { Navbar } from "@/components/Navbar";
// import { Footer } from "@/components/Footer";
import { Button } from "@/components/atoms/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/atoms/tabs";
import { Badge } from "@/components/atoms/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/atoms/avatar";
import { EventCard } from "@/features/campuscurrent/events/components/EventCard";
import { Card, CardContent, CardHeader } from "@/components/atoms/card";

import { useMemo, useState } from "react";

import { Mail, Calendar, ExternalLink, Settings } from "lucide-react";


import { Media } from "@/features/media/types/types";
import { useCommunity } from "@/features/campuscurrent/communities/hooks/use-community";
import { useEvents } from "@/features/campuscurrent/events/hooks/useEvents"; // Import useEvents
import { Event } from "@/features/campuscurrent/types/types";

import { CommunityModal } from "@/features/campuscurrent/communities/components/CommunityModal";
import { MediaFormat } from "@/features/media/types/types";

// Helpers
const getUserInitials = (name?: string, surname?: string) => {
  const first = (name?.trim()?.[0] || "").toUpperCase();
  const last = (surname?.trim()?.[0] || "").toUpperCase();
  const initials = `${first}${last}`;
  return initials || "?";
};



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
      <div className="flex gap-4 pb-2 snap-x snap-mandatory">
        {(events || []).map((event) => (
          <div key={event.id} className="snap-start min-w-[240px] sm:min-w-[280px] md:min-w-[300px]">
            <EventCard {...event} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default function CommunityDetailPage() {


  const { community, permissions, isLoading: isCommunityLoading } = useCommunity();
  const [isEditCommunityModalOpen, setIsEditCommunityModalOpen] = useState(false);



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

  const upcomingList = useMemo(() => upcomingEvents?.events ?? [], [upcomingEvents]);
  const pastList = useMemo(() => {
    const serverPast = pastEvents?.events ?? [];
    if (serverPast.length > 0) return serverPast;
    const all = recentCommunityEvents?.events ?? [];
    const todayDate = new Date(today);
    return all.filter((e) => new Date(e.event_datetime) < todayDate);
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
      media.entity_type === "communities" && media.media_format === MediaFormat.banner
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
        <div className="h-48 md:h-64 bg-muted relative">
          <img
            src={banner?.url || "/placeholder.svg"}
            alt={community.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        </div>

        <div className="container px-4 md:px-6 relative">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end -mt-16 md:-mt-20 mb-6 relative z-10">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-background overflow-hidden bg-background">
              <img
                src={profile?.url || "/placeholder.svg"}
                alt={community.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-grow">
              <Badge>{community.category}</Badge>
              <Badge>Recruitment: {community.recruitment_status}</Badge>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {community.name}
              </h1>
            </div>
            <div className="flex gap-2 mt-4 md:mt-0">
              {permissions?.can_edit && (
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditCommunityModalOpen(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Community
                </Button>
              )}
            </div>
          </div>

          <Tabs defaultValue="about" className="mt-6">
            <TabsList className="w-full max-w-3xl">
              <TabsTrigger value="about" className="flex-1">
                About
              </TabsTrigger>
              <TabsTrigger value="events" className="flex-1">
                Events
              </TabsTrigger>
              <TabsTrigger value="community" className="flex-1 opacity-50 cursor-not-allowed" disabled>
                Subspace (Soon)
              </TabsTrigger>
              <TabsTrigger value="gallery" className="flex-1 opacity-50 cursor-not-allowed" disabled>
                Gallery (Soon)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="mt-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                  <div className="prose max-w-none">
                    <h2 className="text-xl font-semibold mb-4">About Us</h2>
                    <p>{community.description}</p>
                  </div>
                  <Card>
                    <CardHeader className="text-lg font-semibold">
                      Recruitment
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Interested in joining {community.name}? Click the button below to apply to join.
                      </p>
                      <Button className="w-full">Apply to Join</Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card>
                    <CardHeader className="text-lg font-semibold">
                      President
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={community.head_user?.picture || ""} />
                            <AvatarFallback>
                              {getUserInitials(
                                community.head_user?.name,
                                community.head_user?.surname,
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {(community.head_user?.name || "").trim()} {(community.head_user?.surname || "").trim()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="text-lg font-semibold">
                      Contact & Info
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium">Email</p>
                          {community.head_user?.name ? (
                            <a
                              href={`mailto:${community.head_user.name}@example.com`}
                              className="text-sm text-primary hover:underline"
                            >
                              {community.head_user.name}@example.com
                            </a>
                          ) : (
                            <span className="text-sm text-muted-foreground">Not provided</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium">Founded</p>
                          <p className="text-sm">{community.established || "-"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="text-lg font-semibold">
                      Social Media
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <a
                        href={community.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
                      >
                        <span>Instagram</span>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <a
                        href={community.telegram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
                      >
                        <span>Telegram</span>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="events" className="mt-6">
              <div className="space-y-12">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Upcoming Events</h2>
                  <EventsGrid isLoading={isLoadingUpcoming} isError={isErrorUpcoming} events={upcomingList} />
                </div>

                <div>
                  <h2 className="text-2xl font-bold mb-2">Past Events</h2>
                  <EventsGrid isLoading={isLoadingPast} isError={isErrorPast} events={pastList} />
                </div>
              </div>

              <Card className="mt-8">
                <CardHeader className="text-lg font-semibold">
                  Create event for this community
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Are you a club member? Create an event for this community!
                  </p>
                  <Button className="w-full">Create Event</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="community" className="mt-6">
              <h1 className="text-center"> Coming Soon!</h1>
            </TabsContent>

            <TabsContent value="gallery" className="mt-6">
              <h1 className="text-center"> Coming Soon!</h1>
            </TabsContent>
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
    </div>
  );
}