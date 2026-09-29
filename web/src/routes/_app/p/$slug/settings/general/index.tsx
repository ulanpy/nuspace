import { createFileRoute } from "@tanstack/react-router"

import { Page } from "@/components/routes/pages/settings/general"
import { Route as SettingsRoute } from "../route"

export const Route = createFileRoute("/_app/p/$slug/settings/general/")({
  component: PageSettingsGeneralRoute,
})

function PageSettingsGeneralRoute() {
  // The layout's loader owns the fetch and the permission guard; this route
  // adds nothing of its own, so it reads the page from there rather than
  // repeating `ensureQueryData`.
  const { page } = SettingsRoute.useLoaderData()

  return <Page page={page} />
}
