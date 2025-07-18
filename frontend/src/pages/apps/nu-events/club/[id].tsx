"use client";

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Users,
  Calendar,
  Instagram,
  MessageCircle,
  Heart,
  ExternalLink,
  Edit,
  Plus,
} from "lucide-react";
import { Button } from "../../../../components/atoms/button";
import { Badge } from "../../../../components/atoms/badge";
import { Card, CardContent } from "../../../../components/atoms/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../../components/atoms/tabs";
import { useToast } from "../../../../hooks/use-toast";
import { useUser } from "../../../../hooks/use-user";
import { LoginModal } from "../../../../components/molecules/login-modal";
import { useCommunity } from "@/modules/nu-events/clubs/api/hooks/use-cummunity";
import { EditCommunityModal } from "@/components/molecules/edit-community-modal";
import { CreateEventModal } from "@/components/molecules/create-event-modal";


// Helper function to get club type display text
const getClubTypeDisplay = (type: string) => {
  return type.charAt(0).toUpperCase() + type.slice(1);
};

export default function ClubDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useUser();

  // Navigation tabs
  const navTabs = [
    {
      label: "Home",
      path: "/apps/nu-events",
      icon: <Calendar className="h-4 w-4" />,
    },
    {
      label: "Events",
      path: "/apps/nu-events/events",
      icon: <Calendar className="h-4 w-4" />,
    },
    {
      label: "Clubs",
      path: "/apps/nu-events/clubs",
      icon: <Users className="h-4 w-4" />,
    },
  ];

  const { club, isLoading } = useCommunity();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [clubEvents, setClubEvents] = useState<NuEvents.Event[]>([]);
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
        ? `You unfollowed ${club?.name}`
        : `You are now following ${club?.name}`,
    });

    // In a real app, you would make an API call here
  };

  // Handle join club
  const handleJoinClub = () => {
    if (!user) {
      setPendingAction("join");
      setShowLoginModal(true);
      return;
    }

    // Show toast
    toast({
      title: "Request Sent",
      description: `Your request to join ${club?.name} has been sent.`,
    });

    // In a real app, you would make an API call here
  };

  // Handle login success
  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    if (pendingAction === "follow") {
      handleFollowToggle();
    } else if (pendingAction === "join") {
      handleJoinClub();
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

  if (!club) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold">Club not found</h2>
        <p className="text-muted-foreground mt-2">
          The club you're looking for doesn't exist or has been removed.
        </p>
      </div>
    );
  }
  
  return (
    <>
      {/* Club Header */}
      <div className="relative">
        {/* Banner */}
        <div className="h-40 bg-gradient-to-r from-primary/80 to-primary/30 rounded-md overflow-hidden">
          {club.media && club.media.length > 1 && (
            <img
              src={club.media[1].url || "/placeholder.svg"}
              alt={`${club.name} banner`}
              className="w-full h-full object-cover opacity-30"
            />
          )}
        </div>

        {/* Profile picture */}
        <div className="absolute -bottom-10 left-4">
          <div className="h-20 w-20 rounded-full overflow-hidden border-4 border-background bg-muted">
            {club.media && club.media.length > 0 ? (
              <img
                src={club.media[0].url || "/placeholder.svg"}
                alt={club.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Users className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        {/* Club type badge */}
        <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
          {getClubTypeDisplay(club.type)}
        </Badge>
      </div>

      {/* Club Info */}
      <div className="pt-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{club.name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <div className="flex items-center">
              <Users className="h-3 w-3 mr-1" />
              {0} members
            </div>
            <div className="flex items-center">
              <Heart className="h-3 w-3 mr-1" />
              {followerCount} followers
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" 
                  size="icon" 
                  className="h-8" 
                  onClick={() => setIsEditModalOpen(true)}>
            <Edit className="h-4 w-4" />
          </Button>
          {isEditModalOpen && (
            <EditCommunityModal
              club={club}
              onSave={(updatedClub: NuEvents.Club) => {
                // need to refetch the club
                console.log("Updated Club:", updatedClub);
              }}
              onClose={() => setIsEditModalOpen(false)}
            />
          )}
          <Button
            variant={isFollowing ? "outline" : "default"}
            size="sm"
            onClick={handleFollowToggle}
            className="text-xs h-8"
          >
            {isFollowing ? "Following" : "Follow"}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleJoinClub}
            className="text-xs h-8"
          >
            Join Club
          </Button>
        </div>
      </div>
          

      {/* Club Content */}
      <Tabs
        defaultValue="about"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full mt-4"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="gallery">Gallery</TabsTrigger>
        </TabsList>

        <TabsContent value="about" className="pt-4 space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">About Us</h2>
            <p className="text-md text-muted-foreground">{club.description}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Contact & Info</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>
                  President: {club.head_user.name} {club.head_user.surname}
                </span>
              </div>
              {club.instagram_url && (
                <a
                  href={club.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Instagram className="h-4 w-4" />
                  <span>Instagram</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {club.telegram_url && (
                <a
                  href={club.telegram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Telegram</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="events" className="pt-4">
          {clubEvents.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {clubEvents.map((event) => (
                <Card
                  key={event.id}
                  className="overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/apps/nu-events/event/${event.id}`)}
                >
                  <div className="aspect-[3/2] relative">
                    {event.media && event.media.length > 0 ? (
                      <img
                        src={event.media[0].url || "/placeholder.svg"}
                        alt={event.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Calendar className="h-8 w-8 text-muted-foreground opacity-50" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-2">
                    <h3 className="font-medium text-xs line-clamp-1">
                      {event.name}
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(event.event_datetime).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <h3 className="text-base font-medium">No upcoming events</h3>
              <p className="text-sm text-muted-foreground mt-1">
                This club doesn't have any scheduled events.
              </p>
              <Button
                variant="outline"
                size="icon"
                className="mt-4"
                onClick={() => setIsCreateModalOpen(true)}
              >
                {/* {isCreateModalOpen && (
              <CreateEventModal
                isOpen={isCreateModalOpen}
                onSave={(newEvent: NuEvents.Event) => {
                  setClubEvents([...clubEvents, newEvent]); // saving the new event to the club events
                }}
                onClose={() => setIsCreateModalOpen(false)}
              />
            )} */}
                <Plus className="h-4 w-4" /> 
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="gallery" className="pt-4">
          {club.media && club.media.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {club.media.map((media, index) => (
                <div
                  key={index}
                  className="aspect-square rounded-md overflow-hidden"
                >
                  <img
                    src={media.url || "/placeholder.svg"}
                    alt={`${club.name} gallery ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <h3 className="text-base font-medium">No gallery images</h3>
              <p className="text-sm text-muted-foreground mt-1">
                This club hasn't uploaded any gallery images yet.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
        title="Login Required"
        message={
          pendingAction === "follow"
            ? "You need to be logged in to follow clubs."
            : "You need to be logged in to join clubs."
        }
      />
    </>
  );
}
