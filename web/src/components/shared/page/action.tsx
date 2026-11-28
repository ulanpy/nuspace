import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export interface PageActionProps {
  /** The action's icon. A button without one is a word, not an action. */
  icon: LucideIcon
  children: ReactNode
  /** Where the action goes, when it goes somewhere. */
  href?: string
  onClick?: () => void
  /**
   * `default` is the one main action on a screen, filled. `secondary` is for
   * the second one, beside it.
   */
  variant?: "default" | "secondary"
}

/**
 * The one thing you can do on a screen, in the screen's header.
 *
 * A screen has at most one main action, and it lives in the page header
 * rather than in the body, where it is the same distance from the title on
 * every screen. It is always filled, always has an icon, and always has a
 * label — a wordless icon in a header is a puzzle, and a ghost button in a
 * header is a secondary thing pretending to be the main one.
 */
export function PageAction({
  icon: Icon,
  children,
  href,
  onClick,
  variant = "default",
}: PageActionProps) {
  if (href) {
    return (
      <Button
        variant={variant}
        nativeButton={false}
        render={<a href={href} />}
      >
        <Icon aria-hidden />
        {children}
      </Button>
    )
  }

  return (
    <Button variant={variant} onClick={onClick}>
      <Icon aria-hidden />
      {children}
    </Button>
  )
}
