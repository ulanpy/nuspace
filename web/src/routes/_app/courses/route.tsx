import {
  Link,
  Outlet,
  createFileRoute,
  useMatchRoute,
} from "@tanstack/react-router"
import type { LinkProps } from "@tanstack/react-router"

import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_app/courses")({
  component: CoursesLayout,
})

interface CourseTab {
  to: LinkProps["to"]
  label: string
  /** Index route needs exact matching or it stays lit on every child. */
  exact?: boolean
}

/**
 * The four tabs are real child routes, not `useState`.
 *
 * That makes each one linkable, back-button-able and separately code-split —
 * the schedule builder and degree audit are the two heaviest screens in the
 * app, and tab state in a single component meant shipping both to every student
 * who only wanted to check a grade.
 */
const TABS: CourseTab[] = [
  { to: "/courses", label: "My Courses", exact: true },
  { to: "/courses/statistics", label: "Statistics" },
  { to: "/courses/schedule", label: "Schedule Builder" },
  { to: "/courses/audit", label: "Degree Audit" },
]

function CoursesLayout() {
  const matchRoute = useMatchRoute()

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
        <p className="text-muted-foreground">
          Manage your classes, assignments, GPA and semester planning.
        </p>
      </header>

      <nav
        aria-label="Courses sections"
        className="-mx-1 flex gap-1 overflow-x-auto rounded-lg bg-muted p-1"
      >
        {TABS.map(({ to, label, exact }) => {
          const isActive = Boolean(matchRoute({ to, fuzzy: !exact }))

          return (
            <Link
              key={to}
              to={to}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      <Outlet />
    </div>
  )
}
