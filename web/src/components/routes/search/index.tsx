import { useState } from "react"
import { useSearch } from "@tanstack/react-router"

import { Page } from "@/components/shared/page"
import type { SearchKind } from "@/lib/search"

import { FrontDoor } from "./front-door"
import { Results } from "./results"
import { SearchField } from "./search-field"

/**
 * The root host's one screen: the front door, or with `?q=` the results.
 *
 * The results sit on Google's left margin rather than in a centred box, so
 * they line up under the header's field: the header's mark is `xl:w-44` after
 * its 12px gutter, which puts the field 164px past this column's own gutter.
 */
export function SearchScreen({ q, kind }: { q?: string; kind?: SearchKind }) {
  const term = q?.trim()

  if (!term) {
    return (
      <Page>
        <FrontDoor />
      </Page>
    )
  }

  return (
    <Page className="mx-0 max-w-none xl:pl-[164px]">
      <Results key={`${term}|${kind ?? ""}`} q={term} kind={kind} />
    </Page>
  )
}

/**
 * The results header's field, in the shell's `search` slot. It reads the term
 * from the URL and shows nothing on the front door, which has its own field.
 * Keyed on the term so a new search resets what was typed.
 */
export function HeaderSearch() {
  const q = useSearch({ strict: false, select: (search) => search.q })
  if (!q) return null
  return <HeaderSearchField key={q} initial={q} />
}

function HeaderSearchField({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial)
  return <SearchField value={value} onValueChange={setValue} />
}
