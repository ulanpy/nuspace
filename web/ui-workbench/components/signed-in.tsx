import { Button } from "@/components/ui/button"

/**
 * Scaffolding for the workbench, not part of any page.
 *
 * A signed-in/out switch pinned over the frame, so both header states can be
 * judged without editing a fixture. It is deliberately *not* rendered by
 * `SiteHeader`: a page draws the session it is given, and the control that
 * changes that session belongs to the entry file, not to the page.
 */
export function SignedInToggle({
  signedIn,
  onToggle,
}: {
  signedIn: boolean
  onToggle: (next: boolean) => void
}) {
  return (
    <div className="fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-full border bg-background/95 px-2 py-1 shadow-lg backdrop-blur">
      <Button
        size="sm"
        variant={signedIn ? "secondary" : "default"}
        className="h-7 rounded-full px-3 text-xs"
        onClick={() => onToggle(!signedIn)}
      >
        {signedIn ? "Signed in" : "Signed out"}
      </Button>
      <span className="pr-2 text-xs text-muted-foreground">session</span>
    </div>
  )
}
