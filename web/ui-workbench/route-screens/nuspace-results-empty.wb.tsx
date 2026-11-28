// Stands in for nuspace.kz/?q=… — a term with nothing behind it.
import { useState } from "react"

import { EmptyState } from "@/components/shared/query/boundary"
import { Button } from "@/components/ui/button"

import { ResultsShell } from "./nuspace-results.shared"

export default function SearchResultsEmpty() {
  const [signedIn, setSignedIn] = useState(true)
  const [kind, setKind] = useState("all")

  return (
    <ResultsShell
      signedIn={signedIn}
      onToggle={setSignedIn}
      kind={kind}
      onKindChange={setKind}
      countLine="0 Sources (0.06 seconds)"
    >
      <EmptyState
        title="Nothing for that term"
        description="There was nothing to read, so there is no Overview either. Try a shorter term, or narrow by kind above."
        action={
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<a href="?c=nuspace-results">Search “quantum” instead</a>}
          />
        }
      />
    </ResultsShell>
  )
}
