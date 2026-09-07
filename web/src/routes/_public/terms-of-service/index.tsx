import { createFileRoute } from "@tanstack/react-router"

import { Page } from "@/components/routes/terms-of-service"

export const Route = createFileRoute("/_public/terms-of-service/")({
  component: TermsOfServiceRoute,
})

function TermsOfServiceRoute() {
  return <Page />
}
