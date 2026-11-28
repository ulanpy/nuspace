// Stands in for my.nuspace.kz/profile/settings — the settings for the profile
// you own, which no longer carries your handle in its address.
import { useState } from "react"

import { CheckIcon, EyeIcon, PencilIcon, UploadIcon } from "lucide-react"

import { PAGE_VISIBILITIES } from "@/lib/pages/constants"
import type { PageVisibilityValue } from "@/lib/pages/types"
import { Page } from "@/components/shared/page"
import { PageAction } from "@/components/shared/page/action"
import { SettingsSection } from "@/components/shared/settings/settings-section"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

import { AccountLayout, AccountSections } from "../components/account-layout.wb"
import { SiteHeader } from "../components/site-header.wb"
import { SignedInToggle } from "../components/signed-in"

import { ME, ME_PROFILE } from "./account.wb.demo"

function ProfileSettingsPage({
  signedIn,
  onSignOut,
}: {
  signedIn: boolean
  onSignOut: () => void
}) {
  const [handle, setHandle] = useState(ME_PROFILE.handle)
  const [visibility, setVisibility] = useState<PageVisibilityValue>("public")
  const [listed, setListed] = useState(true)

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader
        rail={
          <AccountSections at="/profile" signedIn={signedIn} pageCount={8} />
        }
        account={signedIn ? ME : null}
        onSignOut={onSignOut}
      />

      <div className="flex min-h-0 flex-1">
        <AccountLayout at="/profile" signedIn={signedIn} pageCount={8}>
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <Page
              title="Profile"
              width="prose"
              actions={
                <>
                  <PageAction
                    icon={EyeIcon}
                    variant="secondary"
                    href="?c=u-aiza"
                  >
                    See Profile
                  </PageAction>
                  <PageAction icon={PencilIcon} href="?c=profile-editor">
                    Edit Profile
                  </PageAction>
                </>
              }
            >
              <SettingsSection title="Handle">
                <ItemGroup>
                  <Item variant="muted">
                    <ItemContent>
                      <ItemTitle>Handle</ItemTitle>
                      <ItemDescription>
                        Your profile page at my.nuspace.kz/u/{handle}
                      </ItemDescription>
                      <Input
                        value={handle}
                        aria-label="Your handle"
                        className="mt-2 max-w-48"
                        onChange={(event) => {
                          setHandle(event.target.value)
                        }}
                      />
                    </ItemContent>
                    <ItemActions className="ml-auto">
                      <Button size="sm">
                        <CheckIcon aria-hidden />
                        Save
                      </Button>
                    </ItemActions>
                  </Item>
                </ItemGroup>
              </SettingsSection>

              <SettingsSection title="Visibility">
                <ItemGroup>
                  <Item variant="muted">
                    <ItemContent>
                      <div className="flex items-center justify-between gap-4">
                        <ItemTitle>Visibility</ItemTitle>
                        <Select
                          value={visibility}
                          items={PAGE_VISIBILITIES.map((option) => ({
                            value: option.value,
                            label: option.title,
                          }))}
                          onValueChange={(next) => {
                            setVisibility(next as PageVisibilityValue)
                          }}
                        >
                          <SelectTrigger className="w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAGE_VISIBILITIES.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <ItemDescription className="mt-1">
                        Who can read your profile page.
                      </ItemDescription>
                    </ItemContent>
                  </Item>

                  <Item variant="muted">
                    <ItemContent>
                      <ItemTitle id="listed-label">
                        Listed in search and contacts
                      </ItemTitle>
                      <ItemDescription className="line-clamp-none">
                        People at NU can find you at my.nuspace.kz/people.
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions className="ml-auto">
                      <Switch
                        aria-labelledby="listed-label"
                        checked={listed}
                        onCheckedChange={setListed}
                      />
                    </ItemActions>
                  </Item>
                </ItemGroup>
              </SettingsSection>

              <SettingsSection title="Picture and banner">
                <ItemGroup>
                  <Item variant="muted">
                    <ItemContent>
                      <ItemTitle>Profile picture</ItemTitle>
                      <ItemDescription className="line-clamp-none">
                        Your photo on the profile page. It replaces the one from
                        sign-in.
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Button variant="outline" size="sm">
                        <UploadIcon aria-hidden />
                        Upload
                      </Button>
                    </ItemActions>
                  </Item>

                  <Item variant="muted">
                    <ItemContent>
                      <ItemTitle>Banner</ItemTitle>
                      <ItemDescription className="line-clamp-none">
                        The wide strip at the top of your profile page.
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Button variant="outline" size="sm">
                        <UploadIcon aria-hidden />
                        Upload
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

export default function ProfileSettings() {
  const [signedIn, setSignedIn] = useState(true)

  return (
    <>
      <ProfileSettingsPage
        signedIn={signedIn}
        onSignOut={() => {
          setSignedIn(false)
        }}
      />
      <SignedInToggle signedIn={signedIn} onToggle={setSignedIn} />
    </>
  )
}
