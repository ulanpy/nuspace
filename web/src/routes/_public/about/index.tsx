import { createFileRoute } from "@tanstack/react-router"

import { Page } from "@/components/routes/about"

export const Route = createFileRoute("/_public/about/")({
  component: AboutRoute,
})

function AboutRoute() {
  return <Page />
}
