import { NOT_FOUND_LEAD, destinations } from "@/lib/hosts"

interface NotFoundProps {
  title?: string
  description?: string
}

/**
 * A real 404, naming the six hosts.
 *
 * The old app's not-found component started a 100ms timer and then replaced the
 * URL with `/`, so a typo, a stale bookmark or a renamed route all looked like
 * an unexplained bounce to the home page — and left nothing to report.
 *
 * It lists the same six destinations as the page nginx answers a wrong-host
 * path with (web/nginx/404.*.html), as plain addresses rather than a guess at
 * where this one moved. They are full-page links: each host is its own site.
 *
 * Copy is a prop so a route that knows what it was looking for says so.
 */
export function NotFound({
  title = "Page not found",
  description = "That address doesn’t match anything on Nuspace.",
}: NotFoundProps) {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-md space-y-4">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">
          {description} {NOT_FOUND_LEAD}
        </p>
        <ul className="divide-y divide-border border-y border-border">
          {destinations(window.location.hostname).map((destination) => (
            <li key={destination.key} className="py-3">
              {destination.prompt}{" "}
              <a
                href={destination.href}
                className="font-semibold underline underline-offset-4"
              >
                {destination.host}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
