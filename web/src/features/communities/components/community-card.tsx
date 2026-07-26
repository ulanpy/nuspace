import { Link } from "@tanstack/react-router"
import { BadgeCheckIcon } from "lucide-react"

import type { Community } from "@/features/communities/types"
import { selectMedia } from "@/features/media/select"
import { toPlainText } from "@/components/markdown"
import { ResilientImage } from "@/components/resilient-image"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

export function CommunityCard({ community }: { community: Community }) {
  const avatar = selectMedia(community.media, "profile")?.url
  const banner = selectMedia(community.media, "banner")?.url

  return (
    <Card className="h-full p-0 transition-shadow hover:shadow-md">
      <Link
        to="/communities/$communityId"
        params={{ communityId: String(community.id) }}
        className="flex h-full flex-col focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <div className="relative aspect-[2/1] bg-community/10">
          <ResilientImage
            src={banner}
            alt={`${community.name} banner`}
            containerClassName="size-full"
            fallback={
              <span className="block size-full bg-community/10" aria-hidden />
            }
          />

          <div className="absolute -bottom-7 left-4 rounded-full bg-card p-1 shadow-sm">
            <ResilientImage
              src={avatar}
              alt={`${community.name} profile`}
              containerClassName="size-14 rounded-full"
              fallback={
                <span
                  aria-hidden
                  className="grid size-full place-items-center bg-community/15 text-lg font-semibold text-community"
                >
                  {community.name.charAt(0).toUpperCase()}
                </span>
              }
            />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 px-4 pt-9 pb-4">
          <div className="flex min-w-0 items-center gap-1.5">
            <h3 className="truncate font-semibold">{community.name}</h3>
            {community.verified && (
              <BadgeCheckIcon
                className="size-4 shrink-0 text-primary"
                aria-label="Verified community"
              />
            )}
          </div>

          <p className="line-clamp-2 text-sm text-muted-foreground">
            {toPlainText(community.description)}
          </p>

          <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
            <Badge variant="secondary">{community.category}</Badge>
            <Badge variant="outline">{community.type}</Badge>
          </div>
        </div>
      </Link>
    </Card>
  )
}
