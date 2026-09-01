import { createFileRoute } from "@tanstack/react-router"

import { PRIVACY_POLICY } from "@/features/legal/content"
import { LegalPage } from "@/features/legal/legal-page"

export const Route = createFileRoute("/_public/privacy-policy")({
  component: () => <LegalPage document={PRIVACY_POLICY} />,
})
