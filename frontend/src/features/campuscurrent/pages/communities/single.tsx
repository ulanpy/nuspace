"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Calendar,
  MessageCircle,
  Heart,
  ExternalLink,
  Edit,
  Plus,
  InstagramIcon,
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
import { Card, CardContent } from "@/components/atoms/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/atoms/tabs";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { LoginModal } from "@/components/molecules/login-modal";
import { useCommunity } from "@/features/campuscurrent/hooks/communities/use-community";
import { EditCommunityModal } from "@/features/campuscurrent/components/EditCommunity";
import { ROUTES } from "@/data/routes";
import { Event } from "@/features/campuscurrent/types/types";
import { Community } from "@/features/campuscurrent/types/types";

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
    <>
      {/* Community Header */}
      <div className="relative">
        {/* Banner */}
        <div className="h-40 bg-gradient-to-r from-primary/80 to-primary/30 rounded-md overflow-hidden">
          {community.media && community.media.length > 1 && (
            <img
              src={community.media[1].url || "/placeholder.svg"}
              alt={`${community.name} banner`}
              className="w-full h-full object-cover opacity-30"
            />
          )}
        </div>

        {/* Profile picture */}
        <div className="absolute -bottom-10 left-4">
          <div className="h-20 w-20 rounded-full overflow-hidden border-4 border-background bg-muted">
            {community.media && community.media.length > 0 ? (
              <img
                src={community.media[0].url || "/placeholder.svg"}
                alt={community.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Users className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        {/* Community type badge */}
        <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
          {getCommunityTypeDisplay(community.type)}
        </Badge>
      </div>

      {/* Community Info */}
      <div className="pt-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{community.name}</h1>
          {/* <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <div className="flex items-center">
              <Users className="h-3 w-3 mr-1" />
              {0} members
            </div>
            <div className="flex items-center">
              <Heart className="h-3 w-3 mr-1" />
              {followerCount} followers
            </div>
          </div> */}
        </div>
        {/* <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8"
            onClick={() => setIsEditModalOpen(true)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          {isEditModalOpen && (
            <EditCommunityModal
              community={community}
              onSave={(updatedCommunity: Community) => {
                // need to refetch the community
                console.log("Updated Community:", updatedCommunity);
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
            onClick={handleJoinCommunity}
            className="text-xs h-8"
          >
            Join Community
          </Button>
        </div> */}
      </div>

     
      
      <Tabs
        defaultValue="about"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full my-4"
      >
        <div>
            <h2 className="text-xl font-semibold mb-2">About Us</h2>
            <p className="text-md text-muted-foreground">{community.description}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold my-2 mt-6">Contact & Info</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>
                  President: {community.head_user.name} {community.head_user.surname}
                </span>
              </div>
              {community.instagram_url && (
                <a
                  href={community.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <InstagramIcon className="h-4 w-4" />
                  <span>Instagram</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {community.telegram_url && (
                <a
                  href={community.telegram_url}
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
 {/* 
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="gallery">Gallery</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="pt-4 space-y-4">
          
        </TabsContent>

        <TabsContent value="events" className="pt-4">
          {communityEvents.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {communityEvents.map((event) => (
                <Card
                  key={event.id}
                  className="overflow-hidden cursor-pointer"
                  onClick={() => navigate(ROUTES.APPS.CAMPUS_CURRENT.EVENT.DETAIL_FN(event.id.toString()))}
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
                This community doesn't have any scheduled events.
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
                onSave={(newEvent: CampusCurrent.Event) => {
                  setCommunityEvents([...communityEvents, newEvent]); // saving the new event to the community events
                }}
                onClose={() => setIsCreateModalOpen(false)}
              />
            )} 
                <Plus className="h-4 w-4" /> 
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="gallery" className="pt-4">
          {community.media && community.media.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {community.media.map((media, index) => (
                <div
                  key={index}
                  className="aspect-square rounded-md overflow-hidden"
                >
                  <img
                    src={media.url || "/placeholder.svg"}
                    alt={`${community.name} gallery ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <h3 className="text-base font-medium">No gallery images</h3>
              <p className="text-sm text-muted-foreground mt-1">
                This community hasn't uploaded any gallery images yet.
              </p>
            </div>
          )}
        </TabsContent>*/}
      </Tabs> 

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
    </>
  );
}
