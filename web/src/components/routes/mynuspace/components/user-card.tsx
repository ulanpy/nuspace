import { Link } from "@tanstack/react-router"

import { selectMedia } from "@/lib/media"
import type { UserCategory, UserSummary } from "@/lib/user"
import { ResilientImage } from "@/components/shared/media/resilient-image"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

const CATEGORY_LABELS: Record<UserCategory, string> = {
  student: "Student",
  faculty: "Faculty",
  staff: "Staff",
}

/**
 * One person in the directory: the community card, with the category standing
 * in for the community's category and type badges.
 *
 * The banner slot is here even when the person has no banner, because a row of
 * people and a row of communities then read as the same kind of thing. The
 * Keycloak avatar stands in for the banner when there is no upload for it.
 */
export function UserCard({ user }: { user: UserSummary }) {
  const name = `${user.name} ${user.surname}`.trim()

  return (
    <Card className="h-full p-0 transition-shadow hover:shadow-md">
      <Link
        to="/u/$slug"
        params={{ slug: user.slug }}
        className="flex h-full flex-col focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <div className="relative aspect-2/1 bg-muted">
          <ResilientImage
            src={selectMedia(user.media, "banner")?.url ?? user.picture}
            alt=""
            aria-hidden
            containerClassName="size-full"
            fallback={<span className="block size-full bg-muted" aria-hidden />}
          />

          <div className="absolute -bottom-7 left-4 rounded-full bg-card p-1 shadow-sm">
            <ResilientImage
              src={selectMedia(user.media, "profile")?.url ?? user.picture}
              alt=""
              aria-hidden
              containerClassName="size-14 rounded-full"
              fallback={
                <span
                  aria-hidden
                  className="grid size-full place-items-center bg-muted text-lg font-semibold text-muted-foreground"
                >
                  {user.name.charAt(0).toUpperCase()}
                </span>
              }
            />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 px-4 pt-9 pb-4">
          <h3 className="truncate font-semibold">{name}</h3>

          <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
            <Badge variant="secondary">{CATEGORY_LABELS[user.category]}</Badge>
          </div>
        </div>
      </Link>
    </Card>
  )
}
