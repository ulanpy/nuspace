import { createFileRoute } from "@tanstack/react-router"

import { PrivacyScreen } from "@/components/routes/privacy"

export const Route = createFileRoute("/_public/privacy/")({
  component: PrivacyRoute,
})

function PrivacyRoute() {
  return <PrivacyScreen />
}
