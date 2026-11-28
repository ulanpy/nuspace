// Stands in for my.nuspace.kz/ — the host's front door, which is the people
// directory.
import { useMemo, useState } from "react"

import { ChevronRightIcon } from "lucide-react"

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
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"

import { visibleTo, type ProfilePerson } from "./people.wb.demo"

const ACCOUNT = { name: "Aiza Tursyn", handle: "@aiza.t" }

function ProfileAsPageCard({ person }: { person: ProfilePerson }) {
  return (
    <PageCard
      name={person.name}
      description={person.department}
      avatar={person.picture}
      banner={null}
      href="?c=u-aiza"
    />
  )
}

export default function PeopleDirectory() {
  const [q, setQ] = useState("")
  const [signedIn, setSignedIn] = useState(false)

  const visible = visibleTo(signedIn ? "signed-in" : "anonymous")

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return visible
    return visible.filter((person) =>
      `${person.name} ${person.handle} ${person.department ?? ""}`
        .toLowerCase()
        .includes(needle)
    )
  }, [q, visible])

  return (
    <div className="flex min-h-full flex-col bg-background">
      <SiteHeader account={signedIn ? ACCOUNT : null} />
      <SignedInToggle signedIn={signedIn} onToggle={setSignedIn} />

      <main className="flex-1 px-4 py-6 sm:px-6">
        <Page
          title="People"
          actions={
            <PageAction
              icon={ChevronRightIcon}
              variant="secondary"
              href="?c=u-aiza"
            >
              My Profile
            </PageAction>
          }
        >
          <div className="flex items-center gap-3">
            <SearchFilter
              className="w-64 flex-none"
              value={q}
              onChange={setQ}
              placeholder="Search"
              label="Search these profiles"
            />
          </div>

          {matches.length === 0 ? (
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyTitle>No profiles</EmptyTitle>
                <EmptyDescription>
                  {q
                    ? `Nothing here matches "${q}".`
                    : "No profile you can open is listed yet."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <CardGrid columns={3}>
              {matches.map((person) => (
                <ProfileAsPageCard key={person.handle} person={person} />
              ))}
            </CardGrid>
          )}
        </Page>
      </main>

      <SiteFooter />
    </div>
  )
}
