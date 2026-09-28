import { Outlet } from "@tanstack/react-router"

import { Page } from "@/components/shared/page"
import { RouteTabs } from "@/components/shared/route-tabs"

/**
 * The four tabs are real child routes, not `useState`.
 *
 * That makes each one linkable, back-button-able and separately code-split —
 * the schedule builder and degree audit are the two heaviest screens in the
 * app, and tab state in a single component meant shipping both to every student
 * who only wanted to check a grade.
 */
const TABS = [
  { to: "/courses", label: "My Courses", exact: true },
  { to: "/courses/statistics", label: "Statistics" },
  { to: "/courses/schedule", label: "Schedule Builder" },
  { to: "/courses/audit", label: "Degree Audit" },
] as const

export function CoursesLayout() {
  return (
    <Page
      title="Courses"
      description="Manage your classes, assignments, GPA and semester planning."
    >
      <RouteTabs label="Courses sections" tabs={TABS} />

      <Outlet />
    </Page>
  )
}
