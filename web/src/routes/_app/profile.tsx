import { Link, createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { LogOutIcon, UsersIcon } from "lucide-react"

import { beginLogout } from "@/features/auth/api"
import { useSession } from "@/features/auth/use-session"
import { myCommunitiesQueryOptions } from "@/features/communities/api"
import type { Community } from "@/features/communities/types"
import { selectMedia } from "@/features/media/select"
import { TelegramLink } from "@/features/profile/components/telegram-link"
import { EmptyState, QueryBoundary } from "@/components/query-boundary"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export const Route = createFileRoute("/_app/profile")({
  component: Profile,
})

function Row({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-border p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}

function CommunityRow({ community }: { community: Community }) {
  const avatar = selectMedia(community.media, "profile")?.url

  return (
    <Link
      to="/communities/$communityId"
      params={{ communityId: String(community.id) }}
      className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {avatar ? (
        <img
          src={avatar}
          alt=""
          aria-hidden
          loading="lazy"
          className="size-8 shrink-0 rounded-full bg-muted object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-full bg-muted"
        >
          <UsersIcon className="size-4 text-muted-foreground" />
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">
          {community.name}
        </span>
        <span className="block truncate text-xs text-muted-foreground capitalize">
          {community.category} · {community.type}
        </span>
      </span>
    </Link>
  )
}

function MyCommunities() {
  const query = useQuery(myCommunitiesQueryOptions())

  return (
    <QueryBoundary
      query={query}
      pending={<Skeleton className="h-12 w-full" />}
      isEmpty={(data) => (data.items ?? []).length === 0}
      empty={
        <EmptyState
          title="You don't head any community"
          description="Communities you lead show up here."
        />
      }
    >
      {(data) => (
        <ul className="space-y-1">
          {(data.items ?? []).map((community) => (
            <li key={community.id}>
              <CommunityRow community={community} />
            </li>
          ))}
        </ul>
      )}
    </QueryBoundary>
  )
}

function Profile() {
  // useSession, not useCurrentUser: tg_id lives on the session rather than the
  // user, and the Telegram control needs to react to it changing.
  const session = useSession()
  if (!session) return null

  const { user } = session

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>

      <Card className="gap-0 p-0">
        <div className="flex items-center gap-4 p-4">
          {user.picture ? (
            <img
              src={user.picture}
              alt=""
              aria-hidden
              className="size-12 shrink-0 rounded-full bg-muted object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="grid size-12 shrink-0 place-items-center rounded-full bg-muted text-lg font-medium text-muted-foreground"
            >
              {user.given_name.charAt(0).toUpperCase()}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{user.name}</p>
            <p className="truncate text-sm text-muted-foreground">
              {user.email}
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={beginLogout}>
            <LogOutIcon className="size-4" aria-hidden />
            Log out
          </Button>
        </div>

        <Row
          label="Telegram"
          description="Nuspace delivers every notification through the bot."
        >
          <TelegramLink sub={user.sub} isLinked={session.tg_id !== null} />
        </Row>

        <Row label="Appearance">
          <ThemeToggle />
        </Row>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">My communities</h2>
        <MyCommunities />
      </section>
    </div>
  )
}
