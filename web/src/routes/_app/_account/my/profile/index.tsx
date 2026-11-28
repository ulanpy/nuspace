import { createFileRoute } from "@tanstack/react-router"

import { SignInGate } from "@/components/layouts/account/sign-in-gate"
import { ProfileSettingsScreen } from "@/components/routes/my/profile"

/** `my.nuspace.kz/profile`: the viewer's own profile settings, by session, not by handle. */
export const Route = createFileRoute("/_app/_account/my/profile/")({
  component: ProfileSettingsRoute,
})

function ProfileSettingsRoute() {
  return (
    <SignInGate>
      <ProfileSettingsScreen />
    </SignInGate>
  )
}
