import { createFileRoute, redirect } from "@tanstack/react-router"

import { Page } from "@/components/routes/profile"

export const Route = createFileRoute("/_app/profile/")({
  // `_app` leaves browsing public, so this route guards itself. The parent
  // `beforeLoad` has already resolved the session into context.
  beforeLoad: ({ context }) => {
    if (!context.session) {
      throw redirect({ to: "/" })
    }
  },
  component: ProfileRoute,
})

function ProfileRoute() {
  return <Page />
}
