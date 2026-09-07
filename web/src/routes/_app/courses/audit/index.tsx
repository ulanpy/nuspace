import { createFileRoute } from "@tanstack/react-router"
import { useCallback } from "react"
import { z } from "zod"

import { Page } from "@/components/routes/courses/audit"

const auditSearchSchema = z.object({
  /**
   * Admission year — requirements differ by catalogue year.
   *
   * Coerced rather than plain string: the router JSON-encodes search values, so
   * a year round-trips as `?year=%222024%22`. Someone linking or editing the URL
   * by hand will write `?year=2024`, which parses as a number and would fail a
   * bare `z.string()`.
   */
  year: z.coerce.string().optional(),
  majors: z.array(z.string()).optional(),
  minors: z.array(z.string()).optional(),
})

export type AuditSearch = z.infer<typeof auditSearchSchema>

export const Route = createFileRoute("/_app/courses/audit/")({
  validateSearch: auditSearchSchema,
  component: DegreeAuditRoute,
})

function DegreeAuditRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const onSearchChange = useCallback(
    (updater: (previous: AuditSearch) => AuditSearch) => {
      void navigate({
        search: updater,
      })
    },
    [navigate]
  )

  return <Page search={search} onSearchChange={onSearchChange} />
}
