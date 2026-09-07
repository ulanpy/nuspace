import { createFileRoute } from "@tanstack/react-router"

import { CoursesLayout } from "@/components/layouts/courses"

export const Route = createFileRoute("/_app/courses")({
  component: CoursesLayout,
})
