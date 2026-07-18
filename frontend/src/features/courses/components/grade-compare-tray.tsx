"use client";

import { X } from "lucide-react";
import { Button } from "@/components/atoms/button";
import type { GradeStatistics } from "../types";
import {
  formatGPA,
  formatPercentage,
  getDifficultyColorClass,
  getDifficultyLevel,
} from "../utils/grade-utils";
import { cn } from "@/utils/utils";

const MAX_SELECTIONS = 8;

interface GradeCompareTrayProps {
  selected: GradeStatistics[];
  onRemove: (id: number) => void;
  onClear: () => void;
  maxSelections?: number;
}

type MetricRow = {
  key: string;
  label: string;
  values: string[];
  /** Column indexes that are semantically best for this metric (ties included). */
  highlightIndexes?: Set<number>;
  toneClasses?: Array<string | undefined>;
};

const DIFFICULTY_RANK: Record<string, number> = {
  Easy: 0,
  Moderate: 1,
  Hard: 2,
  "Very Hard": 3,
};

/** Indexes tied for the maximum value. */
function bestHigherIndexes(values: number[]): Set<number> {
  if (values.length < 2) return new Set();
  const best = Math.max(...values);
  // Only highlight when there is a real winner vs at least one worse value.
  if (!values.some((v) => v < best)) return new Set();
  return new Set(values.flatMap((v, i) => (v === best ? [i] : [])));
}

/** Indexes tied for the minimum value. */
function bestLowerIndexes(values: number[]): Set<number> {
  if (values.length < 2) return new Set();
  const best = Math.min(...values);
  if (!values.some((v) => v > best)) return new Set();
  return new Set(values.flatMap((v, i) => (v === best ? [i] : [])));
}

function chipLabel(item: GradeStatistics) {
  return `${item.course_code} ${item.section} · ${item.term}`;
}

export function GradeCompareTray({
  selected,
  onRemove,
  onClear,
  maxSelections = MAX_SELECTIONS,
}: GradeCompareTrayProps) {
  if (selected.length === 0) return null;

  const count = selected.length;
  const showTable = count >= 2;

  const identityRows: MetricRow[] = [
    {
      key: "course",
      label: "Course",
      values: selected.map((s) => s.course_code),
    },
    {
      key: "section",
      label: "Section",
      values: selected.map((s) => s.section),
    },
    {
      key: "term",
      label: "Term",
      values: selected.map((s) => s.term),
    },
    {
      key: "faculty",
      label: "Faculty",
      values: selected.map((s) => s.faculty?.trim() || "—"),
    },
  ];

  const difficulties = selected.map((s) => getDifficultyLevel(s.avg_gpa, s.std_dev));
  const difficultyRanks = difficulties.map((d) => DIFFICULTY_RANK[d] ?? 1);

  const metricRows: MetricRow[] = [
    {
      key: "students",
      label: "Students",
      values: selected.map((s) => String(s.grades_count)),
    },
    {
      key: "avg_gpa",
      label: "Avg GPA",
      values: selected.map((s) => formatGPA(s.avg_gpa)),
      highlightIndexes: bestHigherIndexes(selected.map((s) => s.avg_gpa)),
    },
    {
      key: "median",
      label: "Median",
      values: selected.map((s) => formatGPA(s.median_gpa)),
      highlightIndexes: bestHigherIndexes(selected.map((s) => s.median_gpa)),
    },
    {
      key: "std",
      label: "Std Dev",
      values: selected.map((s) => `±${s.std_dev.toFixed(2)}`),
      // Lower variance = more predictable outcomes.
      highlightIndexes: bestLowerIndexes(selected.map((s) => s.std_dev)),
    },
    {
      key: "withdrawal",
      label: "Withdrawal",
      values: selected.map((s) => formatPercentage(s.pct_W_AW)),
      highlightIndexes: bestLowerIndexes(selected.map((s) => s.pct_W_AW)),
    },
    {
      key: "difficulty",
      label: "Difficulty",
      values: difficulties,
      toneClasses: difficulties.map((d) => getDifficultyColorClass(d)),
      // Easier is better for section shopping.
      highlightIndexes: bestLowerIndexes(difficultyRanks),
    },
    {
      key: "pct_A",
      label: "A %",
      values: selected.map((s) => formatPercentage(s.pct_A)),
      highlightIndexes: bestHigherIndexes(selected.map((s) => s.pct_A)),
    },
    {
      key: "pct_B",
      label: "B %",
      values: selected.map((s) => formatPercentage(s.pct_B)),
    },
    {
      key: "pct_C",
      label: "C %",
      values: selected.map((s) => formatPercentage(s.pct_C)),
    },
    {
      key: "pct_D",
      label: "D %",
      values: selected.map((s) => formatPercentage(s.pct_D)),
      highlightIndexes: bestLowerIndexes(selected.map((s) => s.pct_D)),
    },
    {
      key: "pct_F",
      label: "F %",
      values: selected.map((s) => formatPercentage(s.pct_F)),
      highlightIndexes: bestLowerIndexes(selected.map((s) => s.pct_F)),
    },
  ];

  const rows = [...identityRows, ...metricRows];

  return (
    <div
      className={cn(
        "sticky top-0 z-20 mb-4 border-b border-border bg-background/95 pb-3 pt-1 backdrop-blur supports-[backdrop-filter]:bg-background/90",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="text-sm font-medium">
            Compare{" "}
            <span className="tabular-nums text-muted-foreground">
              {count}/{maxSelections}
            </span>
          </p>
          {count === 1 && (
            <span className="text-[13px] text-muted-foreground">Select one more to compare</span>
          )}
        </div>
        <Button type="button" size="sm" variant="ghost" className="h-8 text-[13px]" onClick={onClear}>
          Clear all
        </Button>
      </div>

      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {selected.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onRemove(item.id)}
            className="inline-flex max-w-[220px] shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-left text-[12px] transition-colors hover:bg-muted"
            title="Remove from compare"
          >
            <span className="min-w-0 truncate font-medium">{chipLabel(item)}</span>
            {item.faculty?.trim() && (
              <span className="min-w-0 truncate text-muted-foreground">{item.faculty}</span>
            )}
            <X className="h-3 w-3 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>

      {showTable && (
        <div className="mt-3 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[520px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="sticky left-0 z-10 bg-muted/40 px-3 py-2 font-medium text-muted-foreground">
                  Metric
                </th>
                {selected.map((item) => (
                  <th key={item.id} className="px-3 py-2 font-semibold whitespace-nowrap">
                    {item.course_code}
                    <span className="ml-1 font-normal text-muted-foreground">{item.section}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-border last:border-0">
                  <th className="sticky left-0 z-10 bg-background px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                    {row.label}
                  </th>
                  {row.values.map((value, index) => {
                    const highlighted = Boolean(row.highlightIndexes?.has(index));
                    return (
                      <td
                        key={`${row.key}-${selected[index].id}`}
                        className={cn(
                          "px-3 py-2 tabular-nums",
                          row.toneClasses?.[index],
                          highlighted &&
                            "rounded-md bg-green-500/15 font-semibold text-green-700 dark:text-green-400",
                        )}
                        title={highlighted ? "Better for this metric" : undefined}
                      >
                        {value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
