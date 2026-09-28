import { createFileRoute } from "@tanstack/react-router"

import { Page } from "@/components/routes/profile/editor"

export const Route = createFileRoute("/_app/profile/editor/")({
  component: ProfileEditorRoute,
})

function ProfileEditorRoute() {
  const { queryClient } = Route.useRouteContext()

  return <Page queryClient={queryClient} />
}
