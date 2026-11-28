import { createFileRoute } from "@tanstack/react-router"

import { TermsScreen } from "@/components/routes/terms"

export const Route = createFileRoute("/_public/terms/")({
  component: TermsRoute,
})

function TermsRoute() {
  return <TermsScreen />
}
