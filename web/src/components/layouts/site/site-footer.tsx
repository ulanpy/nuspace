import { Link } from "@tanstack/react-router"

const LINK =
  "rounded-sm hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"

/**
 * The foot of every host: About on the left, the two legal routes on the
 * right. All three live on the root host; from any other host the router's
 * rewrite links them there.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background text-sm text-muted-foreground">
      <nav
        aria-label="Footer"
        className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3.5 sm:px-7"
      >
        <Link to="/about" className={LINK}>
          About
        </Link>
        <div className="ml-auto flex gap-6">
          <Link to="/privacy" className={LINK}>
            Privacy
          </Link>
          <Link to="/terms" className={LINK}>
            Terms
          </Link>
        </div>
      </nav>
    </footer>
  )
}
