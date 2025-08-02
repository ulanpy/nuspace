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

interface EventCardProps extends NuEvents.Event {}

export function EventCard({
  id,
  name,
  club,
  event_datetime,
  place,
  policy,
  media,
}: EventCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
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
        <Link to={`/apps/campuscurrent/event/${id}`} className="hover:underline">
          <h3 className="text-lg font-semibold line-clamp-2">{name}</h3>
        </Link>
        <Link
          to={`/apps/campuscurrent/community/${club?.id}`}
          className="text-sm text-muted-foreground hover:text-primary"
        >
          {club?.name}
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
          <span>{club?.followers} attending</span>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between">
        <Button variant="outline" size="sm">
          Add to Calendar
        </Button>
        <Button size="sm">I'm attending</Button>
      </CardFooter>
    </Card>
  );
}
