import { createFileRoute } from "@tanstack/react-router"

import { Page } from "@/components/routes/profile/general"

export const Route = createFileRoute("/_app/profile/general/")({
  component: ProfileGeneralRoute,
})

function ProfileGeneralRoute() {
  return <Page />
}
