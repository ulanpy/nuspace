import { createFileRoute } from "@tanstack/react-router"

import { Page } from "@/components/routes/degree-audit-info"

export const Route = createFileRoute("/_app/degree-audit-info/")({
  component: DegreeAuditInfoRoute,
})

function DegreeAuditInfoRoute() {
  return <Page />
}
