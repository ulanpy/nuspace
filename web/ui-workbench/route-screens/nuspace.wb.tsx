// Stands in for nuspace.kz/ — the apex host's front door.
import { useState } from "react"

import { Button } from "@/components/ui/button"

import { TRY_TERMS } from "./nuspace.wb.demo"

import { SearchField } from "../components/search-field.wb"
import { SignedInToggle } from "../components/signed-in"
import { SiteFooter } from "../components/site-footer.wb"
import { SiteHeader } from "../components/site-header.wb"

const ACCOUNT = { name: "Aiza Tursyn", handle: "aiza" }

/**
 * The wordmark, as the SVG it is going to be. The real asset arrives as a
 * file; this is the shape of it — the app's own heading face, the app's own
 * `primary`, on the baseline the word sits on.
 */
function Wordmark() {
  return (
    <svg viewBox="0 0 320 76" className="h-16 w-auto text-primary">
      <title>Nuspace</title>
      <text
        x="0"
        y="58"
        fontFamily="var(--font-sans)"
        fontSize="72"
        fontWeight="700"
        letterSpacing="-0.04em"
        fill="currentColor"
      >
        Nuspace
      </text>
    </svg>
  )
}

/**
 * Google's shape and nothing else: the mark, one field, one button, and the
 * foot of the page. `leading={null}` because the root host carries its mark in
 * the body rather than in the corner, which is what google.com does — the
 * bar's corner carries Courses instead, the service a student lands on most.
 *
 * Three things a Google homepage has that this does not: a language line (the
 * app is English only, and a picker that switches nothing is worse than none),
 * a country line, and a second button. The nine-dot launcher is the one thing
 * that carried over unchanged, because all six hosts are real.
 *
 * "I'm Feeling Lucky" stays because it is a function, not a product name: the
 * pager returns a ranked list, so going straight to the top hit is one `?q=`.
 */
export default function NuspaceSearch() {
  const [signedIn, setSignedIn] = useState(false)

  return (
    <div className="flex min-h-full flex-col bg-background">
      <SiteHeader leading={null} courses account={signedIn ? ACCOUNT : null} />

      <main className="flex flex-1 flex-col items-center px-4 pt-[22vh] pb-10">
        <Wordmark />

        <div className="mt-8 w-full max-w-xl">
          <SearchField size="hero" />
        </div>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button
            variant="secondary"
            nativeButton={false}
            render={<a href="?c=nuspace-results">I&apos;m Feeling Lucky</a>}
          />
        </div>

        <ul className="mt-8 flex flex-wrap justify-center gap-3">
          {TRY_TERMS.map((term) => (
            <li key={term}>
              <Button
                variant="secondary"
                nativeButton={false}
                render={
                  <a href={`?c=nuspace-results&q=${encodeURIComponent(term)}`}>
                    {term}
                  </a>
                }
              />
            </li>
          ))}
        </ul>
      </main>

      <SiteFooter />

      <SignedInToggle signedIn={signedIn} onToggle={setSignedIn} />
    </div>
  )
}
