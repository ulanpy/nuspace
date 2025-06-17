import { Badge } from "@/components/atoms/badge";
import { Card } from "@/components/atoms/card";
import { Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function CommunityCard({ club }: { club: NuEvents.Club }) {
  const navigate = useNavigate();
  const getClubTypeDisplay = (type: string) => {
  return type.charAt(0).toUpperCase() + type.slice(1);
};
  return (
    <Card
      key={club.id}
      className="overflow-hidden cursor-pointer"
      onClick={() => navigate(`/apps/nu-events/club/${club.id}`)}
    >
      <div className="aspect-square relative">
        {club.media && club.media.length > 0 ? (
          <img
            src={club.media[0].url || "/placeholder.svg"}
            alt={club.name}
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Calendar className="h-8 w-8 text-muted-foreground opacity-50" />
          </div>
        )}
        <Badge className="absolute top-1 left-1 z-10 bg-primary text-primary-foreground text-[10px] px-1 py-0">
          {getClubTypeDisplay(club.type)}
        </Badge>
      </div>
      <div className="p-2">
        <h3 className="font-medium text-xs line-clamp-1">{club.name}</h3>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {club.members} members
        </div>
      </div>
    </Card>
  );
}
