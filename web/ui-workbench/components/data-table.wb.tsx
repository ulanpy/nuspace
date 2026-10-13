import { useMemo, useState } from "react"
import type { SortingState } from "@tanstack/react-table"

import { COURSES, COURSE_COLUMNS, sortCourses } from "./data-table.wb.demo"

import { DataTable } from "@/components/shared/data-table/data-table"
import { useDataTable } from "@/hooks/use-data-table"

function Default() {
  const [sorting, setSorting] = useState<SortingState>([])
  const data = useMemo(() => sortCourses(COURSES, sorting), [sorting])

  return (
    <DataTable
      table={useDataTable({
        data,
        columns: COURSE_COLUMNS,
        sorting,
        onSortingChange: setSorting,
        getRowId: (row) => row.code,
      })}
      emptyState={
        <p className="p-4 text-sm text-muted-foreground">
          No courses this term.
        </p>
      }
    />
  )
}

function Loading() {
  return (
    <DataTable
      table={useDataTable({
        data: [],
        columns: COURSE_COLUMNS,
        getRowId: (row: (typeof COURSES)[number]) => row.code,
      })}
      isLoading
      skeletonRows={4}
      emptyState={
        <p className="p-4 text-sm text-muted-foreground">No courses.</p>
      }
    />
  )
}

function Empty() {
  return (
    <DataTable
      table={useDataTable({
        data: [],
        columns: COURSE_COLUMNS,
        getRowId: (row: (typeof COURSES)[number]) => row.code,
      })}
      emptyState={
        <p className="p-4 text-sm text-muted-foreground">
          No courses this term.
        </p>
      }
    />
  )
}

export default function DataTableDemos() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Default</h2>
        <Default />
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Loading</h2>
        <Loading />
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Empty</h2>
        <Empty />
      </section>
    </div>
  )
}
