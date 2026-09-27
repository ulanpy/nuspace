import { Outlet } from "@tanstack/react-router"

import { PageContainer } from "@/components/shared/page/container"
import { PageHeader } from "@/components/shared/page/header"
import { TabsNav } from "@/components/shared/tabs-nav"

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
    <PageContainer maxWidth="wide" padding="none" className="space-y-6">
      <PageHeader
        title="Courses"
        description="Manage your classes, assignments, GPA and semester planning."
      />

      <TabsNav label="Courses sections" tabs={TABS} />

      <Outlet />
    </PageContainer>
  )
}
