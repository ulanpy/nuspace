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
import { Event } from "@/features/campuscurrent/types";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { LoginModal } from "@/components/molecules/login-modal";
import { addToGoogleCalendar } from "@/features/campuscurrent/utils/calendar";

interface EventCardProps extends Event {}

export function EventCard(props: EventCardProps) {
    const { 
    id,
    community_id,
    name, 
    event_datetime, 
    place, 
    policy, 
    media,
    club,
    creator,
    permissions,
    type,
    status,
    tag,
    created_at,
    updated_at,
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

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <Link to={`/apps/campuscurrent/event/${id}`}>
          <div className="aspect-video relative overflow-hidden">
            <img
              src={media[0]?.url || "/placeholder.svg"}
              alt={name}
              className="object-cover w-full h-full"
            />
            <Badge className="absolute top-2 right-2 bg-nublue hover:bg-nublue-600">
              {policy}
            </Badge>
          </div>
        </Link>
        <CardHeader className="p-4 pb-0">
          <Link
            to={`/apps/campuscurrent/event/${id}`}
            className="hover:underline"
          >
            <h3 className="text-lg font-semibold line-clamp-2">{name}</h3>
          </Link>
          <Link
            to={`/apps/campuscurrent/community/${club?.id}`}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            {props.scope === "community" ? `by ${club?.name}` : `by ${props.creator?.name} ${props.creator?.surname}`}
          </Link>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="mr-2 h-4 w-4" />
            <span>{new Date(event_datetime).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="mr-2 h-4 w-4" />
            <span className="truncate">{place}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Users className="mr-2 h-4 w-4" />
            <span>{props.duration} minutes</span>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex justify-between">
          <Button variant="outline" size="sm" onClick={handleAddToCalendar}>
            Add to Calendar
          </Button>
          {/* <Button size="sm">I'm attending</Button> */}
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
