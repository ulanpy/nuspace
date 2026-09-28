import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/profile/")({
  beforeLoad: () => {
    throw redirect({ to: "/profile/general" })
  },
})
