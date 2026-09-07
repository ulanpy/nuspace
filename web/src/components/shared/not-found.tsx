import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"

/**
 * A real 404.
 *
 * The old app's not-found component started a 100ms timer and then replaced the
 * URL with `/`, so a typo, a stale bookmark or a renamed route all looked like
 * an unexplained bounce to the home page — and left nothing to report.
 */
export function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground">
          That address doesn&apos;t match anything on Nuspace. It may have
          moved, or the link may be incomplete.
        </p>
        <Button render={<Link to="/">Go to Nuspace</Link>} />
      </div>
    </div>
  )
}
