import { Link } from "@tanstack/react-router"
import { BadgeCheckIcon } from "lucide-react"

import type { Community } from "@/features/communities/types"
import { selectMedia } from "@/features/media/select"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

export function CommunityCard({ community }: { community: Community }) {
  const avatar = selectMedia(community.media, "profile")?.url

  return (
    <Card className="p-0 transition-shadow hover:shadow-md">
      <Link
        to="/communities/$communityId"
        params={{ communityId: String(community.id) }}
        className="flex gap-4 p-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {avatar ? (
          <img
            src={avatar}
            alt=""
            aria-hidden
            loading="lazy"
            className="size-14 shrink-0 rounded-full bg-muted object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="grid size-14 shrink-0 place-items-center rounded-full bg-community/15 text-lg font-semibold text-community"
          >
            {community.name.charAt(0).toUpperCase()}
          </span>
        )}

        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-semibold">{community.name}</h3>
            {community.verified && (
              <BadgeCheckIcon
                className="size-4 shrink-0 text-primary"
                aria-label="Verified"
              />
            )}
          </div>

          <Badge variant="secondary">{community.category}</Badge>

          <p className="line-clamp-2 text-sm text-muted-foreground">
            {community.description}
          </p>
        </div>
      </Link>
    </Card>
  )
}
