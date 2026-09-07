import { PRIVACY_POLICY } from "@/components/shared/legal/data"
import { LegalPage } from "@/components/shared/legal/legal-page"

export function Page() {
  return <LegalPage document={PRIVACY_POLICY} />
}
