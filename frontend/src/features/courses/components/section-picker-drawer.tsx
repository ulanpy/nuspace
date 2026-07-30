"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import NuspaceLogoIcon from "@/assets/svg/nuspace_logo.svg";
import { Check, ChevronRight } from "lucide-react";
import type { PlannerCourse, PlannerSchedule, PlannerSection } from "../types";
import { parseSectionDays, sectionsTimeConflict } from "../utils/schedule-quality";

const nuspaceLogoSrc =
  typeof NuspaceLogoIcon === "string"
    ? NuspaceLogoIcon
    : (NuspaceLogoIcon as { src: string }).src;

type SectionGroup = {
  typeKey: string;
  label: string;
  sections: PlannerSection[];
};

type Props = {
  schedule: PlannerSchedule;
  activeCourseId: number | null;
  loadingSections: Record<number, boolean>;
  selecting: boolean;
  onSelectSection: (courseId: number, sectionIds: number[]) => void;
  /** Open drawer for a course/type (e.g. from clicking a grid block). */
  openRequest?: { courseId: number; typeKey: string; nonce: number } | null;
};

export function getSectionTypeKey(sectionCode?: string | null): string {
  if (!sectionCode) return "SECTION";
  const letters = sectionCode.replace(/[\d\s]+/g, "").toUpperCase();
  return letters || "SECTION";
}

export function SectionSelectorBar({
  schedule,
  activeCourseId,
  loadingSections,
  selecting,
  onSelectSection,
  openRequest = null,
}: Props) {
  const [open, setOpen] = useState(false);
  const [activeTypeKey, setActiveTypeKey] = useState<string | null>(null);

  const activeCourse = schedule.courses.length
    ? activeCourseId
      ? schedule.courses.find((course) => course.id === activeCourseId)
      : schedule.courses[0]
    : undefined;

  useEffect(() => {
    if (!openRequest || !activeCourse) return;
    if (openRequest.courseId !== activeCourse.id) return;
    setActiveTypeKey(openRequest.typeKey);
    setOpen(true);
  }, [openRequest, activeCourse?.id]);

  if (!schedule.courses.length || !activeCourse) {
    return null;
  }

  const hasSections = activeCourse.sections.length > 0;
  const isLoading = Boolean(loadingSections[activeCourse.id]);
  const sectionGroups = groupSectionsByType(activeCourse.sections);

  const openGroup = (typeKey: string) => {
    if (!hasSections || selecting || isLoading) return;
    setActiveTypeKey(typeKey);
    setOpen(true);
  };

  return (
    <>
      <div className="rounded-lg bg-card/70 p-3 sm:p-4">
        {sectionGroups.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
            {isLoading
              ? "Pulling sections from registrar..."
              : "Use the global refresh to fetch registrar sections."}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {sectionGroups.map((group) => {
              const selected = group.sections.find((section) => section.is_selected);
              return (
                <button
                  key={`${activeCourse.id}-${group.typeKey}`}
                  type="button"
                  disabled={!hasSections || selecting || isLoading}
                  onClick={() => openGroup(group.typeKey)}
                  className={cn(
                    "inline-flex max-w-full items-center gap-1.5 rounded-xl border px-3 py-2 text-left text-xs transition-colors",
                    "hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-50",
                    selected
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/60 bg-background",
                  )}
                >
                  <span className="shrink-0 font-semibold">{group.label}</span>
                  <span className="min-w-0 truncate text-muted-foreground">
                    {selected
                      ? `${selected.section_code || "Section"} · ${selected.days} ${selected.times}`
                      : "Choose slot"}
                  </span>
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <SectionPickerSheet
        open={open}
        onOpenChange={setOpen}
        course={activeCourse}
        groups={sectionGroups}
        activeTypeKey={activeTypeKey}
        onActiveTypeKeyChange={setActiveTypeKey}
        selecting={selecting}
        onSelectSection={onSelectSection}
        otherSelectedSections={collectOtherSelectedSections(schedule, activeCourse.id)}
      />
    </>
  );
}

function SectionPickerSheet({
  open,
  onOpenChange,
  course,
  groups,
  activeTypeKey,
  onActiveTypeKeyChange,
  selecting,
  onSelectSection,
  otherSelectedSections,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: PlannerCourse;
  groups: SectionGroup[];
  activeTypeKey: string | null;
  onActiveTypeKeyChange: (key: string) => void;
  selecting: boolean;
  onSelectSection: (courseId: number, sectionIds: number[]) => void;
  otherSelectedSections: PlannerSection[];
}) {
  const resolvedTypeKey = activeTypeKey ?? groups[0]?.typeKey ?? null;
  const activeGroup = groups.find((g) => g.typeKey === resolvedTypeKey) ?? groups[0];

  useEffect(() => {
    if (!open) return;
    if (!resolvedTypeKey && groups[0]) {
      onActiveTypeKeyChange(groups[0].typeKey);
    }
  }, [open, resolvedTypeKey, groups, onActiveTypeKeyChange]);

  const sortedSections = useMemo(() => {
    if (!activeGroup) return [];
    return [...activeGroup.sections].sort((a, b) => {
      const [aStart] = parseTimeRange(a.times);
      const [bStart] = parseTimeRange(b.times);
      if (aStart != null && bStart != null && aStart !== bStart) return aStart - bStart;
      return (a.section_code || "").localeCompare(b.section_code || "");
    });
  }, [activeGroup]);

  const pick = (sectionId: number) => {
    if (!activeGroup) return;
    // Already selected — no-op (avoids refetch / full shelf re-render).
    if (sectionId && activeGroup.sections.some((s) => s.id === sectionId && s.is_selected)) {
      return;
    }
    const nextIds = computeNextSectionSelection(
      course.sections,
      activeGroup.typeKey,
      sectionId,
    );
    onSelectSection(course.id, nextIds);

    if (!sectionId) return;

    const nextEmpty = groups.find((group) => {
      if (group.typeKey === activeGroup.typeKey) return false;
      return !group.sections.some((section) => nextIds.includes(section.id));
    });
    if (nextEmpty) {
      onActiveTypeKeyChange(nextEmpty.typeKey);
    }
  };

  const hasSelection = Boolean(activeGroup?.sections.some((s) => s.is_selected));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        showCloseButton
      >
        <SheetHeader className="space-y-3 border-b border-border/60 pr-12 pb-3">
          <div>
            <SheetTitle>
              {course.course_code}
              {activeGroup ? (
                <span className="ml-1.5 font-normal text-muted-foreground">
                  · {activeGroup.label}
                </span>
              ) : null}
            </SheetTitle>
            <SheetDescription className="truncate">
              {course.title || "Pick a time slot for this section type"}
            </SheetDescription>
          </div>

          {groups.length > 1 ? (
            <div className="flex gap-1 overflow-x-auto scroll-thin">
              {groups.map((group) => {
                const selected = group.sections.find((s) => s.is_selected);
                const isActive = group.typeKey === activeGroup?.typeKey;
                return (
                  <button
                    key={group.typeKey}
                    type="button"
                    onClick={() => onActiveTypeKeyChange(group.typeKey)}
                    className={cn(
                      "shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {group.label}
                    {selected ? (
                      <span className="ml-1 opacity-80">{selected.section_code}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 scroll-thin">
          <div className="flex items-center justify-between gap-2 px-0.5 pb-1">
            <p className="text-xs text-muted-foreground">
              {sortedSections.length} option{sortedSections.length === 1 ? "" : "s"}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="h-7 text-xs text-muted-foreground"
              disabled={selecting || !hasSelection}
              onClick={() => activeGroup && pick(0)}
            >
              Deselect
            </Button>
          </div>

          {sortedSections.map((section) => {
            const selected = section.is_selected;
            const nuspaceCount = section.selected_count ?? 0;
            const capacity = section.capacity ?? 0;
            const clashes = sectionConflicts(section, [
              ...otherSelectedSections,
              ...course.sections.filter(
                (s) =>
                  s.is_selected &&
                  s.id !== section.id &&
                  getSectionTypeKey(s.section_code) !== activeGroup?.typeKey,
              ),
            ]);
            return (
              <button
                key={section.id}
                type="button"
                disabled={selecting}
                onClick={() => pick(section.id)}
                className={cn(
                  "w-full rounded-xl border p-3 text-left transition-colors",
                  selected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border/60 bg-card hover:bg-muted/40",
                  clashes && !selected && "border-destructive/40",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold">
                        {section.section_code || "Section"}
                      </span>
                      {clashes ? (
                        <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                          Clash
                        </Badge>
                      ) : null}
                      {selected ? (
                        <Badge variant="secondary" className="h-5 gap-0.5 px-1.5 text-[10px]">
                          <Check className="size-3" />
                          Selected
                        </Badge>
                      ) : null}
                      {capacity > 0 ? (
                        <span
                          className="tabular-nums text-[11px] text-muted-foreground"
                          title="Section seat capacity"
                        >
                          {capacity} seats
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs font-medium tabular-nums">
                      {section.days || "—"} · {section.times || "TBA"}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      {section.faculty ? <span>{truncateFaculty(section.faculty)}</span> : null}
                      {section.room ? <span>{truncateRoom(section.room)}</span> : null}
                      {nuspaceCount > 0 ? (
                        <span
                          className="inline-flex items-center gap-1 tabular-nums"
                          title="Students who chose this section on Nuspace"
                        >
                          <img
                            src={nuspaceLogoSrc}
                            alt=""
                            className="size-3 object-contain opacity-70"
                            aria-hidden="true"
                          />
                          {nuspaceCount} chose this
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <DayIndicators days={section.days} />
                </div>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function collectOtherSelectedSections(
  schedule: PlannerSchedule,
  activeCourseId: number,
): PlannerSection[] {
  return schedule.courses
    .filter((course) => course.id !== activeCourseId)
    .flatMap((course) => course.sections.filter((section) => section.is_selected));
}

function sectionConflicts(candidate: PlannerSection, others: PlannerSection[]): boolean {
  return others.some((other) => sectionsTimeConflict(candidate, other));
}

function groupSectionsByType(sections: PlannerSection[]): SectionGroup[] {
  const map: Record<string, SectionGroup> = {};
  sections.forEach((section) => {
    const typeKey = getSectionTypeKey(section.section_code);
    if (!map[typeKey]) {
      map[typeKey] = {
        typeKey,
        label: getSectionTypeLabel(typeKey),
        sections: [],
      };
    }
    map[typeKey].sections.push(section);
  });
  return Object.values(map);
}

function computeNextSectionSelection(
  sections: PlannerSection[],
  targetType: string,
  newSectionId: number,
): number[] {
  const remainingSelections = sections
    .filter(
      (section) => section.is_selected && getSectionTypeKey(section.section_code) !== targetType,
    )
    .map((section) => section.id);
  if (newSectionId) {
    if (!remainingSelections.includes(newSectionId)) {
      remainingSelections.push(newSectionId);
    }
  }
  return remainingSelections;
}

function getSectionTypeLabel(typeKey: string): string {
  const dictionary: Record<string, string> = {
    L: "Lecture",
    R: "Recitation",
    LAB: "Lab",
    PBLV: "Problem-based",
    PBL: "Problem-based",
    S: "Seminar",
  };
  return dictionary[typeKey] || typeKey;
}

const dayOrder = ["M", "T", "W", "R", "F", "S"];

function DayIndicators({ days }: { days: string | null }) {
  const active = new Set(parseSectionDays(days));
  return (
    <div className="flex shrink-0 gap-0.5">
      {dayOrder.map((day) => (
        <span
          key={day}
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded text-[9px]",
            active.has(day)
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {day}
        </span>
      ))}
    </div>
  );
}

function parseTimeRange(value: string): [number | null, number | null] {
  if (!value.includes("-")) return [null, null];
  const [startRaw, endRaw] = value.split("-");
  return [parseTime(startRaw.trim()), parseTime(endRaw.trim())];
}

function parseTime(value: string): number | null {
  const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const modifier = match[3].toUpperCase();
  if (modifier === "AM") {
    hour = hour % 12;
  } else {
    hour = (hour % 12) + 12;
  }
  return hour * 60 + minute;
}

function truncateFaculty(faculty: string | null | undefined): string {
  if (!faculty) return "";
  const trimmed = faculty.trim();
  return trimmed.length > 28 ? `${trimmed.slice(0, 27)}…` : trimmed;
}

function truncateRoom(room: string | null | undefined): string {
  if (!room) return "";
  if (room.includes("-")) return room.split("-")[0];
  return room.split(/( |cap)/g)[0];
}
