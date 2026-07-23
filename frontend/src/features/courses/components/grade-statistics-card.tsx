"use client";

import { Card, CardContent, CardHeader } from "@/components/atoms/card";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import type { GradeStatistics } from "../types";
import {
  formatGPA,
  formatPercentage,
  getGradeDistribution,
  getGPAColorClass,
  getDifficultyLevel,
  getDifficultyColorClass,
} from "../utils/grade-utils";
import { GradeDistributionChart } from "./grade-distribution-chart";
import {
  Users,
  TrendingUp,
  PieChart,
  EyeOff,
  Check,
  GitCompareArrows,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/utils/utils";

interface GradeStatisticsCardProps {
  statistics: GradeStatistics;
  showChart?: boolean;
  onToggleSelect?: (statistics: GradeStatistics) => void;
  isSelected?: boolean;
  disableAdd?: boolean;
}

const barColors = [
  "bg-success",
  "bg-primary",
  "bg-warning",
  "bg-destructive/60",
  "bg-destructive",
];

export function GradeStatisticsCard({
  statistics,
  showChart = true,
  onToggleSelect,
  isSelected = false,
  disableAdd = false,
}: GradeStatisticsCardProps) {
  const [showPieChart, setShowPieChart] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const gradeDistribution = getGradeDistribution(statistics);
  const difficulty = getDifficultyLevel(statistics.avg_gpa, statistics.std_dev);
  const selectDisabled = Boolean(onToggleSelect) && disableAdd && !isSelected;
  const withdrawalPct = Number(statistics.pct_W_AW);
  const totalPct = (statistics.pct_A ?? 0) + (statistics.pct_B ?? 0) + (statistics.pct_C ?? 0) + (statistics.pct_D ?? 0) + (statistics.pct_F ?? 0);
  const grades = [
    { grade: "A", percent: statistics.pct_A ?? 0 },
    { grade: "B", percent: statistics.pct_B ?? 0 },
    { grade: "C", percent: statistics.pct_C ?? 0 },
    { grade: "D", percent: statistics.pct_D ?? 0 },
    { grade: "F", percent: statistics.pct_F ?? 0 },
  ];

  const handleCompare = () => {
    if (!onToggleSelect) return;
    onToggleSelect(statistics);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  return (
    <Card
      className={cn(
        "w-full transition-shadow duration-300 hover:shadow-lg",
        isSelected && "ring-2 ring-primary/50 border-primary/40",
        justAdded && "ring-2 ring-success/50 border-success/40",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-foreground truncate">
                {statistics.course_code}
              </h3>
              <Badge variant="outline" className="text-[11px] shrink-0">
                {statistics.section}
              </Badge>
              <Badge variant="secondary" className="text-[11px] shrink-0">
                {statistics.term}
              </Badge>
              <Badge
                variant="outline"
                className={cn("text-[11px] shrink-0", getDifficultyColorClass(difficulty))}
              >
                {difficulty}
              </Badge>
            </div>
            <p className="text-sm font-medium text-foreground mt-0.5 line-clamp-1">
              {statistics.course_title}
            </p>
            <p className="text-sm text-muted-foreground mt-1.5">
              <Users className="inline h-3.5 w-3.5 mr-1 align-text-bottom" />
              {statistics.faculty && (
                <span className="font-medium text-foreground">{statistics.faculty} · </span>
              )}
              based on {statistics.grades_count} students
            </p>
          </div>

          {onToggleSelect && (
            <Button
              type="button"
              size="sm"
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "h-7 shrink-0 gap-1 rounded-md text-[11px] font-medium px-2.5",
                justAdded && !isSelected && "border-success text-success",
              )}
              disabled={selectDisabled}
              aria-pressed={isSelected}
              onClick={handleCompare}
            >
              {isSelected ? (
                <><Check className="h-3 w-3" /> Selected</>
              ) : justAdded ? (
                <><Check className="h-3 w-3" /> Added</>
              ) : (
                <><GitCompareArrows className="h-3 w-3" /> Compare</>
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[1.75rem] font-bold leading-none tabular-nums tracking-tight text-foreground">
              {formatGPA(statistics.avg_gpa)}
            </span>
            <span className="text-xs font-medium text-muted-foreground">GPA</span>
          </div>

          <div className="h-6 w-px bg-border" />

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Median <strong className="tabular-nums text-foreground">{formatGPA(statistics.median_gpa)}</strong></span>
          </div>

          {statistics.std_dev != null && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span>
                ±<strong className="tabular-nums text-foreground">{statistics.std_dev.toFixed(2)}</strong> std dev
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-sm">
            <AlertTriangle className={cn("h-3.5 w-3.5", withdrawalPct > 5 ? "text-destructive" : "text-muted-foreground")} />
            <span className={cn(withdrawalPct > 5 ? "text-destructive" : "text-muted-foreground")}>
              <strong className="tabular-nums">{formatPercentage(withdrawalPct)}</strong> withdrew
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowPieChart(!showPieChart)}
            className="group ml-auto flex shrink-0 items-center gap-1.5 rounded-md py-1 pl-1 pr-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={showPieChart ? "Hide grade distribution breakdown" : "Show grade distribution breakdown"}
            title={
              showPieChart
                ? "Hide breakdown"
                : grades
                    .filter((g) => g.percent > 0)
                    .map((g) => `${g.grade}: ${formatPercentage(g.percent)}`)
                    .join(" · ")
            }
          >
            <div className="relative h-2 w-40 overflow-hidden rounded-full bg-muted ring-1 ring-transparent transition-shadow group-hover:ring-border">
              {grades.map(({ grade, percent }, i) => {
                if (percent <= 0) return null;
                const width = totalPct > 0 ? (percent / totalPct) * 100 : 0;
                const prevWidth = grades
                  .slice(0, i)
                  .reduce((sum, g) => sum + (totalPct > 0 ? (g.percent / totalPct) * 100 : 0), 0);
                return (
                  <div
                    key={grade}
                    className={cn("absolute inset-y-0 first:rounded-l-full last:rounded-r-full", barColors[i])}
                    style={{ left: `${prevWidth}%`, width: `${width}%` }}
                  />
                );
              })}
            </div>
            <span className="text-[11px] font-medium underline decoration-dotted underline-offset-2">
              {showPieChart ? "Hide" : "Breakdown"}
            </span>
            {showPieChart ? <EyeOff className="h-3.5 w-3.5" /> : <PieChart className="h-3.5 w-3.5" />}
          </button>
        </div>

        {showPieChart && showChart && gradeDistribution.length > 0 && (
          <div className="pt-4 border-t border-border">
            <GradeDistributionChart data={gradeDistribution} title="" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
