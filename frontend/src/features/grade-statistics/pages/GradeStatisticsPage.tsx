"use client";

import { useMemo, useState } from "react";
import { GradeStatisticsCard } from "../components/GradeStatisticsCard";
import { GradeStatistics } from "../types";
import { SearchableInfiniteList } from "@/components/virtual/SearchableInfiniteList";
import { usePreSearchGrades } from "../api/hooks/usePreSearchGrades";
import { BarChart3 } from "lucide-react";
import MotionWrapper from "@/components/atoms/motion-wrapper";
import { Card, CardContent } from "@/components/atoms/card";

export default function GradeStatisticsPage() {
  const [selected, setSelected] = useState<GradeStatistics[]>([]);

  const maxSelections = 8;

  const expectedGPA = useMemo(() => {
    if (selected.length === 0) return 0;
    const total = selected.reduce((sum, s) => sum + (s.avg_gpa || 0), 0);
    return total / selected.length;
  }, [selected]);

  const handleToggleSelect = (item: GradeStatistics) => {
    setSelected(prev => {
      const exists = prev.some(s => s.id === item.id);
      if (exists) {
        return prev.filter(s => s.id !== item.id);
      }
      if (prev.length >= maxSelections) return prev; // capped
      return [...prev, item];
    });
  };

  return (
    <MotionWrapper>
      <div className="w-full max-w-none">
        {/* Header */}
        <div className="space-y-2 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            📊 Grade Statistics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Explore university course grade distributions, GPA statistics, and academic performance metrics.
          </p>
        </div>

        {/* Expected GPA Summary */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Your expected GPA</div>
                <div className="text-2xl font-semibold">{expectedGPA.toFixed(2)}</div>
              </div>
              <div className="text-sm text-muted-foreground">
                {selected.length} / {maxSelections} courses selected
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Note: This is a simple statistical average of selected courses' historical average GPA.
              It does not predict or reflect your individual abilities or performance.
            </p>
          </CardContent>
        </Card>

        {/* Grade Statistics List with Search */}
        <div className="w-full overflow-x-hidden" id="grade-statistics-section">
          <SearchableInfiniteList
            queryKey={["grade-statistics"]}
            apiEndpoint="/grades"
            size={12}
            additionalParams={{}}
            renderItem={(gradeReport: GradeStatistics) => (
              <div key={gradeReport.id} className="h-full">
                <GradeStatisticsCard
                  statistics={gradeReport}
                  onToggleSelect={handleToggleSelect}
                  isSelected={selected.some(s => s.id === gradeReport.id)}
                  disableAdd={selected.length >= maxSelections}
                />
              </div>
            )}
            renderEmpty={() => (
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  No grade reports found
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  There are no grade reports available at the moment.
                </p>
              </div>
            )}
            searchPlaceholder="Search courses, course codes, or faculty..."
            usePreSearch={usePreSearchGrades}
            setSelectedCondition={() => {}}
            title="Grade Reports"
            itemCountPlaceholder=""
          />
        </div>
      </div>
    </MotionWrapper>
  );
}