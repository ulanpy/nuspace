import { Link } from "react-router-dom";

import { ROUTES } from "@/data/routes";
import { Community } from "@/features/campuscurrent/types/types";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/atoms/card";
import { Badge } from "@/components/atoms/badge";
import profilePlaceholder from "@/assets/svg/profile-placeholder.svg";

export function CommunityCard({ community }: { community: Community }) {
  const profile = community.media.find(
    (media) =>
      media.entity_type === "communities" && media.media_format === "profile"
  );

  return (
    <Link
    to={ROUTES.APPS.CAMPUS_CURRENT.COMMUNITY.DETAIL_FN(
      community.id.toString()
    )}
    className="mt-auto"
  >
    <Card
      key={community.id}
      className="overflow-hidden hover:shadow-lg hover:bg-secondary transition-shadow h-full flex flex-col"
    >
      <CardHeader className="p-4 flex flex-col items-center flex-shrink-0">
        {/* Image - Centered */}
        <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 mb-3">
          <img
            src={profile?.url || profilePlaceholder}
            onError={(e) => {
              e.currentTarget.src = profilePlaceholder;
            }}
            alt={community.name}
            className="object-cover w-full h-full"
          />
        </div>

        {/* Name - Centered */}
        <div className="min-w-0 w-full text-center mb-2 px-4">
          <h1 className="block w-full max-w-full font-semibold text-base md:text-lg truncate" title={community.name}>
            {community.name}
          </h1>
        </div>

        {/* Badges - Centered below name */}
        <div className="flex mt-2 gap-1 flex-wrap justify-center">
          <Badge variant="outline" className="text-xs">
            {community.category[0].toUpperCase()}
            {community.category.slice(1)}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {community.type[0].toUpperCase()}
            {community.type.slice(1)}
          </Badge>
          <Badge
            variant={community.recruitment_status === "open" ? "outline" : "secondary"}
            className={`text-xs ${
              community.recruitment_status === "open"
                ? "bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800"
                : ""
            }`}
          >
            Recruitment: {community.recruitment_status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 flex-1 overflow-hidden">
        <p className="text-sm text-muted-foreground line-clamp-3 text-center">
          {community.description}
        </p>
      </CardContent>
      <CardFooter></CardFooter>
    </Card>
      </Link>
  );
}
