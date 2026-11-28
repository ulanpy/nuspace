// Stands in for nuspace.kz/?q=… — fewer than three Sources, so no Overview.
import { useState } from "react"

import { WEAK_SOURCES } from "./nuspace-results.wb.demo"

import { Results, ResultsShell } from "./nuspace-results.shared"

export default function SearchResultsAbstain() {
  const [signedIn, setSignedIn] = useState(true)
  const [kind, setKind] = useState("all")

  return (
    <ResultsShell
      signedIn={signedIn}
      onToggle={setSignedIn}
      kind={kind}
      onKindChange={setKind}
      countLine="2 Sources (0.08 seconds)"
    >
      <Results sources={WEAK_SOURCES} />
    </ResultsShell>
  )
}
