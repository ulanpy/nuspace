import { createFileRoute } from "@tanstack/react-router"

import { AboutScreen } from "@/components/routes/about"

export const Route = createFileRoute("/_public/about/")({
  component: AboutRoute,
})

function AboutRoute() {
  return <AboutScreen />
}
