import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { LogOutIcon, UsersIcon } from "lucide-react"

import { useLogout } from "@/hooks/use-logout"
import { useSession } from "@/hooks/use-session"
import { myCommunitiesQueryOptions } from "@/lib/communities"
import type { Community } from "@/lib/communities"
import { selectMedia } from "@/lib/media"
import { TelegramLink } from "@/components/routes/profile/components/telegram-link"
import { PageContainer } from "@/components/shared/page/container"
import { PageHeader } from "@/components/shared/page/header"
import { EmptyState, QueryBoundary } from "@/components/shared/query/boundary"
import { ResilientImage } from "@/components/shared/media/resilient-image"
import { Section } from "@/components/shared/page/section"
import { ThemeToggle } from "@/components/shared/theme/toggle"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

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
      to="/communities/$slug"
      params={{ slug: community.slug }}
      className="flex items-center gap-3 rounded-md p-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <ResilientImage
        src={avatar}
        alt=""
        aria-hidden
        containerClassName="size-8 shrink-0 rounded-full"
        fallback={
          <span
            aria-hidden
            className="grid size-full place-items-center bg-muted"
          >
            <UsersIcon className="size-4 text-muted-foreground" />
          </span>
        }
      />
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
        <div className="space-y-3">
          <EmptyState
            title="You don't own any community"
            description="Communities you own show up here."
          />
          <Button
            nativeButton={false}
            variant="outline"
            className="w-full"
            render={<Link to="/communities">Create a community</Link>}
          />
        </div>
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

export function Page() {
  // useSession, not useCurrentUser: tg_id lives on the session rather than the
  // user, and the Telegram control needs to react to it changing.
  const session = useSession()
  const logout = useLogout()
  if (!session) return null

  const { user } = session

  return (
    <PageContainer maxWidth="prose" padding="none" className="space-y-6">
      <PageHeader
        eyebrow="Your account"
        title="Profile"
        description="Manage your campus identity, notifications, and appearance."
      />

      <Card className="gap-0 p-0">
        <div className="flex items-center gap-4 p-4">
          <ResilientImage
            src={user.picture}
            alt=""
            aria-hidden
            eager
            containerClassName="size-12 shrink-0 rounded-full"
            fallback={
              <span
                aria-hidden
                className="grid size-full place-items-center bg-muted text-lg font-medium text-muted-foreground"
              >
                {user.given_name.charAt(0).toUpperCase()}
              </span>
            }
          />

          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{user.name}</p>
            <p className="truncate text-sm text-muted-foreground">
              {user.email}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={logout.isPending}
            onClick={() => {
              logout.mutate()
            }}
          >
            <LogOutIcon className="size-4" aria-hidden />
            {logout.isPending ? "Logging out…" : "Log out"}
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

      <Section spacing="none" className="space-y-3">
        <h2 className="text-lg font-semibold">My communities</h2>
        <MyCommunities />
      </Section>
    </PageContainer>
  )
}
