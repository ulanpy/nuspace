import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { SearchableInfiniteList } from "@/components/virtual/SearchableInfiniteList";
import { usePreSearchGrades } from "../api/hooks/usePreSearchGrades";
import { useGradeTerms } from "../api/hooks/useGradeTerms";
import { GradeStatisticsCard } from "./GradeStatisticsCard";
import type { GradeStatistics } from "../types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select";
import { Label } from "@/components/atoms/label";

const MAX_SELECTIONS = 8;

export function CourseStatsTab() {
  const [selected, setSelected] = useState<GradeStatistics[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string | undefined>(undefined);
  const { terms, isLoading: isLoadingTerms } = useGradeTerms();

  const termOptions = useMemo(() => ["all", ...terms], [terms]);

  const handleToggleSelect = (item: GradeStatistics) => {
    setSelected((prev) => {
      const exists = prev.some((s) => s.id === item.id);
      if (exists) {
        return prev.filter((s) => s.id !== item.id);
      }
      if (prev.length >= MAX_SELECTIONS) return prev;
      return [...prev, item];
    });
  };

  return (
    <div className="w-full overflow-x-hidden" id="courses-section">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xs w-full">
          <Label className="mb-1 block text-sm font-medium text-muted-foreground">
            Term
          </Label>
          <Select
            onValueChange={(value) => {
              setSelectedTerm(value === "all" ? undefined : value);
            }}
            value={selectedTerm ?? "all"}
            disabled={isLoadingTerms}
          >
            <SelectTrigger>
              <SelectValue placeholder="All terms" />
            </SelectTrigger>
            <SelectContent>
              {termOptions.map((term) => (
                <SelectItem key={term} value={term}>
                  {term === "all" ? "All terms" : term}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <SearchableInfiniteList
        queryKey={["courses"]}
        apiEndpoint="/grades"
        size={12}
        additionalParams={{ term: selectedTerm }}
        renderItem={(gradeReport: GradeStatistics) => (
          <div key={gradeReport.id} className="h-full">
            <GradeStatisticsCard
              statistics={gradeReport}
              onToggleSelect={handleToggleSelect}
              isSelected={selected.some((s) => s.id === gradeReport.id)}
              disableAdd={selected.length >= MAX_SELECTIONS}
            />
          </div>
        )}
        renderEmpty={() => (
          <div className="py-12 text-center">
            <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">No grade reports found</h3>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              There are no grade reports available at the moment.
            </p>
          </div>
        )}
        searchPlaceholder="Search courses"
        usePreSearch={usePreSearchGrades}
        setSelectedCondition={() => {}}
        itemCountPlaceholder=""
      />
    </div>
  );
}

