import { Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/data/routes";
import { Community } from "@/features/campuscurrent/types/types";



export function CommunityCard({ community }: { community: Community }) {
  const navigate = useNavigate();

  return (
    <div
      key={community.id}
      className="flex flex-col items-center text-center cursor-pointer"
      onClick={() => navigate(ROUTES.APPS.CAMPUS_CURRENT.COMMUNITY.DETAIL_FN(community.id.toString()))}
    >
      <div className="w-20 h-20 rounded-full border border-gray-200 flex items-center justify-center bg-muted flex-shrink-0">
        {community.media && community.media.length > 0 && community.media[0].url ? (
          <img
            src={community.media[0].url}
            alt={community.name}
            className="object-cover w-full h-full rounded-full"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Calendar className="h-8 w-8 text-muted-foreground opacity-50" />
          </div>
        )}
      </div>
      <h3 className="font-medium text-xs line-clamp-2 w-20">
        {community.name}
      </h3>
    </div>
  );
}