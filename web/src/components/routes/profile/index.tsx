import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { LogOutIcon, UsersIcon } from "lucide-react"

import { useLogout } from "@/hooks/use-logout"
import { useSession } from "@/hooks/use-session"
import { myCommunitiesQueryOptions } from "@/lib/communities"
import type { Community } from "@/lib/communities"
import { selectMedia } from "@/lib/media"
import { TelegramLink } from "@/components/routes/profile/components/telegram-link"
import { SettingsShell } from "@/components/layouts/settings"
import { SettingsSection } from "@/components/shared/settings/settings-section"
import { EmptyState, QueryBoundary } from "@/components/shared/query/boundary"
import { ResilientImage } from "@/components/shared/media/resilient-image"
import { ThemeToggle } from "@/components/shared/theme/toggle"
import { Button } from "@/components/ui/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
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
    <Item variant="muted">
      <ItemContent>
        <ItemTitle>{label}</ItemTitle>
        {description && <ItemDescription>{description}</ItemDescription>}
      </ItemContent>
      <ItemActions>{children}</ItemActions>
    </Item>
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
        <EmptyState
          title="You don't own any community"
          description="Communities you own show up here."
          action={
            <Button
              nativeButton={false}
              variant="outline"
              className="w-full"
              render={<Link to="/communities">Create a community</Link>}
            />
          }
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

export function Page() {
  // useSession, not useCurrentUser: tg_id lives on the session rather than the
  // user, and the Telegram control needs to react to it changing.
  const session = useSession()
  const logout = useLogout()
  if (!session) return null

  const { user } = session

  return (
    <SettingsShell
      title="Profile"
      description="Manage your campus identity, notifications, and appearance."
      actions={
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
      }
    >
      <div>
        <SettingsSection title="Account">
          <ItemGroup>
            <Item variant="muted">
              <ItemMedia>
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
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{user.name}</ItemTitle>
                <ItemDescription>{user.email}</ItemDescription>
              </ItemContent>
            </Item>

            <Row
              label="Telegram"
              description="Nuspace delivers every notification through the bot."
            >
              <TelegramLink sub={user.sub} isLinked={session.tg_id !== null} />
            </Row>

            <Row label="Appearance">
              <ThemeToggle />
            </Row>
          </ItemGroup>
        </SettingsSection>

        <SettingsSection title="My communities">
          <MyCommunities />
        </SettingsSection>
      </div>
    </SettingsShell>
  )
}
