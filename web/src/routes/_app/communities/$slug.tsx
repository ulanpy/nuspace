import { Outlet, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/communities/$slug")({
  component: CommunitiesSlugLayout,
})

function CommunitiesSlugLayout() {
  return <Outlet />
}
