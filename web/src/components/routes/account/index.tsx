import { useNavigate } from "@tanstack/react-router"

import type { AccountSearch } from "@/routes/_app/account"
import { useCurrentUser, useSession } from "@/hooks/use-session"
import { Page as PageLayout } from "@/components/shared/page"
import { SettingsSection } from "@/components/shared/settings/settings-section"
import { TelegramLink } from "@/components/routes/account/components/telegram-link"
import { MyPages } from "@/components/routes/account/components/my-pages"
import { ResilientImage } from "@/components/shared/media/resilient-image"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"

/**
 * The signed-in user's own corner of the app: who they are, their Telegram
 * connection, and the pages they own or administer.
 *
 * This replaced the per-profile settings at `/u/$slug/settings`, which was
 * reachable only by knowing your own handle and 404'd for everyone else. Being
 * logged in is now the whole guard.
 *
 * Prose width and `Item` rows, like every other settings screen: this is a
 * form of settings a reader works down, not a dashboard to scan.
 */
export function Page({
  search,
  onSearchChange,
}: {
  search: AccountSearch
  onSearchChange: (updater: (previous: AccountSearch) => AccountSearch) => void
}) {
  const me = useCurrentUser()
  const session = useSession()
  const navigate = useNavigate()
  const isTelegramLinked = session?.tg_id != null

  return (
    <PageLayout
      title="Account"
      description="Your Telegram connection and the pages you manage."
      width="prose"
    >
      <SettingsSection
        title="Account"
        description="How Nuspace reaches you, and which pages you run."
      >
        <ItemGroup>
          <Item variant="muted">
            <ItemMedia variant="image">
              <ResilientImage
                // No uploaded picture any more — the user page went with the
                // user feature — so the identity provider's claim is the only
                // avatar there is, and the initial is the fallback.
                src={me.picture}
                alt=""
                aria-hidden
                eager
                containerClassName="size-12 rounded-full"
                fallback={
                  <span
                    aria-hidden
                    className="grid size-full place-items-center bg-muted text-lg font-medium text-muted-foreground"
                  >
                    {me.name.charAt(0).toUpperCase()}
                  </span>
                }
              />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{me.name}</ItemTitle>
              <ItemDescription>{me.email}</ItemDescription>
            </ItemContent>
          </Item>

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

      <MyPages
        search={search}
        onSearchChange={onSearchChange}
        onPageCreated={(slug) => {
          // Straight to the page they just made. Leaving them on a list that
          // now has one more row they have to find is worse.
          void navigate({ to: "/p/$slug", params: { slug } })
        }}
      />
    </PageLayout>
  )
}
