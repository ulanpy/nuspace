import { Badge } from "@/components/atoms/badge";
import { Card } from "@/components/atoms/card";
import { Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/data/routes";



export function CommunityCard({ club }: { club: typeof Types.Club }) {
  const navigate = useNavigate();

  return (
    <div
      key={club.id}
      className="flex flex-col items-center text-center cursor-pointer"
      onClick={() => navigate(ROUTES.APPS.CAMPUS_CURRENT.COMMUNITY.DETAIL_FN(club.id))}
    >
      <div className="w-20 h-20 rounded-full border border-gray-200 flex items-center justify-center bg-muted flex-shrink-0">
        {club.media && club.media.length > 0 && club.media[0].url ? (
          <img
            src={club.media[0].url}
            alt={club.name}
            className="object-cover w-full h-full rounded-full"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Calendar className="h-8 w-8 text-muted-foreground opacity-50" />
          </div>
        )}
      </div>
      <h3 className="font-medium text-xs line-clamp-2 w-20">
        {club.name}
      </h3>
    </div>
  );
}