import { Link } from "react-router-dom";
import { Calendar, MapPin, Users } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/atoms/card";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";

interface EventCardProps {
  id: string;
  title: string;
  clubName: string;
  clubId: string;
  date: string;
  time: string;
  location: string;
  category: string;
  attendees: number;
  imageUrl: string;
}

export function EventCard({
  id,
  title,
  clubName,
  clubId,
  date,
  time,
  location,
  category,
  attendees,
  imageUrl,
}: EventCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <Link to={`/events/${id}`}>
        <div className="aspect-video relative overflow-hidden">
          <img
            src={imageUrl || "/placeholder.svg"}
            alt={title}
            className="object-cover w-full h-full"
          />
          <Badge className="absolute top-2 right-2 bg-nublue hover:bg-nublue-600">{category}</Badge>
        </div>
      </Link>
      <CardHeader className="p-4 pb-0">
        <Link to={`/events/${id}`} className="hover:underline">
          <h3 className="text-lg font-semibold line-clamp-2">{title}</h3>
        </Link>
        <Link to={`/clubs/${clubId}`} className="text-sm text-muted-foreground hover:text-primary">
          {clubName}
        </Link>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-2">
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="mr-2 h-4 w-4" />
          <span>{date} • {time}</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <MapPin className="mr-2 h-4 w-4" />
          <span className="truncate">{location}</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Users className="mr-2 h-4 w-4" />
          <span>{attendees} attending</span>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between">
        <Button variant="outline" size="sm">
          Add to Calendar
        </Button>
        <Button size="sm">
          I'm attending
        </Button>
      </CardFooter>
    </Card>
  );
}
