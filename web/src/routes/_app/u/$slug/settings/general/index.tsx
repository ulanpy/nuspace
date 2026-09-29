import { createFileRoute } from "@tanstack/react-router"

import { Page } from "@/components/routes/u/$slug/settings/general"

export const Route = createFileRoute("/_app/u/$slug/settings/general/")({
  component: ProfileGeneralRoute,
})

function ProfileGeneralRoute() {
  return <Page />
}
