import { useState } from "react"
import {
  ArrowUpDownIcon,
  ChevronDownIcon,
  FileDownIcon,
  GraduationCapIcon,
  ListChecksIcon,
  ShieldCheckIcon,
  UploadIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

import { CoursesShell } from "../components/courses-shell.wb"

import { Page } from "@/components/shared/page"

import { AUDIT_ROWS, AUDIT_SUMMARY } from "./courses-audit.wb.demo"

export default function CoursesAudit() {
  const [sort, setSort] = useState<"default" | "satisfied" | "pending">(
    "default"
  )

  const rows = [...AUDIT_ROWS].sort((a, b) => {
    if (sort === "default") return 0
    const order =
      sort === "satisfied"
        ? { Satisfied: 0, Pending: 1 }
        : { Pending: 0, Satisfied: 1 }
    return (
      order[a.status] - order[b.status] ||
      a.course_code.localeCompare(b.course_code)
    )
  })

  return (
    <CoursesShell activeId="audit">
      <Page title="Degree Audit">
        <div className="space-y-4">
          <Card>
            <CardHeader className="space-y-1.5 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <GraduationCapIcon
                  className="size-5 text-primary"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <CardTitle className="text-base font-semibold">
                      Degree Audit
                    </CardTitle>
                    <a
                      href="?c=courses-audit"
                      className="text-xs text-primary hover:underline"
                    >
                      How it works
                    </a>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Match your transcript against your degree requirements with
                    registrar or PDF upload.
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 p-4 pt-0 sm:p-5 sm:pt-0">
              <Accordion
                defaultValue={[]}
                className="rounded-lg border border-border"
              >
                <AccordionItem value="disclaimer" className="border-0 px-3">
                  <AccordionTrigger className="py-3 hover:no-underline">
                    <span className="inline-flex items-center gap-2 text-sm font-medium">
                      <ShieldCheckIcon
                        className="size-4 text-muted-foreground"
                        aria-hidden
                      />
                      Important note
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-[13px] leading-relaxed text-muted-foreground">
                    <p>
                      Please note that the output is preliminary and is based on
                      the Academic Handbook provided by the Academic Advising
                      Office. The handbook itself may contain inaccuracies, and
                      degree requirements may change over time and may not
                      always be fully reflected in it.
                    </p>
                    <p>
                      Therefore, this output should be used as a guiding
                      reference only and not as a final confirmation. Final
                      degree completion requirements are confirmed exclusively
                      by Program Directors.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[13px] text-muted-foreground">
                  Run again to refresh against your latest transcript.
                </p>
                <div className="flex items-center gap-2">
                  <Button size="sm">
                    Run again
                    <GraduationCapIcon className="size-4" aria-hidden />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          size="icon-sm"
                          variant="outline"
                          aria-label="More audit options"
                        >
                          <ChevronDownIcon className="size-4" aria-hidden />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <UploadIcon className="size-4" aria-hidden />
                        Run audit from file
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-3 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-3">
                <CardTitle className="text-base font-semibold">
                  Results
                </CardTitle>

                <Select value="major" onValueChange={() => {}}>
                  <SelectTrigger
                    size="sm"
                    className="w-auto max-w-[360px] min-w-[200px]"
                  >
                    <SelectValue>Major - Computer Science</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="major">
                      Major - Computer Science
                    </SelectItem>
                    <SelectItem value="minor">Minor - Mathematics</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    Required: {AUDIT_SUMMARY.total_required}
                  </Badge>
                  <Badge variant="outline">
                    Applied: {AUDIT_SUMMARY.total_applied}
                  </Badge>
                  <Badge variant="outline">
                    Remaining: {AUDIT_SUMMARY.total_remaining}
                  </Badge>
                  <Badge variant="outline">
                    Taken: {AUDIT_SUMMARY.total_taken}
                  </Badge>
                </div>

                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm">
                    <FileDownIcon className="size-4" aria-hidden />
                    Download CSV
                  </Button>
                  <Button variant="outline" size="sm">
                    <ListChecksIcon className="size-4" aria-hidden />
                    View requirements
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="min-w-full text-left text-[13px] text-muted-foreground">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-3 py-2 font-medium">Course</th>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 text-right font-medium tabular-nums">
                        Req credits
                      </th>
                      <th className="px-3 py-2 text-center font-medium">
                        Min grade
                      </th>
                      <th className="px-3 py-2 font-medium">
                        <button
                          type="button"
                          onClick={() => {
                            setSort((previous) =>
                              previous === "default"
                                ? "satisfied"
                                : previous === "satisfied"
                                  ? "pending"
                                  : "default"
                            )
                          }}
                          className="inline-flex items-center gap-1 font-medium text-foreground hover:text-foreground/80"
                        >
                          Status
                          <ArrowUpDownIcon className="size-3.5" aria-hidden />
                        </button>
                      </th>
                      <th className="px-3 py-2 font-medium">Used courses</th>
                      <th className="px-3 py-2 text-right font-medium tabular-nums">
                        Applied
                      </th>
                      <th className="px-3 py-2 text-right font-medium tabular-nums">
                        Remaining
                      </th>
                      <th className="px-3 py-2 font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.course_code}
                        className="border-t border-border"
                      >
                        <td className="px-3 py-2 font-medium whitespace-nowrap text-foreground">
                          {row.course_code}
                        </td>
                        <td className="px-3 py-2 text-foreground">
                          {row.course_name}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {row.credits_required}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {row.min_grade}
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            variant={
                              row.status === "Satisfied"
                                ? "outline"
                                : "destructive"
                            }
                            className={cn(
                              row.status === "Satisfied" &&
                                "border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
                            )}
                          >
                            {row.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-[12px]">
                          {row.used_courses}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {row.credits_applied}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {row.credits_remaining}
                        </td>
                        <td className="px-3 py-2 text-[12px]">{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </Page>
    </CoursesShell>
  )
}
