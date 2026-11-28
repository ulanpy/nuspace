import { createFileRoute } from "@tanstack/react-router"

import { ACCOUNT_SECTIONS } from "@/components/layouts/account/sections"

/**
 * The account host's rail. Pathless: it only carries the shell options. The
 * people directory at `/my` is open to everyone; each gated route below wraps
 * its screen in `SignInGate`.
 */
export const Route = createFileRoute("/_app/_account")({
  staticData: { shell: { sections: ACCOUNT_SECTIONS } },
})
