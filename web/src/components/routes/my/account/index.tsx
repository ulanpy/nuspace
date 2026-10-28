import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { ChevronRightIcon } from "lucide-react"

import { useCurrentUser, useSession } from "@/hooks/use-session"
import {
  MAX_PAGES_PER_OWNER,
  myPagesQueryOptions,
  pageStats,
} from "@/lib/pages"
import { myProfileQueryOptions } from "@/lib/profiles"
import { visibilityLabel } from "@/components/shared/pages/visibilities"
import { Page } from "@/components/shared/page"
import { CardGrid } from "@/components/shared/page/card-grid"
import { SettingsSection } from "@/components/shared/settings/settings-section"
import { TelegramLink } from "@/components/shared/telegram/telegram-link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="truncate text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}

/**
 * The stats come from two one-row requests, because only the totals matter:
 * every Page the viewer runs, and the ones they own. Zeros show until they
 * land rather than a skeleton, since the cards are small and the numbers
 * settle in well under a second.
 */
function usePageStats() {
  const all = useQuery(myPagesQueryOptions({ page: 1, size: 1 }))
  const owned = useQuery(
    myPagesQueryOptions({ page: 1, size: 1, role: "owner" })
  )

  return pageStats({
    owned: owned.data?.total ?? 0,
    total: all.data?.total ?? 0,
  })
}

/**
 * The signed-in user's own corner: who they are, how their profile is set,
 * their Page stats and their Telegram connection.
 *
 * There is no "Listed" stat. Listing derives from Visibility: `public` is
 * listed to everyone, `internal` to members, `private` to no one.
 */
export function AccountScreen() {
  const me = useCurrentUser()
  const session = useSession()
  const stats = usePageStats()
  // The cards say what a new profile is (no handle, `private`) until it lands.
  const profile = useQuery(myProfileQueryOptions())
  const isTelegramLinked = session?.tg_id != null

  return (
    <Page
      eyebrow="Account"
      title={me.name}
      description={me.email}
      media={
        <Avatar className="size-16">
          <AvatarImage src={me.picture ?? undefined} alt="" />
          <AvatarFallback className="text-xl">
            {me.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      }
    >
      <SettingsSection title="Profile">
        <CardGrid columns={2}>
          <Stat value={profile.data?.handle ?? "Not set"} label="Handle" />
          <Stat
            value={visibilityLabel(profile.data?.visibility ?? "private")}
            label="Visibility"
          />
        </CardGrid>

        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link to="/my/profile" />}
        >
          Profile Settings
          <ChevronRightIcon aria-hidden />
        </Button>
      </SettingsSection>

      <SettingsSection title="My Pages">
        <CardGrid columns={3}>
          <Stat value={stats.owned} label="Pages you own" />
          <Stat value={stats.administered} label="Where you are an admin" />
          <Stat
            value={stats.remaining}
            label={`Of the ${String(MAX_PAGES_PER_OWNER)} pages you may own`}
          />
        </CardGrid>

        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link to="/my/pages" />}
        >
          My Pages
          <ChevronRightIcon aria-hidden />
        </Button>
      </SettingsSection>

      <SettingsSection title="Integrations">
        <ItemGroup>
          <Item variant="muted">
            <ItemContent>
              <ItemTitle>Telegram</ItemTitle>
              <ItemDescription>
                Nuspace delivers every notification through the bot.
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <TelegramLink sub={me.sub} isLinked={isTelegramLinked} />
            </ItemActions>
          </Item>
        </ItemGroup>
      </SettingsSection>
    </Page>
  )
}
