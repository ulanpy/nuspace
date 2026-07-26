import { Link, Outlet, createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"

import logoUrl from "@/assets/nuspace_logo.svg"
import { sessionQueryOptions } from "@/features/auth/api"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
})

const FOOTER_LINKS = [
  { to: "/about", label: "About" },
  { to: "/privacy-policy", label: "Privacy" },
  { to: "/terms-of-service", label: "Terms" },
] as const

/**
 * Shell for pages that must work signed out: the landing page and the two legal
 * documents, which have to be readable by anyone — including an OAuth reviewer
 * with no NU account.
 *
 * Signed-in visitors keep the same shell rather than being bounced into the app;
 * only the header action changes, so a link to the privacy policy from anywhere
 * lands somewhere sensible either way.
 */
function PublicLayout() {
  const { data: session } = useQuery(sessionQueryOptions)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3 safe-area-inset-top">
        <Link
          to="/"
          aria-label="Nuspace home"
          className="flex items-center gap-2 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <img src={logoUrl} alt="" aria-hidden className="size-7" />
          <span className="text-lg font-semibold tracking-tight">Nuspace</span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {session && (
            <Button
              variant="outline"
              size="sm"
              render={<Link to="/announcements">Open Nuspace</Link>}
            />
          )}
        </div>
      </header>

      <main className="flex-1 px-4">
        <Outlet />
      </main>

      <footer className="border-t border-border px-4 py-6 safe-area-inset-bottom">
        <nav
          className="mx-auto flex max-w-prose flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
          aria-label="Footer"
        >
          {FOOTER_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="rounded-sm hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {label}
            </Link>
          ))}
          <span className="ml-auto">A student project at NU</span>
        </nav>
      </footer>
    </div>
  )
}
