"use client";

import { BookOpen, LifeBuoy } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { RegisteredCourse, ScheduleResponse } from "../../types";
import { coursesChart, coursesSurface } from "../../constants/dashboard-theme";
import { getCourseSummaryRows, getEarnedGradeSummary } from "../../utils/course-summary-utils";
import { CourseControls } from "./course-controls";
import { cn } from "@/utils/utils";

interface CoursesContextPanelProps {
  selectedCourse: RegisteredCourse | null;
  schedule: ScheduleResponse | null;
  isExcludedFromGpa: boolean;
  onToggleGpaExclusion?: () => void;
  onAddItem?: () => void;
  onOpenTemplates?: () => void;
  onShareTemplate?: () => void;
}

export function CoursesContextPanel({
  selectedCourse,
  schedule,
  isExcludedFromGpa,
  onToggleGpaExclusion,
  onAddItem,
  onOpenTemplates,
  onShareTemplate,
}: CoursesContextPanelProps) {
  if (!selectedCourse) {
    return (
      <div className="space-y-4">
        <div className={cn("p-5 text-center", coursesSurface.cardMd)}>
          <div className={cn("mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl", coursesSurface.iconPrimary)}>
            <BookOpen className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium">Course summary</p>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            Context for the selected course — term, professor, and progress.
          </p>
        </div>
        <CoursesHelpCard />
      </div>
    );
  }

  const earned = getEarnedGradeSummary(selectedCourse.items);
  const rows = getCourseSummaryRows(selectedCourse, schedule);
  const gpaToggleId = `course-gpa-toggle-${selectedCourse.id}`;

  return (
    <div className="space-y-4">
      <div className={cn("p-4", coursesSurface.cardMd)}>
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Course summary
          </p>
          {isExcludedFromGpa && (
            <span className="text-[11px] font-medium text-muted-foreground">Excluded from GPA</span>
          )}
        </div>

        <dl className="mt-3 space-y-2.5">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-3">
              <dt className="text-[13px] text-muted-foreground">{row.label}</dt>
              <dd className="max-w-[58%] text-right text-[13px] font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>

        {onToggleGpaExclusion && (
          <div className="mt-3 flex items-center justify-between gap-3">
            <Label htmlFor={gpaToggleId} className="text-[13px] font-normal text-muted-foreground">
              Include in overall GPA
            </Label>
            <Switch
              id={gpaToggleId}
              size="sm"
              checked={!isExcludedFromGpa}
              onCheckedChange={(included) => {
                if (included === isExcludedFromGpa) {
                  onToggleGpaExclusion();
                }
              }}
              aria-label="Include course in overall GPA"
            />
          </div>
        )}

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-muted-foreground">Earned grade</span>
            <span className="font-medium tabular-nums text-green-600 dark:text-green-400">{earned.earnedLabel}</span>
          </div>
          <div className={cn("h-1.5 overflow-hidden rounded-full", coursesSurface.progressTrack)}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${earned.barPercent}%`, backgroundColor: coursesChart.green }}
            />
          </div>
        </div>

        {onAddItem && onOpenTemplates && onShareTemplate && (
          <div className="mt-4 space-y-2 border-t border-border pt-4">
            <CourseControls
              onAddItem={onAddItem}
              onOpenTemplates={onOpenTemplates}
              onShareTemplate={onShareTemplate}
            />
          </div>
        )}
      </div>

      <CoursesHelpCard />
    </div>
  );
}

export function CoursesHelpCard() {
  return (
    <div className={cn("p-4", coursesSurface.cardMd)}>
      <div className="mb-2 flex items-center gap-2">
        <LifeBuoy className="h-4 w-4 text-muted-foreground" />
        <p className="text-[13px] font-medium">Need help?</p>
      </div>
      <div className="flex flex-col gap-2 text-[13px]">
        <a
          href="https://t.me/kamikadze24"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-muted-foreground hover:underline"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}
