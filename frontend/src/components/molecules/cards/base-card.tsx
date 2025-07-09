import { Card, CardContent } from "@/components/atoms/card";
import { Badge, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Event {
  id: number;
  name: string;
  media?: { url: string }[];
  rating?: number;
  club?: {
    type: string;
  };
}

export function BaseCard({event}: { event: Event }) {
  const navigate = useNavigate();
  return (
    <Card
      key={event.id}
      className="min-w-[160px] max-w-[160px] sm:min-w-[180px] sm:max-w-[180px] flex-shrink-0 overflow-hidden cursor-pointer snap-start"
      onClick={() => navigate(`/apps/nu-events/event/${event.id}`)}
    >
      <div className="aspect-[1/1.414] relative">
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
        <div className="absolute top-1 left-1 z-10">
          <Badge className={` text-white text-[10px] px-1 py-0`}></Badge>
        </div>
        {event.rating && (
          <div className="absolute top-1 right-1 z-10 bg-black/70 text-white text-[10px] font-bold px-1 py-0.5 rounded">
            {event.rating.toFixed(1)}
          </div>
        )}
      </div>
      <CardContent className="p-2">
        <h3 className="font-medium text-xs line-clamp-1">{event.name}</h3>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {event.club?.type &&
            event.club.type.charAt(0).toUpperCase() + event.club.type.slice(1)}
        </div>
      </CardContent>
    </Card>
  );
}
