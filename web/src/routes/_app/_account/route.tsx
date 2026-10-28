import { createFileRoute } from "@tanstack/react-router"

import { ACCOUNT_SECTIONS } from "@/components/layouts/account/sections"

/**
 * The account host's rail. Pathless: the host's mount, `/my`, is the directory
 * its routes sit in (`./my`), not a route of its own, because `/my` itself
 * would be the people directory (#436) and that screen is not built yet. Each
 * gated route below wraps its screen in `SignInGate`.
 */
export const Route = createFileRoute("/_app/_account")({
  staticData: { shell: { sections: ACCOUNT_SECTIONS } },
})
