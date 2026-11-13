import Link from "@/router/link";
import { ROUTES } from "@/data/routes";
import { Community } from "@/features/shared/campus/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FadeInImage } from "@/components/shared/fade-in-image";
import { Skeleton } from "@/components/ui/skeleton";
import profilePlaceholder from "@/assets/svg/profile-placeholder.svg";
import { VerificationBadge } from "@/components/molecules/verification-badge";

export function CommunityCardSkeleton() {
  return (
    <Card className="h-full overflow-hidden flex flex-col">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="space-y-2 px-4 pb-4 pt-8">
        <Skeleton className="h-4 w-[70%]" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="mt-2 h-5 w-20" />
      </div>
    </Card>
  );
}

export function CommunityCard({
  community,
  priorityImage = false,
}: {
  community: Community;
  priorityImage?: boolean;
}) {
  const profile = community.media.find(
    (media) =>
      media.entity_type === "communities" && media.media_format === "profile"
  );

  const banner = community.media.find(
    (media) =>
      media.entity_type === "communities" && media.media_format !== "profile"
  );

  const placeholderSrc =
    typeof profilePlaceholder === "string"
      ? profilePlaceholder
      : profilePlaceholder.src;

  return (
    <Link
      href={ROUTES.COMMUNITIES.DETAIL_FN(community.id.toString())}
      className="block h-full"
    >
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 h-full flex flex-col group">
        <div className="relative w-full aspect-video bg-muted">
          {banner?.url ? (
            <FadeInImage
              src={banner.url}
              alt={`${community.name} banner`}
              fill
              priority={priorityImage}
            />
          ) : null}

          <div className="absolute -bottom-6 left-4 z-10">
            <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-white shadow-md">
              <FadeInImage
                src={profile?.url || placeholderSrc}
                fallbackSrc={placeholderSrc}
                alt={community.name}
                className="h-full w-full"
              />
            </div>
          </div>
        </div>

        <div className="pt-8 px-4 pb-4 flex-1">
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

          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {community.description}
          </p>

          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-xs px-2 py-0.5">
              {community.category[0].toUpperCase()}
              {community.category.slice(1)}
            </Badge>
          </div>
        </div>
      </Card>
    </Link>
  );
}
