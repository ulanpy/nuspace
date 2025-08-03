import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/atoms/card";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { LoginModal } from "@/components/molecules/login-modal";
import { addToGoogleCalendar } from "@/features/campuscurrent/utils/calendar";
import { Event } from "@/features/campuscurrent/types/types";

interface EventCardProps extends Event {}

export function EventCard(props: EventCardProps) {
    const { 
    id,
    name, 
    event_datetime, 
    place, 
    policy, 
    media,
    type,
    status,
    tag,
 } = props;

  const { user } = useUser();
  const { toast } = useToast();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const handleAddToCalendar = () => {
    if (!user) {
      setPendingAction(() => handleAddToCalendar);
      setShowLoginModal(true);
      return;
    }
    addToGoogleCalendar(props);
    toast({
      title: "Success",
      description: "Event added to your Google Calendar",
    });
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  // Helper function to get policy display text
  const getPolicyDisplay = (policy: string) => {
    switch (policy) {
      case "open":
        return "Open Entry";
      case "free_ticket":
        return "Free Ticket";
      case "paid_ticket":
        return "Paid Ticket";
      default:
        return policy;
    }
  };

  // Helper function to get policy badge color
  const getPolicyColor = (policy: string) => {
    switch (policy) {
      case "open":
        return "bg-green-500";
      case "free_ticket":
        return "bg-blue-500";
      case "paid_ticket":
        return "bg-amber-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <Link to={`/apps/campuscurrent/event/${id}`}>
          <div className="aspect-video relative overflow-hidden rounded-t-lg">
            <img
              src={media[0]?.url || "/placeholder.svg"}
              alt={name}
              className="object-cover w-full h-full"
            />
            {/* Profile image overlay */}
            <div className="absolute bottom-2 right-2">
              {props.scope === "personal" && props.creator?.picture && (
                <img
                  src={props.creator.picture}
                  alt={`${props.creator.name} ${props.creator.surname}`}
                  className="w-8 h-8 rounded-full border-2 border-white shadow-md object-cover"
                />
              )}
              {props.scope === "community" && props.community?.media && (
                (() => {
                  const profileMedia = props.community.media.find(
                    (media) => 
                      media.entity_type === "communities" && 
                      media.media_format === "profile"
                  );
                  return profileMedia ? (
                    <img
                      src={profileMedia.url}
                      alt={props.community.name}
                      className="w-8 h-8 rounded-full border-2 border-white shadow-md object-cover"
                    />
                  ) : null;
                })()
              )}
            </div>
          </div>
        </Link>
        <CardHeader className="p-4 pb-2">
          <div className="flex flex-wrap gap-1 mb-2">
            <Badge className={`${getPolicyColor(policy)} text-white text-xs`}>
              {getPolicyDisplay(policy)}
            </Badge>
            <Badge className="bg-gray-500 text-white text-xs">{type}</Badge>
            <Badge className="bg-blue-500 text-white text-xs">{tag}</Badge>
            <Badge className="bg-yellow-500 text-white text-xs">{status}</Badge>
          </div>
          <Link
            to={`/apps/campuscurrent/event/${id}`}
            className="hover:underline"
          >
            <h3 className="text-lg font-semibold line-clamp-2">{name}</h3>
          </Link>
          <div className="text-sm text-muted-foreground">
            {props.scope === "community" 
              ? `by ${props.community?.name || 'Unknown Community'}` 
              : `by ${props.creator?.name} ${props.creator?.surname}`}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="mr-2 h-4 w-4 flex-shrink-0" />
            <span>{new Date(event_datetime).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="truncate">{place}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Users className="mr-2 h-4 w-4 flex-shrink-0" />
            <span>{props.duration} minutes</span>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <Button variant="outline" size="sm" onClick={handleAddToCalendar} className="w-full">
            Add to Calendar
          </Button>
        </CardFooter>
      </Card>
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
        title="Login Required"
        message="You need to be logged in to add this event to your calendar."
      />
    </>
  );
}
