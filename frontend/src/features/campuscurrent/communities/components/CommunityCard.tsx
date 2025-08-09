import { Link } from "react-router-dom";

import { ROUTES } from "@/data/routes";
import { Community } from "@/features/campuscurrent/types/types";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/atoms/card";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
import profilePlaceholder from "@/assets/svg/profile-placeholder.svg";

export function CommunityCard({ community }: { community: Community }) {
  const profile = community.media.find(
    (media) =>
      media.entity_type === "communities" && media.media_format === "profile"
  );

  return (
    <Card
      key={community.id}
      className="overflow-hidden hover:shadow-md transition-shadow h-80 flex flex-col"
    >
      <CardHeader className="p-4 flex flex-row gap-4 items-center flex-shrink-0">
        <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
          <img
            src={profile?.url || profilePlaceholder}
            onError={(e) => {
              e.currentTarget.src = profilePlaceholder;
            }}
            alt={community.name}
            className="object-cover w-full h-full"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-semibold truncate">{community.name}</h1>
          <div className="flex mt-2 gap-1 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {community.category[0].toUpperCase()}
              {community.category.slice(1)}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {community.type[0].toUpperCase()}
              {community.type.slice(1)}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Recruitment: {community.recruitment_status}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 flex-1 overflow-hidden">
        <p className="text-sm text-muted-foreground line-clamp-4">
          {community.description}
        </p>
      </CardContent>

      <Link
        to={ROUTES.APPS.CAMPUS_CURRENT.COMMUNITY.DETAIL_FN(
          community.id.toString()
        )}
        className="mt-auto"
      >
        <CardFooter className="p-4 pt-0 flex-shrink-0">
          <Button className="w-full">View Club</Button>
        </CardFooter>
      </Link>
    </Card>
  );
}
