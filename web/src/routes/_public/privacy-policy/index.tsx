import { createFileRoute } from "@tanstack/react-router"

import { Page } from "@/components/routes/privacy-policy"

export const Route = createFileRoute("/_public/privacy-policy/")({
  component: PrivacyPolicyRoute,
})

function PrivacyPolicyRoute() {
  return <Page />
}
