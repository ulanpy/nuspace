import { Link } from "react-router-dom";
import { Users, Calendar, MapPin } from "lucide-react";

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
import { VerificationBadge } from "@/components/molecules/verification-badge";

export function CommunityCard({ community }: { community: Community }) {
  const profile = community.media.find(
    (media) =>
      media.entity_type === "communities" && media.media_format === "profile"
  );

  // Find banner image (first image that's not a profile)
  const banner = community.media.find(
    (media) =>
      media.entity_type === "communities" && media.media_format !== "profile"
  );

  // Format established date
  const establishedYear = new Date(community.established).getFullYear();

  return (
    <Link
      to={ROUTES.APPS.CAMPUS_CURRENT.COMMUNITY.DETAIL_FN(
        community.id.toString()
      )}
      className="block h-full"
    >
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 h-full flex flex-col group">
        {/* Banner */}
        <div className="relative h-20 bg-gradient-to-r from-blue-500 to-purple-600">
          {banner && (
            <img
              src={banner.url}
              alt={`${community.name} banner`}
              className="w-full h-full object-cover"
            />
          )}
          {/* Profile image overlay */}
          <div className="absolute -bottom-6 left-4">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md">
              <img
                src={profile?.url || profilePlaceholder}
                onError={(e) => {
                  e.currentTarget.src = profilePlaceholder;
                }}
                alt={community.name}
                className="object-cover w-full h-full"
              />
            </div>
          </div>
        </div>

        <CardContent className="pt-8 px-4 pb-4 flex-1">
          {/* Name and verification */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <h3 className="font-semibold text-sm truncate" title={community.name}>
                {community.name}
              </h3>
              {community.verified && (
                <VerificationBadge className="ml-1 flex-shrink-0" size={12} />
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {community.description}
          </p>

          {/* Community info */}
          <div className="space-y-1 mb-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Est. {establishedYear}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{community.head_user.name} {community.head_user.surname}</span>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-xs px-2 py-0.5">
              {community.category[0].toUpperCase()}
              {community.category.slice(1)}
            </Badge>
            {community.recruitment_status === "open" && (
              <Badge 
                variant="outline" 
                className="text-xs px-2 py-0.5 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800"
              >
                Recruiting
              </Badge>
            )}
          </div>
        </CardContent>

        <CardFooter className="px-4 pb-4 pt-0">
          <div className="w-full">
            <div className="flex items-center justify-end text-xs text-muted-foreground">
              {community.telegram_url && (
                <span className="text-blue-600 dark:text-blue-400">Telegram</span>
              )}
            </div>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
