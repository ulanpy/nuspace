import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"

interface NotFoundProps {
  title?: string
  description?: string
  to?: string
  actionLabel?: string
}

/**
 * A real 404.
 *
 * The old app's not-found component started a 100ms timer and then replaced the
 * URL with `/`, so a typo, a stale bookmark or a renamed route all looked like
 * an unexplained bounce to the home page — and left nothing to report.
 *
 * Copy is a prop so a route that knows what it was looking for says so: the
 * community page used to ship a near-copy of this whole layout.
 */
export function NotFound({
  title = "Page not found",
  description = "That address doesn’t match anything on Nuspace. It may have moved, or the link may be incomplete.",
  to = "/",
  actionLabel = "Go to Nuspace",
}: NotFoundProps) {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
        <Button
          nativeButton={false}
          render={<Link to={to}>{actionLabel}</Link>}
        />
      </div>
    </div>
  )
}
