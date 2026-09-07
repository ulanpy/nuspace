import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { Page } from "@/components/routes/landing"
import { sessionQueryOptions } from "@/lib/user"

const landingSearchSchema = z.object({
  returnTo: z.string().optional(),
})

export const Route = createFileRoute("/_public/")({
  validateSearch: landingSearchSchema,
  beforeLoad: ({ context }) =>
    context.queryClient.ensureQueryData(sessionQueryOptions),
  component: LandingRoute,
})

function LandingRoute() {
  const { returnTo } = Route.useSearch()

  return <Page returnTo={returnTo} />
}
