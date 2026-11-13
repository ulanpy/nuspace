"use client";

import { ClipboardList, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BaseCourseItem, RegisteredCourse } from "../../types";
import {
  formatItemContribution,
  formatItemScorePercent,
  formatItemWeight,
  formatWeightPercent,
  hasCompleteScore,
} from "../../utils/grade-utils";
import { coursesSurface, getDepartmentAccent } from "../../constants/dashboard-theme";
import { CourseGradeDistributionBar, CourseStatisticsCards } from "./course-grade-utils";
import { cn } from "@/utils/utils";

interface CourseDetailPanelProps {
  registeredCourse: RegisteredCourse;
  onDeleteItem: (item: BaseCourseItem) => void;
  onEditItem: (item: BaseCourseItem) => void;
}

export function CourseDetailPanel({
  registeredCourse,
  onDeleteItem,
  onEditItem,
}: CourseDetailPanelProps) {
  const { items } = registeredCourse;
  const hasItems = items.length > 0;

  return (
    <div className="space-y-4">
      {hasItems ? (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[13px] text-muted-foreground">
              <thead>
                <tr>
                  <th className="pb-2 pr-3 font-medium">Assignment</th>
                  <th className="pb-2 pr-3 text-right font-medium tabular-nums">Weight</th>
                  <th className="pb-2 pr-3 text-right font-medium tabular-nums">Score</th>
                  <th className="pb-2 pr-3 text-right font-medium tabular-nums">Contribution</th>
                  <th className="pb-2 pr-3 font-medium">Status</th>
                  <th className="pb-2 w-16" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const included = hasCompleteScore(item);
                  const weight = item.total_weight_pct;
                  const obtained = item.obtained_score ?? 0;
                  const max = item.max_score ?? 0;

                  return (
                    <tr key={item.id}>
                      <td className="py-2 pr-3 font-medium text-foreground">{item.item_name}</td>
                      <td className="py-2 pr-3 text-right tabular-nums whitespace-nowrap">
                        {formatItemWeight(weight)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums whitespace-nowrap">
                        {included ? formatItemScorePercent(obtained, max) : "—"}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums whitespace-nowrap">
                        {included ? formatItemContribution(obtained, max, weight) : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={cn(
                            "text-[12px] font-medium",
                            included ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400",
                          )}
                        >
                          {included ? "Completed" : "Pending"}
                        </span>
                      </td>
                      <td className="py-2">
                        <div className="flex justify-end gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditItem(item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-400"
                            onClick={() => onDeleteItem(item)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <CourseGradeDistributionBar items={items} />
          <CourseStatisticsCards registeredCourse={registeredCourse} />
        </>
      ) : (
        <div className="flex items-center gap-3 py-2">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", coursesSurface.iconPrimary)}>
            <ClipboardList className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium">No assignments yet</p>
            <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
              Use the controls in Course summary to add assignments or manage grading setup.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

interface CourseRowProps {
  registeredCourse: RegisteredCourse;
  isSelected: boolean;
  isExcludedFromGpa: boolean;
  onSelect: () => void;
}

/** Left-rail course picker: identity + selection only. */
export function CourseRow({
  registeredCourse,
  isSelected,
  isExcludedFromGpa,
  onSelect,
}: CourseRowProps) {
  const { course, items } = registeredCourse;
  const accent = getDepartmentAccent(course.school);
  const pendingCount = items.filter((item) => !hasCompleteScore(item)).length;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={cn(
        "relative flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors",
        isSelected ? coursesSurface.rowSelected : cn(coursesSurface.card, "hover:bg-muted/40"),
      )}
      style={{ borderLeft: isSelected ? `3px solid ${accent.color}` : "3px solid transparent" }}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"
        style={{ backgroundColor: accent.bg, color: accent.color }}
      >
        {(course.course_code || "?").slice(0, 2)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-semibold leading-none">{course.course_code}</span>
          {pendingCount > 0 && (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500"
              title={`${pendingCount} pending`}
              aria-label={`${pendingCount} pending assignments`}
            />
          )}
          {isExcludedFromGpa && (
            <span className="shrink-0 text-[10px] font-medium text-muted-foreground">Excluded</span>
          )}
        </div>
        <p className="mt-1 truncate text-[12px] leading-none text-muted-foreground">
          {course.title || course.school || "Course"}
        </p>
      </div>
    </button>
  );
}
