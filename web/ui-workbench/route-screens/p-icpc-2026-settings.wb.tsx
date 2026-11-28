// Stands in for pages.nuspace.kz/p/icpc-2026/settings — the settings of a Page
// you own, with the two sections the real route has.
import { useState } from "react"
import type { ReactNode } from "react"

import {
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  CrownIcon,
  PaletteIcon,
  Trash2Icon,
} from "lucide-react"

import type { PageVisibilityValue } from "@/lib/pages/types"
import { visibilityCopy } from "@/components/shared/pages/visibilities"
import { VisibilityPicker } from "@/components/shared/pages/visibility-picker"
import { Page } from "@/components/shared/page"
import { PageAction } from "@/components/shared/page/action"
import { SettingsSection } from "@/components/shared/settings/settings-section"
import { Badge } from "@/components/ui/badge"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

import { SiteHeader } from "../components/site-header.wb"
import { SignedInToggle } from "../components/signed-in"

import { ME } from "./account.wb.demo"

const TABS = ["general", "admin-controls"] as const

const PAGE = {
  name: "ICPC 2026",
  slug: "icpc-2026",
  description:
    "The regional contest. Three hours, one problem set, and a team of three.",
}

const ADMIN_LINK = "https://pages.nuspace.kz/p/icpc-2026/admin/4f1c2a"

/** A field that spans the row: its name and help, then the control. */
function FieldRow({
  label,
  description,
  children,
}: {
  label: string
  description?: ReactNode
  children: ReactNode
}) {
  return (
    <Item variant="muted">
      <ItemContent>
        <ItemTitle>{label}</ItemTitle>
        {description ? <ItemDescription>{description}</ItemDescription> : null}
        <div className="mt-2">{children}</div>
      </ItemContent>
    </Item>
  )
}

export default function PageSettings() {
  const [signedIn, setSignedIn] = useState(true)
  const [tab, setTab] = useState<(typeof TABS)[number]>("general")
  const [name, setName] = useState(PAGE.name)
  const [slug, setSlug] = useState(PAGE.slug)
  const [description, setDescription] = useState(PAGE.description)
  const [visibility, setVisibility] = useState<PageVisibilityValue>("public")
  const [copied, setCopied] = useState(false)

  const audience = visibilityCopy(visibility)

  const copyAdminLink = () => {
    navigator.clipboard
      .writeText(ADMIN_LINK)
      .then(() => {
        setCopied(true)
        window.setTimeout(() => {
          setCopied(false)
        }, 1600)
      })
      // Clipboard access can be refused; the link is on screen either way.
      .catch(() => {})
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      <SiteHeader account={signedIn ? ME : null} />
      <SignedInToggle signedIn={signedIn} onToggle={setSignedIn} />

      <main className="flex-1 px-4 py-6 sm:px-6">
        <Page
          title="Settings"
          width="prose"
          actions={
            <>
              <PageAction icon={PaletteIcon} href="?c=p-icpc-2026-editor">
                Design page
              </PageAction>
              <PageAction
                icon={ArrowLeftIcon}
                variant="secondary"
                href="?c=p-icpc-2026"
              >
                Back to page
              </PageAction>
            </>
          }
        >
          <Tabs
            className="w-fit max-w-full overflow-x-auto overflow-y-hidden"
            value={tab}
            onValueChange={(next) => {
              setTab(next === "admin-controls" ? "admin-controls" : "general")
            }}
          >
            <TabsList aria-label="Settings sections">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="admin-controls">Admin controls</TabsTrigger>
            </TabsList>
          </Tabs>

          {tab === "general" ? (
            <>
              <SettingsSection
                title="Details"
                description="How this page appears across the app."
              >
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault()
                  }}
                >
                  <ItemGroup>
                    <FieldRow label="Name">
                      <Input
                        value={name}
                        aria-label="Page name"
                        onChange={(event) => {
                          setName(event.target.value)
                        }}
                      />
                    </FieldRow>

                    <FieldRow
                      label="Description"
                      description="One line about what this page is for."
                    >
                      <Textarea
                        value={description}
                        aria-label="Page description"
                        rows={2}
                        onChange={(event) => {
                          setDescription(event.target.value)
                        }}
                      />
                    </FieldRow>

                    <FieldRow
                      label="URL"
                      description={
                        <>
                          Web address for your page, e.g.{" "}
                          <span className="font-medium">/p/icpc-2026</span>.
                          Lowercase letters, digits and single hyphens only.
                        </>
                      }
                    >
                      <Input
                        value={slug}
                        aria-label="Page address"
                        onChange={(event) => {
                          setSlug(event.target.value)
                        }}
                      />
                    </FieldRow>
                  </ItemGroup>

                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setName(PAGE.name)
                        setDescription(PAGE.description)
                        setSlug(PAGE.slug)
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      <CheckIcon aria-hidden />
                      Save
                    </Button>
                  </div>
                </form>
              </SettingsSection>

              <SettingsSection
                title="Visibility"
                description="Who can read this page."
              >
                <ItemGroup>
                  <Item variant="muted">
                    <ItemContent>
                      <ItemTitle>{audience.title}</ItemTitle>
                      <ItemDescription>{audience.description}</ItemDescription>
                    </ItemContent>
                    <ItemActions className="ml-auto">
                      <VisibilityPicker
                        value={visibility}
                        onValueChange={setVisibility}
                        idPrefix="page-settings-visibility"
                      />
                    </ItemActions>
                  </Item>
                </ItemGroup>
              </SettingsSection>

              <SettingsSection title="Danger zone">
                <Item
                  variant="outline"
                  className="border-destructive/30 bg-destructive/5"
                >
                  <ItemContent>
                    <ItemTitle>Delete this page</ItemTitle>
                    <ItemDescription>
                      The page and its images will be removed for everyone. Its
                      events are not deleted with it.
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Button
                      variant="outline"
                      className="shrink-0 text-destructive hover:text-destructive"
                    >
                      <Trash2Icon aria-hidden />
                      Delete page
                    </Button>
                  </ItemActions>
                </Item>
              </SettingsSection>
            </>
          ) : (
            <>
              <SettingsSection title="Admin access link">
                <ItemGroup>
                  <Item variant="muted">
                    <ItemContent>
                      <ItemTitle>Admin access link</ItemTitle>
                      <ItemDescription>
                        Anyone signed in who opens this link becomes an admin.
                        Do not share it publicly.
                      </ItemDescription>
                      <Input
                        readOnly
                        value={ADMIN_LINK}
                        aria-label="Admin access link"
                        className="mt-2 font-mono"
                      />
                    </ItemContent>
                    <ItemActions className="ml-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyAdminLink}
                      >
                        {copied ? (
                          <CheckIcon aria-hidden />
                        ) : (
                          <CopyIcon aria-hidden />
                        )}
                        {copied ? "Copied" : "Copy link"}
                      </Button>
                    </ItemActions>
                  </Item>
                </ItemGroup>
              </SettingsSection>

              <SettingsSection
                title="Admins"
                description="People who can edit this page, design it and manage its events."
              >
                <ItemGroup>
                  <Item variant="muted">
                    <ItemContent>
                      <ItemTitle>Aiger Bergenov</ItemTitle>
                      <ItemDescription>
                        aiger.bergenov@nu.edu.kz
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions className="ml-auto">
                      <Badge variant="secondary">
                        <CrownIcon aria-hidden />
                        Owner
                      </Badge>
                    </ItemActions>
                  </Item>

                  <Item variant="muted">
                    <ItemContent>
                      <ItemTitle>Aiza Tursyn</ItemTitle>
                      <ItemDescription>aiza.t@nu.edu.kz</ItemDescription>
                    </ItemContent>
                    <ItemActions className="ml-auto">
                      <Button size="sm" variant="outline">
                        Remove
                      </Button>
                    </ItemActions>
                  </Item>
                </ItemGroup>
              </SettingsSection>
            </>
          )}
        </Page>
      </main>
    </div>
  )
}
