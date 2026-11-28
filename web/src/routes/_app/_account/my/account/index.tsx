import { createFileRoute } from "@tanstack/react-router"

import { SignInGate } from "@/components/layouts/account/sign-in-gate"
import { AccountScreen } from "@/components/routes/my/account"

export const Route = createFileRoute("/_app/_account/my/account/")({
  component: AccountRoute,
})

function AccountRoute() {
  return (
    <SignInGate>
      <AccountScreen />
    </SignInGate>
  )
}
