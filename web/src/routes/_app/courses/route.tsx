import { createFileRoute } from "@tanstack/react-router"

import { CoursesLayout } from "@/components/layouts/courses"
import { COURSES_SECTIONS } from "@/components/layouts/courses/sections"

export const Route = createFileRoute("/_app/courses")({
  staticData: { shell: { sections: COURSES_SECTIONS } },
  component: CoursesLayout,
})
