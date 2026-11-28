import type { ReactNode } from "react"
import { LogInIcon } from "lucide-react"

import { useSignInHref } from "@/components/layouts/site/use-sign-in-href"
import { PageAction } from "@/components/shared/page/action"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { useSession } from "@/hooks/use-session"

function SignInPrompt() {
  const href = useSignInHref()

  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyTitle>Sign in to see this</EmptyTitle>
        <EmptyDescription>
          Your account, the Pages you own or administer, and your profile
          settings are yours alone. One Nuspace sign-in covers every site.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <PageAction icon={LogInIcon} href={href}>
          Sign in
        </PageAction>
      </EmptyContent>
    </Empty>
  )
}

/**
 * A gated route's body. Signed out, the shell stays and this prompt takes the
 * screen's place, rather than the route redirecting away from the address the
 * visitor asked for. Wrap the screen, not its parts: a screen that reads the
 * signed-in user must not render at all without one.
 */
export function SignInGate({ children }: { children: ReactNode }) {
  const session = useSession()

  return session ? children : <SignInPrompt />
}
