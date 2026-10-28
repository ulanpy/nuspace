import { createFileRoute } from "@tanstack/react-router"

import { DegreeAuditGuideScreen } from "@/components/routes/courses/audit/guide"

export const Route = createFileRoute("/_app/courses/audit/guide/")({
  component: DegreeAuditGuideRoute,
})

function DegreeAuditGuideRoute() {
  return <DegreeAuditGuideScreen />
}
