"use client";

import { ClipboardList } from "lucide-react";
import type { BaseCourseItem, RegisteredCourse } from "../../types";
import { coursesSurface, getDepartmentAccent } from "../../constants/dashboard-theme";
import {
  calculateCourseGPA,
  calculateCourseScore,
  formatGPA,
  getGPAColorClass,
  scoreToGrade,
} from "../../utils/grade-utils";
import { CourseDetailPanel } from "./course-row";
import { cn } from "@/utils/utils";

interface CourseWorkspaceProps {
  course: RegisteredCourse | null;
  isExcludedFromGpa: boolean;
  onAddItem: () => void;
  onDeleteItem: (item: BaseCourseItem) => void;
  onEditItem: (item: BaseCourseItem) => void;
  onShareTemplate: () => void;
  onOpenTemplates: () => void;
  onToggleGpaExclusion: () => void;
}

export function CourseWorkspace({
  course,
  isExcludedFromGpa,
  onAddItem,
  onDeleteItem,
  onEditItem,
  onShareTemplate,
  onOpenTemplates,
  onToggleGpaExclusion,
}: CourseWorkspaceProps) {
  if (!course) {
    return (
      <div className={cn("flex min-h-[280px] flex-col items-center justify-center p-8 text-center", coursesSurface.cardLg)}>
        <ClipboardList className="mb-3 h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm font-medium">Select a course</p>
        <p className="mt-1 max-w-xs text-[13px] text-muted-foreground">
          Pick a course on the left to manage assignments and grades.
        </p>
      </div>
    );
  }

  const accent = getDepartmentAccent(course.course.department);
  const gpa = calculateCourseGPA(course.items);
  const grade = scoreToGrade(calculateCourseScore(course.items));

  return (
    <div className={cn("p-4 sm:p-5", coursesSurface.cardLg)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold"
              style={{ backgroundColor: accent.bg, color: accent.color }}
            >
              {(course.course.course_code || "?").slice(0, 2)}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold leading-tight">{course.course.course_code}</h2>
              {course.course.title && (
                <p className="truncate text-[13px] text-muted-foreground">{course.course.title}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Grade</p>
            <p className={cn("text-base font-semibold", getGPAColorClass(gpa))}>{grade}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">GPA</p>
            <p className="text-base font-semibold">{formatGPA(gpa)}</p>
          </div>
        </div>
      </div>

      <CourseDetailPanel
        registeredCourse={course}
        isExcludedFromGpa={isExcludedFromGpa}
        onAddItem={onAddItem}
        onDeleteItem={onDeleteItem}
        onEditItem={onEditItem}
        onShareTemplate={onShareTemplate}
        onOpenTemplates={onOpenTemplates}
        onToggleGpaExclusion={onToggleGpaExclusion}
      />
    </div>
  );
}
