"use client";

import { Info } from "lucide-react";
import type { RegisteredCourse } from "../../types";
import {
  calculateCourseGPA,
  calculateCourseScore,
  calculateMaxPossibleCourseScore,
  formatGPA,
  getGPAColorClass,
  hasCompleteScore,
  scoreToGPA,
} from "../../utils/grade-utils";
import { coursesChart, coursesSurface } from "../../constants/dashboard-theme";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/atoms/tooltip";
import { cn } from "@/utils/utils";

interface CourseGradeDistributionBarProps {
  items: RegisteredCourse["items"];
}

export function CourseGradeDistributionBar({ items }: CourseGradeDistributionBarProps) {
  if (items.length === 0) return null;

  const totalWeight = items.reduce((acc, item) => acc + (item.total_weight_pct || 0), 0) || 100;
  const scale = Math.max(100, totalWeight);

  const scoredItems = items.filter(hasCompleteScore);

  const earnedWeight = scoredItems.reduce((acc, item) => {
    const weight = item.total_weight_pct || 0;
    return acc + weight * (item.obtained_score / item.max_score);
  }, 0);

  const scoredWeight = scoredItems.reduce((acc, item) => acc + (item.total_weight_pct || 0), 0);

  const pendingWeight = items
    .filter((item) => !hasCompleteScore(item))
    .reduce((acc, item) => acc + (item.total_weight_pct || 0), 0);

  const belowMaxWeight = Math.max(0, scoredWeight - earnedWeight);
  const unassignedWeight = Math.max(0, 100 - totalWeight);

  const segments = [
    { label: `Earned ${earnedWeight.toFixed(0)}%`, value: earnedWeight, color: coursesChart.green },
    { label: "Below max", value: belowMaxWeight, color: coursesChart.muted },
    { label: "Pending scores", value: pendingWeight, color: coursesChart.orange },
    { label: "Unassigned weight", value: unassignedWeight, color: coursesChart.blue },
  ].filter((segment) => segment.value > 0.05);

  return (
    <div className="space-y-2">
      <p className="text-[13px] font-medium text-muted-foreground">Grade breakdown</p>
      <div className={cn("flex h-1.5 overflow-hidden rounded-full", coursesSurface.progressTrack)}>
        {segments.map((segment) => (
          <div
            key={segment.label}
            title={segment.label}
            style={{
              width: `${(segment.value / scale) * 100}%`,
              backgroundColor: segment.color,
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-[12px] text-muted-foreground">
        {segments.map((segment) => (
          <span key={segment.label} className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: segment.color }} />
            {segment.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function CourseStatisticsCards({ registeredCourse }: { registeredCourse: RegisteredCourse }) {
  if (registeredCourse.items.length === 0) return null;

  const score = calculateCourseScore(registeredCourse.items);
  const gpa = calculateCourseGPA(registeredCourse.items);
  const maxPossibleGpa = scoreToGPA(calculateMaxPossibleCourseScore(registeredCourse.items));
  const classAverage = registeredCourse.class_average;
  const hasClassAverage = classAverage != null;

  const stats: Array<{ label: string; value: string; tone?: string; tip?: string }> = [
    { label: "Current Score", value: `${score.toFixed(0)}%` },
    ...(hasClassAverage
      ? [
          {
            label: "Class avg",
            value: `${Number(classAverage).toFixed(0)}%`,
            tip: "App peers only",
          },
        ]
      : []),
    { label: "Current GPA", value: formatGPA(gpa), tone: getGPAColorClass(gpa) },
    { label: "Maximum Possible", value: formatGPA(maxPossibleGpa) },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("grid gap-4", hasClassAverage ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}>
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="flex items-center gap-1">
              <p className="text-[12px] text-muted-foreground">{stat.label}</p>
              {stat.tip && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-4 w-4 items-center justify-center rounded text-muted-foreground/70 transition-colors hover:text-muted-foreground"
                      aria-label={`About ${stat.label}`}
                    >
                      <Info className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px] text-center">
                    {stat.tip}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className={cn("mt-0.5 text-base font-semibold leading-none", stat.tone ?? "text-foreground")}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}
