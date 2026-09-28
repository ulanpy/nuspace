import { Link } from "@tanstack/react-router"

import type { UserSummary } from "@/lib/user"
import { ResilientImage } from "@/components/shared/media/resilient-image"
import { Card } from "@/components/ui/card"

/**
 * One person in the directory.
 *
 * The community card with a banner nobody has: a user summary carries a
 * `picture` and nothing else, so there is no second image to lay out. The
 * avatar falls back to an initial, the way the profile header does.
 */
export function UserCard({ user }: { user: UserSummary }) {
  const name = `${user.name} ${user.surname}`.trim()

  return (
    <Card className="h-full p-0 transition-shadow hover:shadow-md">
      <Link
        to="/u/$slug"
        params={{ slug: user.slug }}
        className="flex h-full items-center gap-4 p-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <ResilientImage
          src={user.picture}
          alt=""
          aria-hidden
          containerClassName="size-12 shrink-0 rounded-full"
          fallback={
            <span
              aria-hidden
              className="grid size-full place-items-center bg-muted text-lg font-semibold text-muted-foreground"
            >
              {user.name.charAt(0).toUpperCase()}
            </span>
          }
        />
        <span className="min-w-0">
          <span className="block truncate font-semibold">{name}</span>
          <span className="block truncate text-sm text-muted-foreground">
            /u/{user.slug}
          </span>
        </span>
      </Link>
    </Card>
  )
}
