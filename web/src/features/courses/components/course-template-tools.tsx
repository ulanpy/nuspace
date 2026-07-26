import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { DownloadIcon, Loader2Icon, Share2Icon } from "lucide-react"
import { toast } from "sonner"

import {
  templatesQueryOptions,
  useImportCourseTemplate,
  useShareCourseTemplate,
} from "@/features/courses/api"
import type { CourseTemplate, RegisteredCourse } from "@/features/courses/types"
import { useCurrentUser } from "@/features/auth/use-session"
import { apiErrorMessage } from "@/api/errors"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { QueryBoundary } from "@/components/query-boundary"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const PAGE_SIZE = 10

export function CourseTemplateTools({
  registered,
}: {
  registered: RegisteredCourse
}) {
  const user = useCurrentUser()
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [importing, setImporting] = useState<CourseTemplate | null>(null)

  const query = useQuery({
    ...templatesQueryOptions(registered.course.id, page, PAGE_SIZE),
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
                  <div className="flex justify-between">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page === 1}
                      onClick={() => {
                        setPage((value) => Math.max(1, value - 1))
                      }}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page >= data.total_pages}
                      onClick={() => {
                        setPage((value) => value + 1)
                      }}
                    >
                      Next
                    </Button>
                  </div>
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
