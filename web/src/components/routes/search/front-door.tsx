import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { SUGGESTED_TERMS, searchResultsQueryOptions } from "@/lib/search"

import { SearchField } from "./search-field"

/** The wordmark: the app's heading face, the app's `primary`. */
function Wordmark() {
  return (
    <h1 className="text-6xl font-bold tracking-tighter text-primary sm:text-7xl">
      Nuspace
    </h1>
  )
}

/**
 * The root host's front door, Google's shape: the wordmark, one field, "I'm
 * Feeling Lucky", and a few terms to try.
 *
 * "I'm Feeling Lucky" searches the field's term (or the first suggested term
 * when the field is blank) and opens the top result's canonical address. With
 * no result it lands on the results page, which says so.
 */
export function FrontDoor() {
  const [value, setValue] = useState("")
  const [lucky, setLucky] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  async function feelLucky() {
    const q = value.trim() || SUGGESTED_TERMS[0]
    setLucky(true)
    try {
      const data = await queryClient.fetchInfiniteQuery(
        searchResultsQueryOptions({ q })
      )
      const top = data.pages[0]?.results[0]
      if (top) {
        window.location.assign(top.url)
        return
      }
    } catch {
      // The results page shows the error state, with the six hosts.
    }
    setLucky(false)
    void navigate({ to: "/", search: { q } })
  }

  return (
    <div className="flex flex-col items-center pt-[18vh] pb-10">
      <Wordmark />

      <SearchField
        size="hero"
        value={value}
        onValueChange={setValue}
        className="mt-8 max-w-xl"
      >
        <div className="mt-7 flex justify-center">
          <Button
            type="button"
            variant="secondary"
            disabled={lucky}
            onClick={() => {
              void feelLucky()
            }}
          >
            I&apos;m Feeling Lucky
          </Button>
        </div>
      </SearchField>

      <ul
        aria-label="Try searching for"
        className="mt-8 flex flex-wrap justify-center gap-3"
      >
        {SUGGESTED_TERMS.map((term) => (
          <li key={term}>
            <Button
              variant="secondary"
              nativeButton={false}
              render={<Link to="/" search={{ q: term }} />}
            >
              {term}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
