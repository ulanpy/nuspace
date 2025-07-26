import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card";
import { Badge, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/data/routes";

interface Event {
  id: number;
  name: string;
  media?: { url: string }[];
  rating?: number;
  club?: {
    type: string;
  };
}

export const BaseCard = ({ event }: { event: Types.Event }) => {
  const navigate = useNavigate();
  return (
    <Card
      className="overflow-hidden h-[350px] flex flex-col justify-between"
      onClick={() =>
        navigate(ROUTES.APPS.CAMPUS_CURRENT.EVENT.DETAIL_FN(event.id))
      }
    >
      <CardHeader className="p-0 relative">
        <img
            src={event.media[0].url || "/placeholder.svg"}
            alt={event.name}
            className="w-full h-full object-cover"
          />
        <div className="absolute top-1 left-1 z-10">
          <Badge className={` text-white text-[10px] px-1 py-0`}></Badge>
        </div>
        {event.rating && (
          <div className="absolute top-1 right-1 z-10 bg-black/70 text-white text-[10px] font-bold px-1 py-0.5 rounded">
            {event.rating.toFixed(1)}
          </div>
        )}
      </CardHeader>
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
