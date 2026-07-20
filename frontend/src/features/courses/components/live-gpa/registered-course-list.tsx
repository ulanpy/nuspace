"use client";

import type { ReactNode } from "react";
import type { RegisteredCourse } from "../../types";
import type { LiveGpaViewModel } from "../../hooks/use-live-gpa-view-model";
import { coursesSurface } from "../../constants/dashboard-theme";
import { CourseRow } from "./course-row";
import { cn } from "@/utils/utils";

type RegisteredCourseWithMeta = RegisteredCourse & { isExcludedFromGpa?: boolean };

interface RegisteredCourseListProps {
  courses: RegisteredCourseWithMeta[];
  gpaExclusion: LiveGpaViewModel["gpaExclusion"];
  selectedCourseId: number | null;
  onSelectCourse: (courseId: number) => void;
  footer?: ReactNode;
}

export function RegisteredCourseList({
  courses,
  gpaExclusion,
  selectedCourseId,
  onSelectCourse,
  footer,
}: RegisteredCourseListProps) {
  const excludedCount = courses.filter(
    (c) => c.isExcludedFromGpa ?? gpaExclusion.isExcluded(c.id),
  ).length;

  return (
    <div className={cn("flex flex-col p-3", coursesSurface.cardLg)}>
      <div className="mb-3 flex items-center gap-2 px-0.5">
        <h2 className="text-sm font-semibold">Courses</h2>
        <span className={coursesSurface.badge}>{courses.length}</span>
        {excludedCount > 0 && (
          <span className="ml-auto text-[11px] text-muted-foreground">
            {excludedCount} excluded from GPA
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-1">
        {courses.map((registeredCourse) => (
          <CourseRow
            key={registeredCourse.id}
            registeredCourse={registeredCourse}
            isSelected={selectedCourseId === registeredCourse.id}
            isExcludedFromGpa={
              registeredCourse.isExcludedFromGpa ?? gpaExclusion.isExcluded(registeredCourse.id)
            }
            onSelect={() => onSelectCourse(registeredCourse.id)}
          />
        ))}
      </div>

      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}
