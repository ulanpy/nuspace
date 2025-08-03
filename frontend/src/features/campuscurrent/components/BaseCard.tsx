import {
  Card,
  CardContent,
} from "@/components/atoms/card";
import { Badge, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/data/routes";
import { Event } from "@/features/campuscurrent/types/types";

export const BaseCard = ({ event }: { event: Event }) => { 
  const navigate = useNavigate();
  const getEventTypeDisplay = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <Card
      className="overflow-hidden cursor-pointer flex flex-col" 
      onClick={() =>
        navigate(ROUTES.APPS.CAMPUS_CURRENT.EVENT.DETAIL_FN(event.id.toString()))
      }
    >
      <div className="aspect-square">
        {event.media && event.media.length > 0 && event.media[0].url ? (
          <img
            src={event.media[0].url}
            alt={event.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Calendar className="h-8 w-8 text-muted-foreground opacity-50" />
          </div>
        )}

        <div className="absolute top-1 left-1 z-10">
          {event.community?.type && (
            <Badge className={`bg-primary text-primary-foreground text-[10px] px-1 py-0`}>
              {getEventTypeDisplay(event.community.type)}
            </Badge>
          )}
        </div>
        {event.rating && (
          <div className="absolute top-1 right-1 z-10 bg-black/70 text-white text-[10px] font-bold px-1 py-0.5 rounded">
            {event.rating.toFixed(1)}
          </div>
        )}
      </div>
      <CardContent className="p-2 flex-grow"> {/* Added flex-grow to ensure content pushes to bottom if space is available */}
        <h3 className="font-medium text-xs line-clamp-1">{event.name}</h3>
        {/* The Community type display was moved to a badge for better consistency with CommunityCard's original look */}
        {/* If you specifically want to keep the "members" equivalent text, you can add it back here, but it wasn't explicitly asked for the BaseCard update */}
      </CardContent>
    </Card>
  );
};
