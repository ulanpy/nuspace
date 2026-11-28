import { useState } from "react"

import { ChevronRightIcon } from "lucide-react"

import { MAX_PAGES_PER_OWNER } from "@/lib/pages/constants"
import { Page } from "@/components/shared/page"
import { CardGrid } from "@/components/shared/page/card-grid"
import { SettingsSection } from "@/components/shared/settings/settings-section"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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

import { AccountLayout, AccountSections } from "../components/account-layout.wb"
import { SiteHeader } from "../components/site-header.wb"
import { SignedInToggle } from "../components/signed-in"

import { ME, ME_PROFILE, MY_PAGES } from "./account.wb.demo"

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

function AccountPage({
  signedIn,
  onSignOut,
}: {
  signedIn: boolean
  onSignOut: () => void
}) {
  const owned = MY_PAGES.filter((page) => page.role === "owner").length
  const administered = MY_PAGES.length - owned

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader
        rail={
          <AccountSections
            at="/account"
            signedIn={signedIn}
            pageCount={MY_PAGES.length}
          />
        }
        account={signedIn ? ME : null}
        onSignOut={onSignOut}
      />

      <div className="flex min-h-0 flex-1">
        <AccountLayout
          at="/account"
          signedIn={signedIn}
          pageCount={MY_PAGES.length}
        >
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <Page
              title={ME.name}
              description={ME.email}
              media={
                <Avatar className="size-16">
                  <AvatarFallback className="text-xl">
                    {ME.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              }
            >
              <SettingsSection title="Profile">
                <CardGrid columns={3}>
                  <Stat value={`@${ME_PROFILE.handle}`} label="Handle" />
                  <Stat value="Public" label="Visibility" />
                  <Stat value="Listed" label="Listed in search and contacts" />
                </CardGrid>

                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<a href="?c=profile-settings" />}
                >
                  Profile Settings
                  <ChevronRightIcon aria-hidden />
                </Button>
              </SettingsSection>

              <SettingsSection title="My Pages">
                <CardGrid columns={3}>
                  <Stat value={owned} label="Pages you own" />
                  <Stat value={administered} label="Where you are an admin" />
                  <Stat
                    value={MAX_PAGES_PER_OWNER - owned}
                    label={`Of the ${MAX_PAGES_PER_OWNER} pages you may own`}
                  />
                </CardGrid>

                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<a href="?c=my-pages" />}
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
                      <Button variant="outline" size="sm">
                        Connect Telegram
                      </Button>
                    </ItemActions>
                  </Item>
                </ItemGroup>
              </SettingsSection>
            </Page>
          </main>
        </AccountLayout>
      </div>
    </div>
  )
}

export default function AccountDashboard() {
  const [signedIn, setSignedIn] = useState(true)

  return (
    <>
      <AccountPage
        signedIn={signedIn}
        onSignOut={() => {
          setSignedIn(false)
        }}
      />
      <SignedInToggle signedIn={signedIn} onToggle={setSignedIn} />
    </>
  )
}
