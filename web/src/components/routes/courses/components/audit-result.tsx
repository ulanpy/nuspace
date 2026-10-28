import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ArrowUpDownIcon, FileDownIcon, ListChecksIcon } from "lucide-react"

import { QueryBoundary } from "@/components/shared/query/boundary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

import { degreeRequirementsQueryOptions } from "@/lib/courses"
import { nextStatusSort, sortRequirements } from "@/lib/courses/audit"
import type { StatusSort } from "@/lib/courses/audit"
import type {
  AuditProgram,
  AuditRequirement,
  AuditResponse,
} from "@/lib/courses"

/**
 * Save the audit's own CSV.
 *
 * The backend builds this alongside the on-screen result, so it is the same
 * numbers rather than a second rendering of them — worth offering, since
 * planning remaining courses tends to happen in a spreadsheet.
 */
function downloadCsv(base64: string, filename: string) {
  const binary = atob(base64)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  const url = URL.createObjectURL(new Blob([bytes], { type: "text/csv" }))

  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}

function programKey(program: AuditProgram): string {
  return `${program.type}-${program.name}`
}

/** "major" → "Major": the backend sends the type in lower case. */
function programLabel(program: AuditProgram): string {
  const type = program.type.charAt(0).toUpperCase() + program.type.slice(1)
  return `${type} - ${program.name}`
}

/**
 * The backend sends every credit figure as a preformatted string, so they are
 * rendered verbatim rather than parsed and reformatted — reformatting risks
 * disagreeing with the CSV export of the same audit.
 */
function SummaryBadges({ program }: { program: AuditProgram }) {
  const { summary } = program
  if (!summary) return null

  const figures = [
    { label: "Required", value: summary.total_required },
    { label: "Applied", value: summary.total_applied },
    { label: "Remaining", value: summary.total_remaining },
    { label: "Taken", value: summary.total_taken },
  ]

  return (
    <ul className="flex flex-wrap gap-2">
      {figures.map(({ label, value }) => (
        <li key={label}>
          <Badge variant="outline" className="tabular-nums">
            {label}: {value}
          </Badge>
        </li>
      ))}
    </ul>
  )
}

function StatusBadge({ status }: { status: AuditRequirement["status"] }) {
  const satisfied = status === "Satisfied"

  return (
    <Badge
      variant={satisfied ? "outline" : "destructive"}
      className={cn(satisfied && "border-success/50 text-success")}
    >
      {status}
    </Badge>
  )
}

function RequirementsTable({ program }: { program: AuditProgram }) {
  // Outstanding first: this screen is used to work out what is still needed,
  // not to admire what is already done.
  const [sort, setSort] = useState<StatusSort>("pending")
  const rows = sortRequirements(program.results, sort)

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full text-left text-[13px] text-muted-foreground">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-3 py-2 font-medium">Course</th>
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 text-right font-medium whitespace-nowrap">
              Req credits
            </th>
            <th className="px-3 py-2 text-center font-medium whitespace-nowrap">
              Min grade
            </th>
            <th
              className="px-3 py-2 font-medium"
              aria-sort={
                sort === "source"
                  ? "none"
                  : sort === "pending"
                    ? "ascending"
                    : "descending"
              }
            >
              <button
                type="button"
                onClick={() => {
                  setSort(nextStatusSort)
                }}
                title={STATUS_SORT_TITLE[sort]}
                aria-label={`Status. ${STATUS_SORT_TITLE[sort]}`}
                className="inline-flex items-center gap-1 rounded-sm font-medium text-foreground hover:text-foreground/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                Status
                <ArrowUpDownIcon className="size-3.5" aria-hidden />
              </button>
            </th>
            <th className="px-3 py-2 font-medium whitespace-nowrap">
              Used courses
            </th>
            <th className="px-3 py-2 text-right font-medium whitespace-nowrap">
              Applied
            </th>
            <th className="px-3 py-2 text-right font-medium whitespace-nowrap">
              Remaining
            </th>
            <th className="px-3 py-2 font-medium">Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.course_code}-${row.course_name}`}
              className="border-t border-border"
            >
              <td className="px-3 py-2 font-medium whitespace-nowrap text-foreground">
                {row.course_code}
              </td>
              <td className="min-w-48 px-3 py-2 text-foreground">
                {row.course_name}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {row.credits_required}
              </td>
              <td className="px-3 py-2 text-center">{row.min_grade}</td>
              <td className="px-3 py-2">
                <StatusBadge status={row.status} />
              </td>
              <td className="min-w-32 px-3 py-2 text-[12px]">
                {row.used_courses}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {row.credits_applied}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {row.credits_remaining}
              </td>
              <td className="min-w-40 px-3 py-2 text-[12px]">{row.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const STATUS_SORT_TITLE: Record<StatusSort, string> = {
  pending: "Sorted with outstanding first. Click to put satisfied first.",
  satisfied: "Sorted with satisfied first. Click for the original order.",
  source: "Original order. Click to put outstanding first.",
}

function RequirementsDialog({
  year,
  program,
  onOpenChange,
}: {
  year: string
  program: AuditProgram | null
  onOpenChange: (open: boolean) => void
}) {
  const requirements = useQuery(
    degreeRequirementsQueryOptions(
      year,
      program?.name ?? "",
      program?.type ?? "major"
    )
  )

  return (
    <Dialog
      open={program !== null}
      onOpenChange={(open) => {
        onOpenChange(open)
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{program?.name} requirements</DialogTitle>
          <DialogDescription>
            Published requirements for the {year} catalogue year. These are the
            rules used by the audit above.
          </DialogDescription>
        </DialogHeader>

        <QueryBoundary
          query={requirements}
          empty={
            <p className="text-sm text-muted-foreground">
              No published requirements were returned for this programme.
            </p>
          }
        >
          {(items) => (
            <ul className="space-y-2">
              {items.map((requirement) => (
                <li
                  key={`${requirement.course_code}-${requirement.course_name}`}
                  className="space-y-2 rounded-lg border p-3"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="font-medium">{requirement.course_code}</p>
                      <p className="text-sm text-muted-foreground">
                        {requirement.course_name}
                      </p>
                    </div>
                    <p className="text-sm tabular-nums">
                      {requirement.credits_need} credits
                      {requirement.min_grade
                        ? ` · min ${requirement.min_grade}`
                        : ""}
                    </p>
                  </div>
                  {requirement.options.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Options: {requirement.options.join(", ")}
                    </p>
                  )}
                  {requirement.must_haves.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Must include: {requirement.must_haves.join(", ")}
                    </p>
                  )}
                  {requirement.excepts.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Excludes: {requirement.excepts.join(", ")}
                    </p>
                  )}
                  {requirement.comments && (
                    <p className="text-xs text-muted-foreground">
                      {requirement.comments}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </QueryBoundary>
      </DialogContent>
    </Dialog>
  )
}

export function AuditResult({ audit }: { audit: AuditResponse }) {
  const csv = audit.csv_base64
  const [requirementsProgram, setRequirementsProgram] =
    useState<AuditProgram | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  // A new audit may not contain the programme that was open, so an unknown key
  // falls back to the first one rather than showing nothing.
  const program =
    audit.audits.find((candidate) => programKey(candidate) === selectedKey) ??
    audit.audits[0]

  return (
    <div className="space-y-4">
      {audit.unmapped_tc_courses.length > 0 && (
        <Card className="space-y-2 border-warning p-4">
          <h3 className="font-semibold">Transfer credits not matched</h3>
          <p className="text-sm text-muted-foreground">
            These appear on your transcript but could not be matched to an NU
            course code, so they count toward nothing below.
          </p>
          <ul className="space-y-1 text-sm">
            {audit.unmapped_tc_courses.map((course) => (
              <li key={course.code} className="tabular-nums">
                {course.code} · {course.title} · {course.credits}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {program && (
        <Card>
          <CardHeader className="space-y-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle className="text-base font-semibold">Results</CardTitle>

              {audit.audits.length > 1 ? (
                <Select
                  value={programKey(program)}
                  onValueChange={(value) => {
                    setSelectedKey(value)
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    aria-label="Programme"
                    className="w-auto max-w-[360px] min-w-[200px]"
                  >
                    <SelectValue>{programLabel(program)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {audit.audits.map((candidate) => (
                      <SelectItem
                        key={programKey(candidate)}
                        value={programKey(candidate)}
                      >
                        {programLabel(candidate)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-medium">{programLabel(program)}</p>
              )}

              <SummaryBadges program={program} />

              <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                {csv && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const programmes = [...audit.majors, ...audit.minors]
                        .join("-")
                        .replace(/[^\w-]+/g, "_")
                      downloadCsv(
                        csv,
                        `degree-audit-${audit.year}-${programmes}.csv`
                      )
                    }}
                  >
                    <FileDownIcon aria-hidden />
                    Download CSV
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRequirementsProgram(program)
                  }}
                >
                  <ListChecksIcon aria-hidden />
                  View requirements
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
            {program.warnings.length > 0 && (
              <ul className="space-y-1 rounded-lg border border-warning bg-warning/10 p-3 text-sm">
                {program.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}

            <RequirementsTable key={programKey(program)} program={program} />
          </CardContent>
        </Card>
      )}

      <RequirementsDialog
        year={audit.year}
        program={requirementsProgram}
        onOpenChange={(open) => {
          if (!open) setRequirementsProgram(null)
        }}
      />
    </div>
  )
}
