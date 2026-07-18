"use client";

import Link from "@/router/link";
import { BookOpen, ExternalLink, LifeBuoy } from "lucide-react";
import type { RegisteredCourse, ScheduleResponse } from "../../types";
import { coursesSurface, getDepartmentAccent } from "../../constants/dashboard-theme";
import { getAssignmentProgress, getCourseSummaryRows } from "../../utils/course-summary-utils";
import type { WeekDayHours } from "../../utils/mock-study-hours";
import { StudyHoursCard } from "./study-hours-card";
import { cn } from "@/utils/utils";

interface CoursesContextPanelProps {
  selectedCourse: RegisteredCourse | null;
  schedule: ScheduleResponse | null;
  isExcludedFromGpa: boolean;
  studyHours?: { days: WeekDayHours[]; target: number } | null;
  onAdjustStudyHours?: (dayIndex: number, delta: number) => void;
}

export function CoursesContextPanel({
  selectedCourse,
  schedule,
  isExcludedFromGpa,
  studyHours,
  onAdjustStudyHours,
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

  const accent = getDepartmentAccent(selectedCourse.course.department);
  const progress = getAssignmentProgress(selectedCourse.items);
  const rows = getCourseSummaryRows(selectedCourse, schedule);

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

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-muted-foreground">Weighted progress</span>
            <span className="font-medium">{progress.percent}%</span>
          </div>
          <div className={cn("h-1.5 overflow-hidden rounded-full", coursesSurface.progressTrack)}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress.percent}%`, backgroundColor: accent.color }}
            />
          </div>
          <p className="text-[12px] text-muted-foreground">{progress.label}</p>
        </div>
      </div>

      {studyHours && onAdjustStudyHours && selectedCourse && (
        <StudyHoursCard
          courseId={selectedCourse.id}
          days={studyHours.days}
          target={studyHours.target}
          onAdjustDay={onAdjustStudyHours}
        />
      )}

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
        <Link href="/courses?tab=live-gpa" className="inline-flex items-center gap-1 text-primary hover:underline">
          View Guide
          <ExternalLink className="h-3 w-3" />
        </Link>
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
