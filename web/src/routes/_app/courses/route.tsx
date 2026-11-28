import { createFileRoute } from "@tanstack/react-router"

import { COURSES_SECTIONS } from "@/components/layouts/courses/sections"

/**
 * The courses host: the shell's rail carries the four sections. Each screen
 * brings its own `Page` heading, so a section never sits under another
 * section's title.
 */
export const Route = createFileRoute("/_app/courses")({
  staticData: { shell: { sections: COURSES_SECTIONS } },
})
