import { createFileRoute } from "@tanstack/react-router"

import { Page } from "@/components/routes/sgotinish"

export const Route = createFileRoute("/_app/sgotinish/")({
  component: SGotinishRoute,
})

function SGotinishRoute() {
  return <Page />
}
