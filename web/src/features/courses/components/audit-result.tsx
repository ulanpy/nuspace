import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { BookOpen, Download } from "lucide-react"

import { QueryBoundary } from "@/components/query-boundary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

import { degreeRequirementsQueryOptions } from "../api"
import type { AuditProgram, AuditRequirement, AuditResponse } from "../types"

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

/**
 * The backend sends every credit figure as a preformatted string, so they are
 * rendered verbatim rather than parsed and reformatted — reformatting risks
 * disagreeing with the CSV export of the same audit.
 */
function SummaryFigures({ program }: { program: AuditProgram }) {
  const { summary } = program
  if (!summary) return null

  const figures = [
    { label: "Required", value: summary.total_required },
    { label: "Applied", value: summary.total_applied },
    { label: "Remaining", value: summary.total_remaining },
    { label: "Taken", value: summary.total_taken },
  ]

  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-2">
      {figures.map(({ label, value }) => (
        <div key={label}>
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="text-lg font-semibold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function RequirementRow({ requirement }: { requirement: AuditRequirement }) {
  const isSatisfied = requirement.status === "Satisfied"

  return (
    <li
      className={cn(
        "flex flex-col gap-1 rounded-lg border p-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
        isSatisfied ? "border-border" : "border-warning/50 bg-warning/5"
      )}
    >
      <div className="min-w-0">
        <p className="font-medium">{requirement.course_code}</p>
        <p className="text-sm text-muted-foreground">
          {requirement.course_name}
        </p>

        {requirement.used_courses && (
          <p className="mt-1 text-xs text-muted-foreground">
            Counted: {requirement.used_courses}
          </p>
        )}
        {requirement.note && (
          <p className="mt-1 text-xs text-muted-foreground">
            {requirement.note}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="text-xs text-muted-foreground tabular-nums">
          {requirement.credits_applied} / {requirement.credits_required}
          {requirement.min_grade && ` · min ${requirement.min_grade}`}
        </span>
        <Badge variant={isSatisfied ? "secondary" : "outline"}>
          {requirement.status}
        </Badge>
      </div>
    </li>
  )
}

function ProgramCard({
  program,
  onViewRequirements,
}: {
  program: AuditProgram
  onViewRequirements: () => void
}) {
  const pending = program.results.filter(
    (requirement) => requirement.status !== "Satisfied"
  )

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{program.name}</h3>
          <p className="text-sm text-muted-foreground">
            {/* Only the type is capitalized; applying it to the whole line
                title-cases the sentence into "18 Of 37 Requirements". */}
            <span className="capitalize">{program.type}</span> ·{" "}
            {pending.length} of {program.results.length} requirements
            outstanding
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onViewRequirements}>
          <BookOpen aria-hidden />
          View requirements
        </Button>
      </div>

      <SummaryFigures program={program} />

      {program.warnings.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-warning bg-warning/10 p-3 text-sm">
          {program.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}

      {/* Outstanding requirements first: this screen is used to work out what
          is still needed, not to admire what is already done. */}
      <ul className="space-y-2">
        {[...program.results]
          .sort((a, b) =>
            a.status === b.status ? 0 : a.status === "Satisfied" ? 1 : -1
          )
          .map((requirement) => (
            <RequirementRow
              key={`${requirement.course_code}-${requirement.course_name}`}
              requirement={requirement}
            />
          ))}
      </ul>
    </Card>
  )
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

  return (
    <div className="space-y-4">
      {csv && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const programmes = [...audit.majors, ...audit.minors]
                .join("-")
                .replace(/[^\w-]+/g, "_")
              downloadCsv(csv, `degree-audit-${audit.year}-${programmes}.csv`)
            }}
          >
            <Download aria-hidden />
            Download CSV
          </Button>
        </div>
      )}

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

      {audit.audits.map((program) => (
        <ProgramCard
          key={`${program.type}-${program.name}`}
          program={program}
          onViewRequirements={() => {
            setRequirementsProgram(program)
          }}
        />
      ))}

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
