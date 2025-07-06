"use client";

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Calendar,
  Instagram,
  MessageCircle,
  Heart,
  ExternalLink,
  Edit,
  Trash2,
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
import { mockApi } from "../../../../data/events/mock-events-data";
import { NavTabs } from "../../../../components/molecules/nav-tabs";
import { LoginModal } from "../../../../components/molecules/login-modal";
import { useCommunity } from "@/modules/nu-events/clubs/api/hooks/use-cummunity";
import { Modal } from "../../../../components/atoms/modal"; 
import { Input } from "../../../../components/atoms/input";
import { Label } from "@/components/atoms/label";
import { Select, 
        SelectContent, 
        SelectItem, 
        SelectTrigger, 
        SelectValue } 
        from "@/components/atoms/select";
import { clubTypes } from "@/data/clubs/club-types";
import { clubCategories } from "@/data/clubs/club-categories";
import { Textarea } from "@/components/atoms/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/atoms/popover";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/atoms/calendar";
import { useEditCommunity } from "@/modules/nu-events/clubs/api/hooks/use-edit-community";
import { useImage } from "@/modules/kupi-prodai/hooks/use-image";
import { useRef } from "react";
import { eventCategories } from "@/data/events/event-categories";


// Using the global NuEvents.Club interface instead of local interface

// Using the global NuEvents.Event interface instead of local interface

const clubStatus = [
  "Recruiting",
  "Not Recruiting",
];

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
  const [clubEvents, setClubEvents] = useState<NuEvents.Event[]>([]);
  const [activeTab, setActiveTab] = useState("about");
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ ...club });
  const [createForm, setCreateForm] = useState({
    name: "",
    place: "",
    description: "",
    duration: 60,
    event_datetime: "",
    policy: "open" as const,
    type: "academic" as const
  });
  const [date, setDate] = useState<Date | undefined>(undefined);
  const fileInputRefProfile = useRef<HTMLInputElement>(null);
  const fileInputRefBanner = useRef<HTMLInputElement>(null);
  const fileInputRefEvent = useRef<HTMLInputElement>(null);
  const {handleImageUpload, handleDeleteImage} = useImage();

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

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSelectChange = (name: string, value: string) => {
    setEditForm({ ...editForm, [name]: value });
  };
  const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCreateForm({ ...createForm, [e.target.name]: e.target.value });
  };

  const handleCreateSelectChange = (name: string, value: string) => {
    setCreateForm({ ...createForm, [name]: value });
  };

// Handle saving edited community details
  // const { mutate: editCommunity, isPending } = useEditCommunity();

  // const handleSave = () => {
  //   editCommunity( {
  //     ...editForm,
  //     established: date ? date.toISOString() : editForm.established,
  //   }, 
  //   {
  //     onSuccess: () => {
  //       setIsEditModalOpen(false);
  //       toast({ title: "Club updated!" });
  //     },
  //     onError: (error) => {
  //       toast({ title: "Error", description: error });
  //     }
  //   });
  // };



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
          
      {/* Edit Community Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Community"
        className="max-w-2xl"
      >
        {/* Editing Profile and Background images */}
      <div className="grid grid-cols-2 gap-4">
        {/* Profile */}
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full overflow-hidden 
                          border-4 border-background bg-muted flex items-center justify-center">
            {club.media && club.media.length > 0 ? ( <img
              src={club.media[0].url || "/placeholder.svg"}
              alt={club.name}
              className="w-full h-full object-cover"
            />) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Users className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium">Profile</div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                name="images"
                ref={fileInputRefProfile}
                className="hidden"
                required
                accept="image/*"
                multiple
                onChange={handleImageUpload}
              />
              <Button className="h-8 px-2 text-xs" 
                      onClick={() => fileInputRefProfile.current?.click()}>Change Image</Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 bg-black hover:bg-black/80">
                <Trash2 className="h-4 w-4 text-white" />
              </Button>
            </div>
          </div>
        </div>
        {/* Background */}
        <div className="flex items-center gap-4">
          <div className="h-20 bg-gradient-to-r from-primary/80 to-primary/30 w-20 
                          aspect-square rounded-lg overflow-hidden border-4 border-background  
                          bg-muted flex items-center justify-center">
            {club.media && club.media.length > 1 && (
            <img
              src={club.media[1].url || "/placeholder.svg"}
              alt={`${club.name} banner`}
              className="w-full h-full object-cover"
            />
          )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium">Background</div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                name="images"
                ref={fileInputRefBanner}
                className="hidden"
                required
                accept="image/*"
                multiple
                onChange={handleImageUpload}
              />
              <Button className ="h-8 px-2 text-xs"
                      onClick={() => fileInputRefBanner.current?.click()}>Change Image</Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 bg-black hover:bg-black/80">
                <Trash2 className="h-4 w-4 text-white" />
              </Button>
            </div>
          </div>
        </div>
      </div>

        {/* Editing Club Info */}
    <div className="grid grid-cols-2 gap-4">
    <div>
      <Label htmlFor="name">Name</Label>
      <Input id="name" name="name" value={editForm.name} onChange={handleEditChange} placeholder="Name" />
    </div>
    <div>
      <Label htmlFor="type">Type</Label>
      <Select id="type" value={editForm.type} onValueChange={(value) => handleEditSelectChange("type", value)}>
        <SelectTrigger>
          <SelectValue placeholder="Select Type" />
        </SelectTrigger>
        <SelectContent className="z-[150]">
          {clubTypes.map((type) => (
        <SelectItem key={type} value={type.toLowerCase()}>
          {type}
        </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div>
      <Label htmlFor="category">Category</Label>
      <Select id="category" value={editForm.category} onValueChange={(value) => handleEditSelectChange("category", value)}>
        <SelectTrigger>
          <SelectValue placeholder="Select Category" />
        </SelectTrigger>
        <SelectContent className="z-[150]">
            {clubCategories.map((category) => (
              <SelectItem key={category} value={category.toLowerCase()}>
                {category} 
              </SelectItem>
            ))}
          </SelectContent>
      </Select>
    </div>
    <div>
      <Label htmlFor="recruitment_status">Recruitment Status</Label>
      <Select id="recruitment_status" value={editForm.recruitment_status} onValueChange={(value) => handleEditSelectChange("recruitment_status", value)}>
        <SelectTrigger>
          <SelectValue placeholder="Select Status" />
        </SelectTrigger>
        <SelectContent className="z-[150]">
            {clubStatus.map((recruitment_status) => (
              <SelectItem key={recruitment_status} value={recruitment_status.toLowerCase()}>
                {recruitment_status} 
              </SelectItem>
            ))}
          </SelectContent>
      </Select>
    </div>
    <div>
      <Label htmlFor="description">Description</Label>
      <Textarea
        id="description"
        name="description"
        value={editForm.description}
        onChange={handleEditChange}
        placeholder="Description"
        className="h-24"
      />
    </div>
    <div>
      <Label htmlFor="established">Established</Label>
      <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full flex items-center gap-2 justify-start">
              <Calendar className="h-4 w-4" />
              {date ? format(date, "PPP") : "Date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-[150]">
            <CalendarComponent
              mode="single"
              selected={date}
              onSelect={setDate}
            />
          </PopoverContent>
        </Popover>
    </div>
    <div>
      <Label htmlFor="telegram_url">Telegram</Label>
      <Input id="telegram_url" name="telegram_url" value={editForm.telegram_url} onChange={handleEditChange} placeholder="Telegram URL" />
    </div>
    <div>
      <Label htmlFor="instagram_url">Instagram</Label>
      <Input id="instagram_url" name="instagram_url" value={editForm.instagram_url} onChange={handleEditChange} placeholder="Instagram URL" />
    </div>
  </div>
  <div className="flex justify-end gap-2 mt-4">
    <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
      Cancel
    </Button>
    <Button 
      variant="default"
      onClick={() => {
        // Handle api call to update club
        console.log("Updating community:", editForm);
        setIsEditModalOpen(false);
        toast({
          title: "Community Updated",
          description: "Your community has been updated successfully!",
        });
      }}
    >
      Save Changes
    </Button>
  </div>
</Modal>

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
      {/* Create Event Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Event"
        className="max-w-xl">
          <div className="flex items-center gap-4">
          <div className="h-20 w-20 aspect-square rounded-lg overflow-hidden 
                          border-4 border-background bg-muted flex items-center justify-center">
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                type="file"
                name="images"
                ref={fileInputRefEvent}
                className="hidden"
                required
                accept="image/*"
                multiple
                onChange={handleImageUpload}
              />
              <Button className="h-8 px-2 text-xs" 
                      onClick={() => fileInputRefEvent.current?.click()}>Change Image</Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 bg-black hover:bg-black/80">
                <Trash2 className="h-4 w-4 text-white" />
              </Button>
            </div>
          </div>
        </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" value={createForm.name} onChange={handleCreateChange} placeholder="Name" />
              </div>
              <div>
                <Label htmlFor="policy">Policy</Label>
                <Select id="policy" name="policy" value={createForm.policy} onValueChange={(value) => handleCreateSelectChange("policy", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Policy" />
                  </SelectTrigger>
                  <SelectContent className="z-[150]">
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="free_ticket">Free Ticket</SelectItem>
                    <SelectItem value="paid_ticket">Paid Ticket</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select id="category" name="category" value={createForm.category} onValueChange={(value) => handleCreateSelectChange("category", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="z-[150]">
                    {eventCategories.map((category) => (
                  <SelectItem key={category.title} value={category.title}>
                    {category.title}
                  </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="place">Location</Label>
                <Input id="place" name="place" value={createForm.place} onChange={handleCreateChange} placeholder="Location" />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={createForm.description}
                  onChange={handleCreateChange}
                  placeholder="Description"
                  className="h-24"
                />
              </div>
              <div>
                <Label htmlFor="event_datetime">Date</Label>
                <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full flex items-center gap-2 justify-start">
                        <Calendar className="h-4 w-4" />
                        {date ? format(date, "PPP") : "Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[150]">
                      <CalendarComponent
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                      />
                    </PopoverContent>
                  </Popover>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input id="duration" name="duration" type="number" 
                value={createForm.duration} onChange={handleCreateChange} placeholder="Duration in minutes" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="default"
                onClick={() => {
                  // Handle event creation here
                  console.log("Creating event:", createForm);
                  setIsCreateModalOpen(false);
                  toast({
                    title: "Event Created",
                    description: "Your event has been created successfully!",
                  });
                }}
              >
                Create Event
              </Button>
            </div>
          </div>
        </Modal>
    </>
  );
}
