import { TERMS_OF_SERVICE } from "@/components/shared/legal/data"
import { LegalPage } from "@/components/shared/legal/legal-page"

export function Page() {
  return <LegalPage document={TERMS_OF_SERVICE} />
}
