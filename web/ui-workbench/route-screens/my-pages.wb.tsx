import { useState } from "react"

import { PencilIcon, PlusIcon, SettingsIcon } from "lucide-react"

import { PAGE_OWNERSHIP, PAGE_OWNERSHIP_FILTERS } from "@/lib/pages/constants"
import { visibilityLabel } from "@/components/shared/pages/visibilities"
import { VisibilityPicker } from "@/components/shared/pages/visibility-picker"
import { Page } from "@/components/shared/page"
import { PageAction } from "@/components/shared/page/action"
import { PageCard } from "@/components/shared/page/card"
import { CardGrid } from "@/components/shared/page/card-grid"
import { DataTableFacetedFilter } from "@/components/shared/data-table/data-table-faceted-filter"
import { SettingsSection } from "@/components/shared/settings/settings-section"
import { SearchFilter } from "@/components/shared/list-filters"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { PageVisibilityValue } from "@/lib/pages/types"

import { AccountLayout, AccountSections } from "../components/account-layout.wb"
import { SiteHeader } from "../components/site-header.wb"
import { SignedInToggle } from "../components/signed-in"

import { ME, MY_PAGES } from "./account.wb.demo"

function CreatePageDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [visibility, setVisibility] = useState<PageVisibilityValue>("internal")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a page</DialogTitle>
        </DialogHeader>

        <Field>
          <FieldLabel>Name</FieldLabel>
          <Input placeholder="The name of the page" />
        </Field>

        <Field>
          <FieldLabel>Visibility</FieldLabel>
          <VisibilityPicker
            value={visibility}
            onValueChange={setVisibility}
            idPrefix="my-page-visibility"
          />
        </Field>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onOpenChange(false)}>Create page</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MyPagesPage({
  signedIn,
  onSignOut,
}: {
  signedIn: boolean
  onSignOut: () => void
}) {
  const [query, setQuery] = useState("")
  const [roles, setRoles] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  const rows = MY_PAGES.filter((page) => {
    if (roles.length > 0 && !roles.includes(page.role)) return false
    if (!query) return true
    return `${page.name} ${page.slug}`
      .toLowerCase()
      .includes(query.toLowerCase())
  })

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader
        rail={
          <AccountSections
            at="/pages"
            signedIn={signedIn}
            pageCount={MY_PAGES.length}
          />
        }
        account={signedIn ? ME : null}
        onSignOut={onSignOut}
      />

      <div className="flex min-h-0 flex-1">
        <AccountLayout
          at="/pages"
          signedIn={signedIn}
          pageCount={MY_PAGES.length}
        >
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <Page
              title="My Pages"
              actions={
                <PageAction
                  icon={PlusIcon}
                  onClick={() => {
                    setCreating(true)
                  }}
                >
                  Create page
                </PageAction>
              }
            >
              <div className="flex flex-wrap items-center gap-2">
                <SearchFilter
                  className="w-64 flex-none"
                  placeholder="Search"
                  value={query}
                  onChange={setQuery}
                />
                <DataTableFacetedFilter
                  title="Role"
                  options={PAGE_OWNERSHIP_FILTERS.map((option) => ({
                    label: option.label,
                    value: option.value,
                  }))}
                  selectedValues={roles}
                  onSelectionChange={(next) => {
                    setRoles(next ?? [])
                  }}
                />
              </div>

              {rows.length === 0 ? (
                <Empty className="border border-dashed">
                  <EmptyHeader>
                    <EmptyTitle>
                      {query || roles.length > 0
                        ? "No pages match your filters"
                        : "No pages yet"}
                    </EmptyTitle>
                    <EmptyDescription>
                      {query || roles.length > 0
                        ? "Try a different name or role."
                        : "You do not own or administer any page yet."}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    {query || roles.length > 0 ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setQuery("")
                          setRoles([])
                        }}
                      >
                        Clear filters
                      </Button>
                    ) : (
                      <PageAction
                        icon={PlusIcon}
                        onClick={() => {
                          setCreating(true)
                        }}
                      >
                        Create page
                      </PageAction>
                    )}
                  </EmptyContent>
                </Empty>
              ) : (
                <CardGrid columns={3}>
                  {rows.map((page) => (
                    <PageCard
                      key={page.id}
                      name={page.name}
                      description={page.description}
                      banner={page.banner}
                      avatar={page.avatar}
                      href="#"
                      actions={
                        <>
                          <Badge variant="secondary">
                            {PAGE_OWNERSHIP[page.role]}
                          </Badge>
                          <Badge variant="outline">
                            {visibilityLabel(page.visibility)}
                          </Badge>
                          <Button
                            size="icon-sm"
                            variant="outline"
                            aria-label={`Edit ${page.name}`}
                          >
                            <PencilIcon aria-hidden />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="outline"
                            aria-label={`Settings for ${page.name}`}
                          >
                            <SettingsIcon aria-hidden />
                          </Button>
                        </>
                      }
                    />
                  ))}
                </CardGrid>
              )}

              <CreatePageDialog open={creating} onOpenChange={setCreating} />
            </Page>
          </main>
        </AccountLayout>
      </div>
    </div>
  )
}

export default function MyPages() {
  const [signedIn, setSignedIn] = useState(true)

  return (
    <>
      <MyPagesPage
        signedIn={signedIn}
        onSignOut={() => {
          setSignedIn(false)
        }}
      />
      <SignedInToggle signedIn={signedIn} onToggle={setSignedIn} />
    </>
  )
}
