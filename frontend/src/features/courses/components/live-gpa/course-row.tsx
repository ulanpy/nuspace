"use client";

import type { ReactNode } from "react";
import { ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BaseCourseItem, RegisteredCourse } from "../../types";
import { hasCompleteScore } from "../../utils/grade-utils";
import { coursesSurface, getDepartmentAccent } from "../../constants/dashboard-theme";
import { CourseGradeDistributionBar, CourseStatisticsCards } from "./course-grade-utils";
import { cn } from "@/utils/utils";

interface CourseDetailPanelProps {
  registeredCourse: RegisteredCourse;
  isExcludedFromGpa: boolean;
  onAddItem: () => void;
  onDeleteItem: (item: BaseCourseItem) => void;
  onEditItem: (item: BaseCourseItem) => void;
  onShareTemplate: () => void;
  onOpenTemplates: () => void;
  onToggleGpaExclusion: () => void;
}

export function CourseDetailPanel({
  registeredCourse,
  isExcludedFromGpa,
  onAddItem,
  onDeleteItem,
  onEditItem,
  onShareTemplate,
  onOpenTemplates,
  onToggleGpaExclusion,
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
                  <th className="pb-2 pr-3 font-medium">Weight</th>
                  <th className="pb-2 pr-3 font-medium">Score</th>
                  <th className="pb-2 pr-3 font-medium">Contribution</th>
                  <th className="pb-2 pr-3 font-medium">Status</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const included = hasCompleteScore(item);
                  const weight = item.total_weight_pct || 0;
                  const obtained = item.obtained_score ?? 0;
                  const max = item.max_score ?? 1;
                  const contribution = included ? ((obtained / max) * weight).toFixed(1) : "—";
                  const score = included ? `${((obtained / max) * 100).toFixed(0)}%` : "—";
                  return (
                    <tr key={item.id}>
                      <td className="py-2 pr-3 font-medium text-foreground">{item.item_name}</td>
                      <td className="py-2 pr-3">{weight.toFixed(0)}%</td>
                      <td className="py-2 pr-3">{score}</td>
                      <td className="py-2 pr-3">{included ? `${contribution}%` : "—"}</td>
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

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <ActionButton variant="primary" onClick={onAddItem}>
              Add Assignment
            </ActionButton>
            <ActionButton variant="secondary" onClick={onOpenTemplates}>
              Browse Templates
            </ActionButton>
            <ActionButton variant="secondary" onClick={onShareTemplate}>
              Share Template
            </ActionButton>
            <ActionButton variant="secondary" onClick={onToggleGpaExclusion}>
              {isExcludedFromGpa ? "Include in overall GPA" : "Exclude from overall GPA"}
            </ActionButton>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 py-2">
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", coursesSurface.iconPrimary)}>
              <ClipboardList className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium">No assignments yet</p>
              <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                Add assignments manually or import a peer template to start tracking your grade.
              </p>
            </div>
            <ActionButton variant="primary" onClick={onAddItem}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Assignment
            </ActionButton>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ActionButton variant="secondary" onClick={onOpenTemplates}>
              Browse Templates
            </ActionButton>
            <ActionButton variant="secondary" onClick={onShareTemplate}>
              Share Template
            </ActionButton>
            <ActionButton variant="secondary" onClick={onToggleGpaExclusion}>
              {isExcludedFromGpa ? "Include in overall GPA" : "Exclude from overall GPA"}
            </ActionButton>
          </div>
        </>
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
  const accent = getDepartmentAccent(course.department);
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
          {course.title || course.department || "Course"}
        </p>
      </div>
    </button>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant = "secondary",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
}) {
  if (variant === "primary") {
    return (
      <Button size="sm" disabled={disabled} onClick={onClick} className="h-8 rounded-lg px-3 text-[13px] font-medium">
        {children}
      </Button>
    );
  }

  if (variant === "danger") {
    return (
      <Button
        size="sm"
        variant="ghost"
        disabled={disabled}
        onClick={onClick}
        className="h-8 rounded-lg px-3 text-[13px] font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300"
      >
        {children}
      </Button>
    );
  }

  return (
    <Button size="sm" variant="outline" disabled={disabled} onClick={onClick} className="h-8 rounded-lg px-3 text-[13px] font-medium">
      {children}
    </Button>
  );
}
