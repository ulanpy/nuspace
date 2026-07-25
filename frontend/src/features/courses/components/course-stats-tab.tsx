"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { SearchableInfiniteList } from '@/components/virtual/searchable-infinite-list';
import { usePreSearchGrades } from '../api/hooks/use-pre-search-grades';
import { useGradeTerms } from '../api/hooks/use-grade-terms';
import { GradeStatisticsCard } from './grade-statistics-card';
import { GradeCompareTray } from './grade-compare-tray';
import { TermCombobox } from './term-combobox';
import type { GradeStatistics } from "../types";

const MAX_SELECTIONS = 8;

export function CourseStatsTab({ initialKeyword = "" }: { initialKeyword?: string }) {
  const [selected, setSelected] = useState<GradeStatistics[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string | undefined>(undefined);
  const [searchKeyword, setSearchKeyword] = useState(initialKeyword);
  const { terms, isLoading: isLoadingTerms } = useGradeTerms();

  useEffect(() => {
    setSearchKeyword(initialKeyword);
  }, [initialKeyword]);

  const handleRemove = (id: number) => {
    setSelected((prev) => prev.filter((s) => s.id !== id));
  };

  const selectedIds = useMemo(
    () => new Set(selected.map((item) => item.id)),
    [selected],
  );

  const handleToggleSelect = useCallback((item: GradeStatistics) => {
    setSelected((prev) => {
      const exists = prev.some((s) => s.id === item.id);
      if (exists) {
        return prev.filter((s) => s.id !== item.id);
      }
      if (prev.length >= MAX_SELECTIONS) return prev;
      return [...prev, item];
    });
  }, []);

  const renderItem = useCallback(
    (gradeReport: GradeStatistics) => (
      <div key={gradeReport.id} className="h-full">
        <GradeStatisticsCard
          statistics={gradeReport}
          onToggleSelect={handleToggleSelect}
          isSelected={selectedIds.has(gradeReport.id)}
          disableAdd={selected.length >= MAX_SELECTIONS}
        />
      </div>
    ),
    [handleToggleSelect, selected.length, selectedIds],
  );

  const renderEmpty = useCallback(
    () => (
      <div className="py-12 text-center">
        <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-medium">No grade reports found</h3>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          There are no grade reports available at the moment.
        </p>
      </div>
    ),
    [],
  );

  const termFilter = useMemo(
    () => (
      <TermCombobox
        terms={terms}
        value={selectedTerm}
        onValueChange={setSelectedTerm}
        disabled={isLoadingTerms}
      />
    ),
    [isLoadingTerms, selectedTerm, terms],
  );

  return (
    <div className="w-full" id="courses-section">
      <GradeCompareTray
        selected={selected}
        onRemove={handleRemove}
        onClear={() => setSelected([])}
        maxSelections={MAX_SELECTIONS}
      />

      <SearchableInfiniteList
        queryKey={["courses"]}
        apiEndpoint="/grades"
        size={12}
        keyword={searchKeyword}
        additionalParams={{ term: selectedTerm }}
        onSearchChange={setSearchKeyword}
        renderItem={renderItem}
        renderEmpty={renderEmpty}
        searchPlaceholder="Search courses"
        toolbarStart={termFilter}
        usePreSearch={usePreSearchGrades}
        setSelectedCondition={() => {}}
        itemCountPlaceholder=""
      />
    </div>
  );
}

