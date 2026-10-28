import { createFileRoute } from "@tanstack/react-router"

import { SignInGate } from "@/components/layouts/account/sign-in-gate"
import { ProfileEditorScreen } from "@/components/routes/my/profile/edit"

/** `my.nuspace.kz/profile/edit`: the Page editor, on the viewer's own profile. */
export const Route = createFileRoute("/_app/_account/my/profile/edit/")({
  // The Puck canvas is the page itself, so it gets the whole viewport, as the
  // Page editor does.
  staticData: { shell: { bare: true } },
  component: ProfileEditorRoute,
})

function ProfileEditorRoute() {
  return (
    <SignInGate>
      <ProfileEditorScreen />
    </SignInGate>
  )
}
