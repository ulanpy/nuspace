// Stands in for nuspace.kz/?q=… — the index is down. The bar still works.
import { useState } from "react"

import { ApiError } from "@/api/client"
import { EmptyState, QueryError } from "@/components/shared/query/boundary"
import { Button } from "@/components/ui/button"

import { SERVICE_HOSTS, hostUrl } from "../components/service-hosts"

import { ResultsShell } from "./nuspace-results.shared"

export default function SearchResultsError() {
  const [signedIn, setSignedIn] = useState(true)
  const [kind, setKind] = useState("all")

  return (
    <ResultsShell
      signedIn={signedIn}
      onToggle={setSignedIn}
      kind={kind}
      onKindChange={setKind}
      countLine="Search is unavailable"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <QueryError error={new ApiError(503, null)} onRetry={() => {}} />

        <EmptyState
          title="The rest of Nuspace"
          action={
            <ul className="space-y-1 text-sm">
              {SERVICE_HOSTS.map((host) => (
                <li key={host.id}>
                  <a href={hostUrl(host.id)} className="hover:underline">
                    {host.host}
                  </a>
                </li>
              ))}
            </ul>
          }
        />
      </div>

      <Button variant="outline" size="sm">
        Try again
      </Button>
    </ResultsShell>
  )
}
