// Stands in for nuspace.kz/?q=… — the two shapes a result can take, and the
// URLs they are reached by. Not a state: the same route, compared.
import { useState } from "react"

import {
  LINK_COMPARISON,
  NO_SITELINKS_VERSION,
  SITELINKS_VERSION,
} from "./nuspace-results.wb.demo"

import { Result, ResultsShell } from "./nuspace-results.shared"
import { Separator } from "@/components/ui/separator"

export default function SearchResultsVariants() {
  const [signedIn, setSignedIn] = useState(true)
  const [kind, setKind] = useState("all")

  return (
    <ResultsShell
      signedIn={signedIn}
      onToggle={setSignedIn}
      kind={kind}
      onKindChange={setKind}
      countLine="One Source, two shapes"
    >
      <Result source={SITELINKS_VERSION} index={0} />
      <Result source={NO_SITELINKS_VERSION} index={0} />

      <Separator className="my-8" />

      <h2 className="text-lg font-semibold">Deep links</h2>
      <dl className="mt-4 space-y-3">
        {LINK_COMPARISON.map((link) => (
          <div
            key={link.to}
            className="flex flex-col gap-1 sm:flex-row sm:gap-6"
          >
            <dt className="shrink-0 font-mono text-xs break-all text-primary sm:w-96">
              {link.to}
            </dt>
            <dd className="text-sm text-muted-foreground">{link.lands}</dd>
          </div>
        ))}
      </dl>
    </ResultsShell>
  )
}
