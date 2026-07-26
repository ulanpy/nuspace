import { createFileRoute } from "@tanstack/react-router"

import { TERMS_OF_SERVICE } from "@/features/legal/content"
import { LegalPage } from "@/features/legal/legal-page"

export const Route = createFileRoute("/_public/terms-of-service")({
  component: () => <LegalPage document={TERMS_OF_SERVICE} />,
})
