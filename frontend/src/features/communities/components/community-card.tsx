import Link from "next/link";
import Image from 'next/image';
// import { Users, Calendar } from "lucide-react";

import { ROUTES } from "@/data/routes";
import { Community } from "@/features/shared/campus/types";
import { Card } from "@/components/atoms/card";
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
  // const establishedYear = new Date(community.established).getFullYear();

  return (
    <Link
      href={ROUTES.COMMUNITIES.DETAIL_FN(
        community.id.toString()
      )}
      className="block h-full"
    >
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 h-full flex flex-col group">
        {/* Banner */}
        <div className="relative w-full aspect-video bg-gradient-to-r from-gray-200 to-gray-500">
          {banner ? (
            <Image
              src={banner.url}
              alt={`${community.name} banner`}
              className="absolute inset-0 w-full h-full object-cover"
              fill
              className="object-cover object-center"
            />
          ) : null}

          {/* Profile image overlay */}
          <div className="absolute -bottom-6 left-4">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md">
              <Image
                src={profile?.url || profilePlaceholder}
                onError={(e) => (e.currentTarget.src = profilePlaceholder)}
                alt={community.name}
                className="object-cover w-full h-full"
              // placeholder={profilePlaceholder}
              />
            </div>
          </div>
        </div>


        <div className="pt-8 px-4 pb-4 flex-1">
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

          {/* Commented out for future reference if I come up with something useful to display here */}

          {/* Community info
          <div className="space-y-1 mb-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Est. {establishedYear}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{community.head_user.name} {community.head_user.surname}</span>
            </div>
          </div> */}

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
        </div>
      </Card>
    </Link>
  );
}
