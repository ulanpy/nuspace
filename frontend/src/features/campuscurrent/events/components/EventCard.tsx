// Handles image fallback on list card
 
// Note: Keeping imports minimal for performance and clarity
import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/atoms/card";
import { Badge } from "@/components/atoms/badge";
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
 } = props;

  // Removed calendar action and related state from list card
  const [imageError, setImageError] = useState(false);

  // Helper function to get policy display text
  const getPolicyDisplay = (policy: string) => {
    switch (policy) {
      case "open":
        return "Open";
      case "registration":
        return "Registration";
      default:
        return policy;
    }
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <Link to={`/apps/campuscurrent/event/${id}`}>
          <div className="aspect-[3/4] relative overflow-hidden rounded-t-lg bg-muted">
            {media && media.length > 0 && media[0]?.url && !imageError ? (
              <img
                src={media[0].url}
                alt={name}
                className="object-cover w-full h-full"
                onError={() => setImageError(true)}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground opacity-50 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">No poster available</p>
                </div>
              </div>
            )}
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
            <Badge variant="outline" className="">{type[0].toUpperCase()}{type.slice(1)}</Badge>
            <Badge variant="outline" >
              {getPolicyDisplay(policy)}
            </Badge>
            {/* <Badge className="bg-blue-500 text-white text-xs">{tag}</Badge> */}
            {/* <Badge className="bg-yellow-500 text-white text-xs">{status}</Badge> */}
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
          {/* Duration removed per list card simplification */}
        </CardContent>
        {/* Removed Add to Calendar button from card to keep action on single page */}
      </Card>
      {/* Removed login modal since calendar action no longer lives here */}
    </>
  );
}
