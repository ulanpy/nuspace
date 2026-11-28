// Stands in for nuspace.kz/?q=… — a query that came back with Sources.
import { useState } from "react"

import { COUNT_LINE, SOURCES } from "./nuspace-results.wb.demo"

import { Overview, Results, ResultsShell } from "./nuspace-results.shared"

export default function SearchResults() {
  const [signedIn, setSignedIn] = useState(true)
  const [kind, setKind] = useState("all")

  return (
    <ResultsShell
      signedIn={signedIn}
      onToggle={setSignedIn}
      kind={kind}
      onKindChange={setKind}
      countLine={COUNT_LINE}
    >
      {signedIn ? <Overview sources={SOURCES} /> : null}
      <Results sources={SOURCES} />
    </ResultsShell>
  )
}
