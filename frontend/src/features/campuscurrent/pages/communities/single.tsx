"use client";
import { useParams } from "react-router-dom";
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
import { EventCard } from "@/features/campuscurrent/components/EventCard";
import { Card, CardContent, CardHeader } from "@/components/atoms/card";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Calendar,
  ExternalLink,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { LoginModal } from "@/components/molecules/login-modal";
import { useCommunity } from "@/features/campuscurrent/hooks/communities/use-community";
import { Event } from "@/features/campuscurrent/types/types";

// Helper function to get community type display text
const getCommunityTypeDisplay = (type: string) => {
  return type.charAt(0).toUpperCase() + type.slice(1);
};

export default function CommunityDetailPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useUser();

  const { community, isLoading } = useCommunity();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [communityEvents] = useState<Event[]>([]);
  const [activeTab, setActiveTab] = useState("about");
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  // Handle follow/unfollow
  const handleFollowToggle = () => {
    if (!user) {
      setPendingAction("follow");
      setShowLoginModal(true);
      return;
    }

    // Toggle following state
    setIsFollowing(!isFollowing);
    setFollowerCount(isFollowing ? followerCount - 1 : followerCount + 1);

    // Show toast
    toast({
      title: isFollowing ? "Unfollowed" : "Following",
      description: isFollowing
        ? `You unfollowed ${community?.name}`
        : `You are now following ${community?.name}`,
    });

    // In a real app, you would make an API call here
  };

  // Handle join community
  const handleJoinCommunity = () => {
    if (!user) {
      setPendingAction("join");
      setShowLoginModal(true);
      return;
    }

    // Show toast
    toast({
      title: "Request Sent",
      description: `Your request to join ${community?.name} has been sent.`,
    });

    // In a real app, you would make an API call here
  };

  // Handle login success
  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    if (pendingAction === "follow") {
      handleFollowToggle();
    } else if (pendingAction === "join") {
      handleJoinCommunity();
    }
    setPendingAction(null);
  };

  if (isLoading) {
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

  return (
    <div className="flex flex-col min-h-screen">
      {/* <Navbar /> */}
      <main className="flex-grow">
        <div className="h-48 md:h-64 bg-muted relative">
          <img
            src={community.coverImageUrl || "/placeholder.svg"}
            alt={community.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        </div>

        <div className="container px-4 md:px-6 relative">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end -mt-16 md:-mt-20 mb-6 relative z-10">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-background overflow-hidden bg-background">
              <img
                src={community.logoUrl || "/placeholder.svg"}
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
              <Button>Join community</Button>
              <Button variant="outline">Follow</Button>
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
              <TabsTrigger value="community" className="flex-1">
                Community
              </TabsTrigger>
              <TabsTrigger value="gallery" className="flex-1">
                Gallery
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
                        Interested in joining NU Tech Club? We're always looking
                        for passionate individuals!
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
                        <div
                          key={community.head_user}
                          className="flex items-center gap-4"
                        >
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={community.head_user.picture} />
                            <AvatarFallback>
                              {community.head_user.name.substring(0, 2)}{" "}
                              {community.head_user.surname.substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {community.head_user.name}{" "}
                              {community.head_user.surname}
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
                          <a
                            href={`mailto:${community.contactEmail}`}
                            className="text-sm text-primary hover:underline"
                          >
                            {community.contactEmail}
                          </a>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium">Founded</p>
                          <p className="text-sm">{community.established}</p>
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
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold mb-6">Upcoming Events</h2>
                  {communityEvents.length > 0 ? (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {communityEvents.map((event) => (
                        <EventCard key={event.id} {...event} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      No upcoming events at the moment. Check back later!
                    </p>
                  )}
                </div>

                <div>
                  <h2 className="text-2xl font-bold mb-6">Past Events</h2>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {communityEvents.map((event) => (
                      <EventCard key={event.id} {...event} />
                    ))}
                  </div>
                </div>
              </div>

              <Card>
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
            <h1 className="text-center">  Coming Soon!</h1>

              {/* <div className="grid gap-6 md:grid-cols-3">                
                <div className="space-y-6">
                  <Card>
                    <CardHeader className="text-lg font-semibold">Join the Conversation</CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Share your thoughts, ask questions, and connect with club members.
                      </p>
                      <Button className="w-full">Post to Community</Button>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="text-lg font-semibold">Community Guidelines</CardHeader>
                    <CardContent>
                      <ul className="text-sm space-y-2 list-disc pl-4">
                        <li>Be respectful and considerate</li>
                        <li>Stay on topic</li>
                        <li>No spam or self-promotion</li>
                        <li>Report inappropriate content</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div> */}
            </TabsContent>

            <TabsContent value="gallery" className="mt-6">
            <h1 className="text-center"> Coming Soon!</h1>

              {/* <div className="space-y-6">
                <h2 className="text-2xl font-bold">Club Gallery</h2>
                <p className="text-muted-foreground">
                  The gallery will display photos from club events and
                  activities. Connect Google Photos to display album content.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div
                      key={index}
                      className="aspect-square bg-muted rounded-md overflow-hidden"
                    >
                      <img
                        src="/placeholder.svg"
                        alt="Gallery placeholder"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>

                <div className="text-center">
                  <Button variant="outline" size="lg">
                    Load More Photos
                  </Button>
                </div>
              </div> */}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
        title="Login Required"
        message={
          pendingAction === "follow"
            ? "You need to be logged in to follow communities."
            : "You need to be logged in to join communities."
        }
      />
    </div>
  );
}
