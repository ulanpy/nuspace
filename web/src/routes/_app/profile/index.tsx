import { createFileRoute } from "@tanstack/react-router"

import { Page } from "@/components/routes/profile"

export const Route = createFileRoute("/_app/profile/")({
  component: ProfileRoute,
})

function ProfileRoute() {
  return <Page />
}
