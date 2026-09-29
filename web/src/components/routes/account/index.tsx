import { useNavigate } from "@tanstack/react-router"

import type { AccountSearch } from "@/routes/_app/account"
import { useCurrentUser, useSession } from "@/hooks/use-session"
import { Page as PageLayout } from "@/components/shared/page"
import { SettingsSection } from "@/components/shared/settings/settings-section"
import { TelegramLink } from "@/components/routes/account/components/telegram-link"
import { MyPages } from "@/components/routes/account/components/my-pages"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
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
      // The eyebrow keeps the route's name now that the `h1` is the person.
      // "Account" as an `h1` and again as a section heading 30px below it, with
      // two descriptions saying the same thing, is what this replaces.
      eyebrow="Account"
      title={me.name}
      description={me.email}
      // `wide`, not `prose`: the page hosts a table, and a centred `max-w-3xl`
      // column makes six columns scroll sideways.
      width="wide"
      media={
        <Avatar className="size-12">
          {/* No uploaded picture any more — the user page went with the user
              feature — so the identity provider's claim is the only avatar
              there is, and the initial is the fallback. `Avatar` is already
              round and sizes itself, which is the whole fix: the old markup put
              a `size-12` image inside `ItemMedia`'s hardcoded `size-10
              overflow-hidden rounded-sm`, so the image was bigger than the box
              clipping it and the `rounded-full` never read. */}
          <AvatarImage src={me.picture ?? undefined} alt="" />
          <AvatarFallback className="text-lg">
            {me.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      }
    >
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
