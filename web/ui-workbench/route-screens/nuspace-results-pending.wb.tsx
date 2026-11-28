// Stands in for nuspace.kz/?q=… — the Overview is still in flight.
import { useState } from "react"

import { SOURCES } from "./nuspace-results.wb.demo"

import {
  OverviewPending,
  Results,
  ResultsShell,
} from "./nuspace-results.shared"

export default function SearchResultsPending() {
  const [signedIn, setSignedIn] = useState(true)
  const [kind, setKind] = useState("all")

  return (
    <ResultsShell
      signedIn={signedIn}
      onToggle={setSignedIn}
      kind={kind}
      onKindChange={setKind}
      countLine="About 1,240 Sources (0.31 seconds)"
    >
      <OverviewPending />
      <Results sources={SOURCES.slice(0, 2)} />
    </ResultsShell>
  )
}
