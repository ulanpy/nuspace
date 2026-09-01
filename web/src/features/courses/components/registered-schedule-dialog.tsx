import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { CalendarPlusIcon, DownloadIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { ApiError } from "@/api/client"
import { beginReauthentication } from "@/features/auth/api"
import {
  downloadScheduleIcs,
  scheduleQueryOptions,
  useGoogleScheduleExport,
} from "@/features/courses/api"
import { formatScheduleTime, scheduleDays } from "@/features/courses/schedule"
import { EmptyState, QueryBoundary } from "@/components/query-boundary"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function RegisteredScheduleDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const query = useQuery({ ...scheduleQueryOptions(), enabled: open })
  const google = useGoogleScheduleExport()
  const [downloading, setDownloading] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Weekly timetable</DialogTitle>
          <DialogDescription>
            Your most recently synchronized registrar schedule.
          </DialogDescription>
        </DialogHeader>

        <QueryBoundary
          query={query}
          isEmpty={(value) =>
            value === null ||
            value.schedule.data.every((items) => items.length === 0)
          }
          empty={
            <EmptyState
              title="No timetable available"
              description="Sync your registered courses to load the current registrar schedule."
            />
          }
        >
          {(schedule) =>
            schedule && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    {schedule.term_label ?? "Current term"}
                    {schedule.last_synced_at &&
                      ` · synced ${new Date(schedule.last_synced_at).toLocaleString()}`}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={downloading}
                      onClick={() => {
                        setDownloading(true)
                        void downloadScheduleIcs()
                          .then(() => {
                            toast.success("schedule.ics downloaded")
                          })
                          .catch(() => {
                            toast.error("Could not download the calendar file")
                          })
                          .finally(() => {
                            setDownloading(false)
                          })
                      }}
                    >
                      {downloading ? (
                        <Loader2Icon className="animate-spin" aria-hidden />
                      ) : (
                        <DownloadIcon aria-hidden />
                      )}
                      Download .ics
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={google.isPending}
                      onClick={() => {
                        google.mutate(undefined, {
                          onSuccess: (result) => {
                            if (
                              result.google_errors.includes(
                                "insufficient_google_scope"
                              )
                            ) {
                              toast.warning(
                                "Sign in again to renew Google Calendar permission",
                                {
                                  action: {
                                    label: "Sign in",
                                    onClick: beginReauthentication,
                                  },
                                }
                              )
                            } else if (result.google_errors.length > 0) {
                              toast.warning(
                                "Calendar sync completed with Google warnings"
                              )
                            } else {
                              toast.success(
                                `Synced ${String(result.created)} calendar events`
                              )
                            }
                          },
                          onError: (error) => {
                            if (
                              error instanceof ApiError &&
                              (error.status === 401 || error.status === 403)
                            ) {
                              toast.warning(
                                "Sign in again to renew Google Calendar permission",
                                {
                                  action: {
                                    label: "Sign in",
                                    onClick: beginReauthentication,
                                  },
                                }
                              )
                            } else {
                              toast.error("Could not sync Google Calendar")
                            }
                          },
                        })
                      }}
                    >
                      {google.isPending ? (
                        <Loader2Icon className="animate-spin" aria-hidden />
                      ) : (
                        <CalendarPlusIcon aria-hidden />
                      )}
                      Google Calendar
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {scheduleDays(schedule).map((day) => (
                    <section
                      key={day.label}
                      className="rounded-lg border border-border p-3"
                    >
                      <h3 className="font-medium">{day.label}</h3>
                      {day.items.length === 0 ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          No classes
                        </p>
                      ) : (
                        <ul className="mt-2 space-y-2">
                          {day.items.map((item) => (
                            <li
                              key={`${item.course_code}-${item.label}-${formatScheduleTime(item)}`}
                              className="text-sm"
                            >
                              <p className="font-medium">
                                {formatScheduleTime(item)} · {item.course_code}
                              </p>
                              <p className="text-muted-foreground">
                                {[item.label, item.teacher, item.cab]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  ))}
                </div>
              </div>
            )
          }
        </QueryBoundary>
      </DialogContent>
    </Dialog>
  )
}
