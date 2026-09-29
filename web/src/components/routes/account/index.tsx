import { useNavigate } from "@tanstack/react-router"

import type { AccountSearch } from "@/routes/_app/account"
import { useCurrentUser, useSession } from "@/hooks/use-session"
import { Page as PageLayout } from "@/components/shared/page"
import { SettingsSection } from "@/components/shared/settings/settings-section"
import { TelegramLink } from "@/components/routes/account/components/telegram-link"
import { MyPages } from "@/components/routes/account/components/my-pages"

/**
 * The signed-in user's own corner of the app: the Telegram connection, and the
 * pages they own or administer.
 *
 * This replaced the per-profile settings at `/u/$slug/settings`, which was
 * reachable only by knowing your own handle and 404'd for everyone else. Being
 * logged in is now the whole guard.
 */
export function Page({
  search,
  onSearchChange,
}: {
  search: AccountSearch
  onSearchChange: (
    updater: (previous: AccountSearch) => AccountSearch,
    replace?: boolean
  ) => void
}) {
  const me = useCurrentUser()
  const session = useSession()
  const navigate = useNavigate()

  return (
    <PageLayout
      title="Account"
      description="Your Telegram connection and the pages you manage."
    >
      <SettingsSection
        title="Connecting Telegram"
        description="Nuspace sends notifications through the bot, so linking is how you hear about replies to your appeals."
      >
        <TelegramLink sub={me.sub} isLinked={session?.tg_id != null} />
      </SettingsSection>

      <SettingsSection
        title="My Pages"
        description="Pages you own, and pages where you are an admin."
      >
        <MyPages
          search={search}
          onSearchChange={onSearchChange}
          onPageCreated={(slug) => {
            // Straight to the page they just made. Leaving them on a list that
            // now has one more row they have to find is worse.
            void navigate({ to: "/p/$slug", params: { slug } })
          }}
        />
      </SettingsSection>
    </PageLayout>
  )
}
