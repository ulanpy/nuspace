"use client";

import { X, GitCompareArrows, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GradeStatistics } from "../types";
import {
  formatGPA,
  formatPercentage,
  getDifficultyColorClass,
  getDifficultyLevel,
} from "../utils/grade-utils";
import { cn } from "@/utils/utils";
import { formatAcademicTerm } from "../utils/term-utils";

const MAX_SELECTIONS = 4;

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
  highlightIndexes?: Set<number>;
  toneClasses?: Array<string | undefined>;
};

const DIFFICULTY_RANK: Record<string, number> = {
  Easy: 0,
  Moderate: 1,
  Hard: 2,
  "Very Hard": 3,
};

const barColors = ["bg-success", "bg-primary", "bg-warning", "bg-destructive/60", "bg-destructive"];

function bestHigherIndexes(values: Array<number | null | undefined>): Set<number> {
  const present = values.filter((value): value is number => value != null);
  if (present.length < 2) return new Set();
  const best = Math.max(...present);
  if (!present.some((value) => value < best)) return new Set();
  return new Set(values.flatMap((value, index) => (value === best ? [index] : [])));
}

function bestLowerIndexes(values: Array<number | null | undefined>): Set<number> {
  const present = values.filter((value): value is number => value != null);
  if (present.length < 2) return new Set();
  const best = Math.min(...present);
  if (!present.some((value) => value > best)) return new Set();
  return new Set(values.flatMap((value, index) => (value === best ? [index] : [])));
}

function chipLabel(item: GradeStatistics) {
  return `${item.course_code} ${item.section} · ${formatAcademicTerm(item.term)}`;
}

function gradePercentiles(stats: GradeStatistics): number[] {
  return [stats.pct_A ?? 0, stats.pct_B ?? 0, stats.pct_C ?? 0, stats.pct_D ?? 0, stats.pct_F ?? 0];
}

const GRADE_LABELS = ["A", "B", "C", "D", "F"];

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
    { key: "course", label: "Course", values: selected.map((s) => s.course_code) },
    { key: "section", label: "Section", values: selected.map((s) => s.section) },
    { key: "term", label: "Term", values: selected.map((s) => s.term) },
    { key: "faculty", label: "Faculty", values: selected.map((s) => s.faculty?.trim() || "—") },
  ];

  const difficulties = selected.map((s) => getDifficultyLevel(s.avg_gpa, s.std_dev));
  const difficultyRanks = difficulties.map((d) => DIFFICULTY_RANK[d] ?? 1);

  const metricRows: MetricRow[] = [
    {
      key: "avg_gpa",
      label: "Avg GPA",
      values: selected.map((s) => formatGPA(s.avg_gpa)),
      highlightIndexes: bestHigherIndexes(selected.map((s) => s.avg_gpa ?? 0)),
    },
    {
      key: "difficulty",
      label: "Difficulty",
      values: difficulties,
      toneClasses: difficulties.map((d) => getDifficultyColorClass(d)),
      highlightIndexes: bestLowerIndexes(difficultyRanks),
    },
    {
      key: "withdrawal",
      label: "Withdrawal",
      values: selected.map((s) =>
        s.pct_W_AW == null ? "Not reported" : formatPercentage(s.pct_W_AW),
      ),
      highlightIndexes: bestLowerIndexes(selected.map((s) => s.pct_W_AW)),
    },
    {
      key: "median",
      label: "Median",
      values: selected.map((s) => formatGPA(s.median_gpa)),
    },
    {
      key: "std",
      label: "Std Dev",
      values: selected.map((s) => (s.std_dev != null ? `±${s.std_dev.toFixed(2)}` : "—")),
    },
    { key: "students", label: "Students", values: selected.map((s) => String(s.grades_count)) },
  ];

  const rows = [...identityRows, ...metricRows];

  return (
    <>
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
          <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 text-[13px]" onClick={onClear}>
            <Trash2 className="h-3.5 w-3.5" />
            Clear all
          </Button>
        </div>

        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 scroll-thin">
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
          <div className="mt-3 hidden overflow-x-auto rounded-xl border border-border sm:block scroll-thin">
            <table className="w-full min-w-[520px] border-collapse text-[13px]">
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
                            highlighted && "rounded-md bg-success/15 font-semibold text-success",
                          )}
                          title={highlighted ? "Better for this metric" : undefined}
                        >
                          {value as string}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showTable && (
          <div className="mt-3 space-y-3 sm:hidden">
            {selected.map((item, index) => (
              <div key={item.id} className="rounded-xl border border-border p-3">
                <p className="text-sm font-semibold">
                  {item.course_code}
                  <span className="ml-1 font-normal text-muted-foreground">{item.section}</span>
                </p>
                <dl className="mt-2 space-y-1.5">
                  {rows.map((row) => {
                    const value = row.values[index];
                    const highlighted = Boolean(row.highlightIndexes?.has(index));
                    return (
                      <div key={row.key} className="flex items-center justify-between gap-3 text-[13px]">
                        <dt className="text-muted-foreground">{row.label}</dt>
                        <dd
                          className={cn(
                            "tabular-nums",
                            row.toneClasses?.[index],
                            highlighted && "rounded-md bg-success/15 px-1.5 py-0.5 font-semibold text-success",
                          )}
                        >
                          {value}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            ))}
          </div>
        )}

        {showTable && (
          <div className="mt-4 rounded-xl border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-xs font-medium text-muted-foreground">Grade distribution</h4>
              <div className="flex items-center gap-3">
                {GRADE_LABELS.map((label, i) => (
                  <span key={label} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <span className={cn("h-2 w-2 rounded-full", barColors[i])} />
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-3 space-y-3">
              {selected.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 truncate text-[13px] font-medium">
                    {item.course_code}
                    <span className="ml-1 font-normal text-muted-foreground">{item.section}</span>
                  </span>
                  <MiniGradeBar pcts={gradePercentiles(item)} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {!showTable && count > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium shadow-lg transition-colors hover:bg-muted"
          >
            <GitCompareArrows className="h-4 w-4 text-muted-foreground" />
            <span>{count} selected — compare</span>
          </button>
        </div>
      )}
    </>
  );
}

function MiniGradeBar({ pcts }: { pcts: number[] }) {
  const total = pcts.reduce((s, v) => s + v, 0);
  if (total <= 0) return <span className="text-muted-foreground">—</span>;

  return (
    <div className="flex h-5 flex-1 overflow-hidden rounded-full bg-muted">
      {pcts.map((pct, i) => {
        if (pct <= 0) return null;
        const width = total > 0 ? (pct / total) * 100 : 0;
        return (
          <div
            key={GRADE_LABELS[i]}
            className={cn(barColors[i])}
            style={{ width: `${width}%` }}
            title={`${GRADE_LABELS[i]}: ${(pct ?? 0).toFixed(1)}%`}
          />
        );
      })}
    </div>
  );
}
