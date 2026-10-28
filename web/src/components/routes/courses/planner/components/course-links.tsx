import { useState } from "react"
import { ExternalLinkIcon } from "lucide-react"

import { requirementRows } from "@/lib/courses/planner/schedule"
import type { CourseRequirements } from "@/lib/courses/planner/schedule"

/**
 * The two things worth a look before adding a course: its requisites and
 * priorities, and its syllabus. Used under a search result and under a course
 * in the shortlist, so both read the same.
 *
 * Renders nothing when the course has neither.
 */
export function CourseLinks({
  course,
  syllabus,
}: {
  course: CourseRequirements
  syllabus: string | undefined
}) {
  const [open, setOpen] = useState(false)
  const rows = requirementRows(course)
  if (rows.length === 0 && !syllabus) return null

  return (
    <div className="mt-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {rows.length > 0 && (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => {
              setOpen(!open)
            }}
            className="rounded-sm text-left font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Priorities &amp; requisites
          </button>
        )}
        {rows.length > 0 && syllabus && (
          <span className="text-border" aria-hidden>
            |
          </span>
        )}
        {syllabus && (
          <a
            href={syllabus}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            Syllabus
            <ExternalLinkIcon className="size-3" aria-hidden />
          </a>
        )}
      </div>

      {open && (
        <dl className="mt-2 space-y-2 rounded-md bg-muted/40 p-2 text-xs">
          {rows.map(([label, text]) => (
            <div key={label}>
              <dt className="font-medium text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 whitespace-pre-wrap">{text}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
