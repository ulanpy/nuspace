import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { DownloadIcon, Loader2Icon, Share2Icon } from "lucide-react"
import { toast } from "sonner"

import {
  templatesQueryOptions,
  useImportCourseTemplate,
  useShareCourseTemplate,
} from "@/lib/courses"
import type { CourseTemplate, RegisteredCourse } from "@/lib/courses"
import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from "@/lib/pages/constants"
import { useCurrentUser } from "@/hooks/use-session"
import { apiErrorMessage } from "@/api/errors"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { TablePagination } from "@/components/shared/table/pagination"
import { QueryBoundary } from "@/components/shared/query/boundary"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function CourseTemplateTools({
  registered,
}: {
  registered: RegisteredCourse
}) {
  const user = useCurrentUser()
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  // Local, not URL: this list lives in a dialog inside a course card, and
  // `course-card.tsx` is rendered by both `/courses` and `/courses/schedule`.
  // A `size` param on either route would be one page-size control fighting the
  // other for a single key, describing a dialog nobody has opened yet.
  const [size, setSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [importing, setImporting] = useState<CourseTemplate | null>(null)

  const query = useQuery({
    ...templatesQueryOptions(registered.course.id, page, size),
    enabled: open,
  })
  const share = useShareCourseTemplate()
  const importTemplate = useImportCourseTemplate()

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        disabled={registered.items.length === 0 || share.isPending}
        onClick={() => {
          share.mutate(
            { course: registered, studentSub: user.sub },
            {
              onSuccess: () => {
                toast.success("Assignment setup shared")
              },
              onError: (error) => {
                toast.error(
                  apiErrorMessage(error, "Could not share this setup.")
                )
              },
            }
          )
        }}
      >
        {share.isPending ? (
          <Loader2Icon className="animate-spin" aria-hidden />
        ) : (
          <Share2Icon aria-hidden />
        )}
        Share setup
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setPage(1)
          setOpen(true)
        }}
      >
        <DownloadIcon aria-hidden />
        Import setup
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Import an assignment setup</DialogTitle>
            <DialogDescription>
              Copy assignment names and weights shared for{" "}
              {registered.course.course_code}. Your scores are never shared.
            </DialogDescription>
          </DialogHeader>

          <QueryBoundary query={query}>
            {(data) => {
              const templates = data.templates.filter(
                (entry) => entry.template.student_sub !== user.sub
              )
              return (
                <div className="space-y-3">
                  {templates.length === 0 && (
                    <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      No classmate has shared a setup on this page yet.
                    </p>
                  )}
                  {templates.map((template) => (
                    <article
                      key={template.template.id}
                      className="space-y-3 rounded-lg border border-border p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            {template.student.name} {template.student.surname}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {template.template_items.length} assignments ·{" "}
                            {template.template_items
                              .reduce(
                                (sum, item) =>
                                  sum + (item.total_weight_pct ?? 0),
                                0
                              )
                              .toFixed(0)}
                            % weight
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            setImporting(template)
                          }}
                        >
                          Import
                        </Button>
                      </div>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {template.template_items.slice(0, 5).map((item) => (
                          <li
                            key={item.id}
                            className="flex justify-between gap-3"
                          >
                            <span className="truncate">{item.item_name}</span>
                            <span>{item.total_weight_pct ?? 0}%</span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                  <TablePagination
                    page={page}
                    pageSize={size}
                    pageSizeOptions={PAGE_SIZES}
                    onPageSizeChange={(next) => {
                      // Back to page 1: a size change re-slices the result, and
                      // page 3 of the old size is usually past the new last page.
                      setSize(next)
                      setPage(1)
                    }}
                    totalPages={data.total_pages}
                    hasNext={page < data.total_pages}
                    // `ListTemplateDTO` carries `total_pages` and nothing else —
                    // no `total`, no `size` — so there is no range to describe.
                    summary={null}
                    isFetching={query.isFetching}
                    onPageChange={setPage}
                  />
                </div>
              )
            }}
          </QueryBoundary>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={importing !== null}
        onOpenChange={(next) => {
          if (!next && !importTemplate.isPending) setImporting(null)
        }}
        title="Replace this course's assignments?"
        description="Importing replaces every assignment currently entered for this course. Scores are not imported."
        confirmLabel="Replace assignments"
        isPending={importTemplate.isPending}
        onConfirm={() => {
          if (!importing) return
          importTemplate.mutate(
            {
              templateId: importing.template.id,
              studentCourseId: registered.id,
            },
            {
              onSuccess: () => {
                setImporting(null)
                setOpen(false)
                toast.success("Assignment setup imported")
              },
              onError: (error) => {
                toast.error(
                  apiErrorMessage(error, "Could not import this setup.")
                )
              },
            }
          )
        }}
      />
    </>
  )
}
