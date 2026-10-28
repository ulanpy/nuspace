import { Outlet } from "@tanstack/react-router"

import { Page } from "@/components/shared/page"

/** The courses sections are in the site shell's rail: see `./sections`. */
export function CoursesLayout() {
  return (
    <Page
      title="Courses"
      description="Manage your classes, assignments, GPA and semester planning."
    >
      <Outlet />
    </Page>
  )
}
