import { useMemo, useState } from "react"

import { ArrowUpRightIcon, PlusIcon } from "lucide-react"

import { SiteFooter } from "../components/site-footer.wb"
import { SiteHeader } from "../components/site-header.wb"
import { SignedInToggle } from "../components/signed-in"

import { SearchFilter } from "@/components/shared/list-filters"
import { Page } from "@/components/shared/page"
import { PageAction } from "@/components/shared/page/action"
import { PageCard } from "@/components/shared/page/card"
import { CardGrid } from "@/components/shared/page/card-grid"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"

import { PAGES } from "./pages.wb.demo"

const ACCOUNT = { name: "Aiza Tursyn", handle: "@aiza.t" }

function AccessWall() {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyTitle>Pages is behind the access gate</EmptyTitle>
        <EmptyDescription>
          One account across every Nuspace host: the three session cookies are
          set on .nuspace.kz, so the account you hold on my.nuspace.kz is
          already signed in here. This is that session, not a second login.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <PageAction icon={ArrowUpRightIcon} href="?c=account">
          Sign in
        </PageAction>
      </EmptyContent>
    </Empty>
  )
}

export default function PagesDirectory() {
  const [q, setQ] = useState("")
  const [signedIn, setSignedIn] = useState(false)

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return PAGES
    return PAGES.filter((page) =>
      `${page.name} ${page.description ?? ""}`.toLowerCase().includes(needle)
    )
  }, [q])

  return (
    <div className="flex min-h-full flex-col bg-background">
      <SiteHeader account={signedIn ? ACCOUNT : null} />
      <SignedInToggle signedIn={signedIn} onToggle={setSignedIn} />

      <main className="flex-1 px-4 py-6 sm:px-6">
        <Page
          title="Pages"
          actions={
            signedIn ? (
              <PageAction icon={PlusIcon} href="?c=my-pages">
                Create page
              </PageAction>
            ) : null
          }
        >
          {signedIn ? (
            <>
              <div className="flex items-center gap-3">
                <SearchFilter
                  className="w-64 flex-none"
                  value={q}
                  onChange={setQ}
                  placeholder="Search"
                />
              </div>

              {matches.length === 0 ? (
                <Empty className="border border-dashed">
                  <EmptyHeader>
                    <EmptyTitle>No pages</EmptyTitle>
                    <EmptyDescription>
                      Nothing matches this search.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <CardGrid columns={3}>
                  {matches.map((page) => (
                    <PageCard
                      key={page.slug}
                      name={page.name}
                      description={page.description}
                      banner={page.banner}
                      avatar={page.avatar}
                      href="#"
                    />
                  ))}
                </CardGrid>
              )}
            </>
          ) : (
            <AccessWall />
          )}
        </Page>
      </main>

      <SiteFooter />
    </div>
  )
}
