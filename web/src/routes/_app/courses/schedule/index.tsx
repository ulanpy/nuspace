import { createFileRoute } from "@tanstack/react-router"
import { useCallback } from "react"
import { z } from "zod"

import { Page } from "@/components/routes/courses/schedule"

const scheduleSearchSchema = z.object({
  /**
   * The registrar term, e.g. `825`. In the URL so a planned schedule is
   * linkable and survives a reload — the old tab kept it in component state,
   * which meant refreshing quietly dropped you back to the default term.
   */
  term: z.string().optional(),
  /**
   * Which saved plan is open. In the URL for the same reason `term` is: a plan
   * someone has arranged is worth linking to, and a reload otherwise drops
   * them onto whichever plan happens to be first.
   *
   * Coerced, because the router JSON-encodes search values — a hand-written
   * `?plan=3` arrives as a number, and a bare `z.number()` would reject the
   * string form the router itself produces.
   */
  plan: z.coerce.number().optional(),
  /** The planner course whose section controls are open. */
  course: z.coerce.number().optional(),
})

export type ScheduleSearch = z.infer<typeof scheduleSearchSchema>

export const Route = createFileRoute("/_app/courses/schedule/")({
  validateSearch: scheduleSearchSchema,
  component: ScheduleBuilderRoute,
})

function ScheduleBuilderRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const onSearchChange = useCallback(
    (updater: (previous: ScheduleSearch) => ScheduleSearch) => {
      void navigate({
        search: updater,
      })
    },
    [navigate]
  )

  return <Page search={search} onSearchChange={onSearchChange} />
}
