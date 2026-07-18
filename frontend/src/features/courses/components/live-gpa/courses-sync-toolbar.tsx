"use client";

import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { SynchronizeCoursesControl } from "../synchronize-courses-control";
import type { LiveGpaViewModel } from "../../hooks/use-live-gpa-view-model";
import GoogleCalendarIcon from "@/assets/svg/google_calendar_icon.svg";
import { cn } from "@/utils/utils";

interface CoursesSyncToolbarProps {
  viewModel: Pick<LiveGpaViewModel, "syncCourses" | "syncCoursesFromPdf" | "schedule">;
  userEmail: string;
  onImportCalendar: () => void;
  isExporting: boolean;
  /** Footer inside the courses picker card. */
  embedded?: boolean;
  /** Calendar export is available only after a schedule has been imported. */
  showCalendar?: boolean;
  /** Render only the centered sync control for an empty state. */
  plain?: boolean;
}

export function CoursesSyncToolbar({
  viewModel,
  userEmail,
  onImportCalendar,
  isExporting,
  embedded = false,
  showCalendar = true,
  plain = false,
}: CoursesSyncToolbarProps) {
  const lastSynced = viewModel.schedule.lastSyncedText;

  if (embedded) {
    return (
      <div className="space-y-2 border-t border-border pt-3">
        <div className="flex items-center gap-2">
          <SynchronizeCoursesControl
            compact
            onSync={viewModel.syncCourses}
            onSyncPdf={viewModel.syncCoursesFromPdf}
            userEmail={userEmail}
          />
          {showCalendar && (
            <Button
              size="sm"
              variant="outline"
              className="h- min-w-0 flex-1 gap-1.5 rounded-lg px-2 text-[12px] font-medium"
              onClick={onImportCalendar}
              disabled={isExporting}
              title="Import to Google Calendar"
            >
              <img
                src={
                  typeof GoogleCalendarIcon === "string"
                    ? GoogleCalendarIcon
                    : (GoogleCalendarIcon as { src: string }).src
                }
                alt=""
                className="h-3.5 w-3.5 shrink-0"
              />
              <span className="truncate">{isExporting ? "…" : "Calendar"}</span>
            </Button>
          )}
        </div>
        {lastSynced && (
          <div className="flex items-center gap-1.5 px-0.5 text-[11px] text-muted-foreground">
            <CheckCircle2 className="h-3 w-3 shrink-0 text-green-600 dark:text-green-400" />
            <span className="truncate">Synced {lastSynced}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        plain
          ? "flex items-center justify-center py-2"
          : "flex h-12 items-center justify-between gap-3 rounded-[14px] border border-border bg-card px-3",
      )}
    >
      <div className="flex min-w-5 items-center gap-3">
        <SynchronizeCoursesControl
          compact
          onSync={viewModel.syncCourses}
          onSyncPdf={viewModel.syncCoursesFromPdf}
          userEmail={userEmail}
        />
        {lastSynced && (
          <>
            <div className="hidden h-4 w-px bg-border sm:block" />
            <div className="hidden min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground sm:flex">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
              <span className="truncate">
                Last synced <span className="text-foreground">{lastSynced}</span>
              </span>
            </div>
          </>
        )}
      </div>

      {showCalendar && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 shrink-0 gap-1.5 rounded-lg px-3 text-[13px] font-medium"
          onClick={onImportCalendar}
          disabled={isExporting}
        >
          <img
            src={
              typeof GoogleCalendarIcon === "string"
                ? GoogleCalendarIcon
                : (GoogleCalendarIcon as { src: string }).src
            }
            alt=""
            className="h-3.5 w-3.5"
          />
          <span className="hidden md:inline">{isExporting ? "Importing…" : "Import to Google Calendar"}</span>
          <span className="md:hidden">{isExporting ? "…" : "Calendar"}</span>
        </Button>
      )}
    </div>
  );
}
