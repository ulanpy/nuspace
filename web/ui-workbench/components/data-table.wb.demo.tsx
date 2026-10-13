/**
 * Fixtures for `data-table.wb.tsx`. Deleted when the table is finished with;
 * the component is written against its real props.
 */
import type { ColumnDef, SortingState } from "@tanstack/react-table"

export type Course = {
  code: string
  name: string
  credits: number
  grade: string
}

export const COURSES: readonly Course[] = [
  { code: "MATH 251", name: "Linear Algebra", credits: 5, grade: "B+" },
  { code: "ECON 201", name: "Microeconomics", credits: 5, grade: "A" },
  { code: "CS 302", name: "Data Structures", credits: 6, grade: "A-" },
  { code: "PHYS 101", name: "Physics I", credits: 4, grade: "B" },
]

export const COURSE_COLUMNS: ColumnDef<Course>[] = [
  { accessorKey: "code", header: "Code" },
  { accessorKey: "name", header: "Course" },
  { accessorKey: "credits", header: "Credits" },
  { accessorKey: "grade", header: "Grade" },
]

/** Lookup by column id, so sorting needs no cast and unknown ids sort as "". */
const COLUMNS_BY_ID: Record<string, (row: Course) => string | number> = {
  code: (row) => row.code,
  name: (row) => row.name,
  credits: (row) => row.credits,
  grade: (row) => row.grade,
}

/**
 * `useDataTable` sets `manualSorting`, so react-table never reorders rows on
 * its own and only reports the click. In the app the caller forwards that to
 * the server; here it is sorted locally so the chevron does something visible.
 */
export function sortCourses(rows: readonly Course[], sorting: SortingState) {
  const [active] = sorting
  if (!active) return [...rows]

  const direction = active.desc ? -1 : 1

  return [...rows].sort((a, b) => {
    const left = String(COLUMNS_BY_ID[active.id]?.(a) ?? "")
    const right = String(COLUMNS_BY_ID[active.id]?.(b) ?? "")
    return left.localeCompare(right, undefined, { numeric: true }) * direction
  })
}
