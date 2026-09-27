import { createFileRoute } from "@tanstack/react-router"

import { Page } from "@/components/routes/communities/settings/general"
import { Route as SettingsRoute } from "../route"

export const Route = createFileRoute(
  "/_app/communities/$slug/settings/general/"
)({
  component: CommunitySettingsGeneralRoute,
})

function CommunitySettingsGeneralRoute() {
  // The layout's loader owns the fetch and the permission guard; this route
  // adds nothing of its own, so it reads the community from there rather than
  // repeating `ensureQueryData`.
  const { community } = SettingsRoute.useLoaderData()

  return <Page community={community} />
}
