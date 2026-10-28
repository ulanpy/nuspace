import { createFileRoute } from "@tanstack/react-router"
import { useCallback } from "react"
import { z } from "zod"

import { MyCoursesScreen } from "@/components/routes/courses"
import { Page } from "@/components/shared/page"

const myCoursesSearchSchema = z.object({
  course: z.coerce.number().optional(),
})

export type MyCoursesSearch = z.infer<typeof myCoursesSearchSchema>

export const Route = createFileRoute("/_app/courses/")({
  validateSearch: myCoursesSearchSchema,
  component: MyCoursesRoute,
})

function MyCoursesRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const onCourseSelect = useCallback(
    (courseId: number) => {
      void navigate({
        search: (previous) => ({ ...previous, course: courseId }),
      })
    },
    [navigate]
  )

  return (
    <Page title="My Courses">
      <MyCoursesScreen search={search} onCourseSelect={onCourseSelect} />
    </Page>
  )
}
