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
  /** Mock weekly study hours by course id — scan signal only. */
  weekHoursByCourseId?: Record<number, number>;
  footer?: ReactNode;
}

export function RegisteredCourseList({
  courses,
  gpaExclusion,
  selectedCourseId,
  onSelectCourse,
  weekHoursByCourseId,
  footer,
}: RegisteredCourseListProps) {
  return (
    <div className={cn("flex flex-col p-3", coursesSurface.cardLg)}>
      <div className="mb-3 flex items-center gap-2 px-0.5">
        <h2 className="text-sm font-semibold">Courses</h2>
        <span className={coursesSurface.badge}>{courses.length}</span>
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
            weekHours={weekHoursByCourseId?.[registeredCourse.id]}
            onSelect={() => onSelectCourse(registeredCourse.id)}
          />
        ))}
      </div>

      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}
