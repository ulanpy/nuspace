// @ts-nocheck
"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/select";
import { gradeStatisticsApi } from "../api/gradeStatisticsApi";
import {
  PlannerAutoBuildResponse,
  PlannerCourse,
  PlannerSection,
  PlannerSchedule,
  PlannerCourseAddPayload,
  PlannerCourseSearchResult,
} from "../types";
import { Loader2, RefreshCcw, Trash2, Wand2, X } from "lucide-react";

type CourseForm = {
  query: string;
  term_value: string;
  term_label: string;
};

const defaultCourseForm: CourseForm = {
  query: "",
  term_value: "",
  term_label: "",
};

const dayDefs = [
  { label: "Mon", key: "M" },
  { label: "Tue", key: "T" },
  { label: "Wed", key: "W" },
  { label: "Thu", key: "R" },
  { label: "Fri", key: "F" },
  { label: "Sat", key: "S" },
];

type CourseRequirementDetail = {
  heading: string;
  subheading?: string | null;
  preReq?: string | null;
  coReq?: string | null;
  antiReq?: string | null;
  priority_1?: string | null;
  priority_2?: string | null;
  priority_3?: string | null;
  priority_4?: string | null;
};

const hasText = (value?: string | null) => Boolean(value && value.trim().length);
const hasPriorityValues = (values: Array<string | null | undefined>) =>
  values.some((value) => hasText(value));
const buildRequirementDetailsFromSearch = (
  item: PlannerCourseSearchResult,
): CourseRequirementDetail => ({
  heading: item.course_code,
  subheading: item.title,
  preReq: item.pre_req,
  coReq: item.co_req,
  antiReq: item.anti_req,
  priority_1: item.priority_1,
  priority_2: item.priority_2,
  priority_3: item.priority_3,
  priority_4: item.priority_4,
});
const buildRequirementDetailsFromCourse = (course: PlannerCourse): CourseRequirementDetail => ({
  heading: course.course_code,
  subheading: course.term_label || course.term_value || course.school || "",
  preReq: course.pre_req,
  coReq: course.co_req,
  antiReq: course.anti_req,
  priority_1: course.priority_1,
  priority_2: course.priority_2,
  priority_3: course.priority_3,
  priority_4: course.priority_4,
});

type RemoveArgs = number;
type SelectArgs = { courseId: number; sectionIds: number[] };
type MutationRef<TArgs> = UseMutationResult<any, unknown, TArgs, unknown>;

type SectionEvent = { course: PlannerCourse; section: PlannerSection };

interface ScheduleBuilderTabProps {
  user: { email?: string | null } | null;
  login: () => void;
}

export const ScheduleBuilderTab = ({ user, login }: ScheduleBuilderTabProps) => {
  const queryClient = useQueryClient();
  const plannerQuery = useQuery({
    queryKey: ["plannerSchedule"],
    queryFn: gradeStatisticsApi.getPlannerSchedule,
  });
  const semestersQuery = useQuery({
    queryKey: ["plannerSemesters"],
    queryFn: gradeStatisticsApi.getPlannerSemesters,
  });

  const [courseForm, setCourseForm] = useState<CourseForm>(defaultCourseForm);
  const [autoBuildResult, setAutoBuildResult] = useState<PlannerAutoBuildResponse | null>(null);
  const [autoBuildError, setAutoBuildError] = useState<string | null>(null);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [loadingSections, setLoadingSections] = useState<Record<number, boolean>>({});
  const [searchResults, setSearchResults] = useState<PlannerCourseSearchResult[]>([]);
  const [searchCursor, setSearchCursor] = useState<number | null>(null);
  const [lastSearch, setLastSearch] = useState<{ term_value: string; query: string } | null>(
    null,
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionEvent | null>(null);
  const [activeRequirements, setActiveRequirements] = useState<CourseRequirementDetail | null>(null);
  const [activeCourseId, setActiveCourseId] = useState<number | null>(null);
  const autoFetchedCourses = useRef<Set<number>>(new Set());
  const planner = plannerQuery.data ?? null;
  const currentTermValue = courseForm.term_value;
  const invalidatePlanner = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["plannerSchedule"] }),
    [queryClient],
  );

  useEffect(() => {
    if (!planner?.courses?.length) {
      if (activeCourseId !== null) {
        setActiveCourseId(null);
      }
      return;
    }

    const exists = planner.courses.some((course) => course.id === activeCourseId);
    if (!exists) {
      setActiveCourseId(planner.courses[0].id);
    }
  }, [planner?.courses, activeCourseId]);

  useEffect(() => {
    setCourseForm(defaultCourseForm);
    setAutoBuildResult(null);
    setAutoBuildError(null);
    setLoadingSections({});
    setSearchResults([]);
    setSearchCursor(null);
    setLastSearch(null);
    setIsLoadingMore(false);
    autoFetchedCourses.current.clear();
  }, [planner?.id]);

  useEffect(() => {
    const latestSemester = semestersQuery.data?.[0];
    if (!latestSemester || currentTermValue) return;
    setCourseForm((prev) => ({
      ...prev,
      term_value: latestSemester.value,
      term_label: latestSemester.label,
    }));
  }, [semestersQuery.data, currentTermValue]);

  useEffect(() => {
    setSearchResults([]);
    setSearchCursor(null);
    setLastSearch(null);
    setIsLoadingMore(false);
  }, [currentTermValue]);

  useEffect(() => {
    if (!planner) return;
    planner.courses.forEach((course) => {
      if (!course.sections.length && !autoFetchedCourses.current.has(course.id)) {
        autoFetchedCourses.current.add(course.id);
        setLoadingSections((prev) => ({ ...prev, [course.id]: true }));
        gradeStatisticsApi
          .fetchPlannerSections(course.id)
          .then(() => invalidatePlanner())
          .catch(() => {
            autoFetchedCourses.current.delete(course.id);
          })
          .finally(() => {
            setLoadingSections((prev) => {
              const next = { ...prev };
              delete next[course.id];
              return next;
            });
          });
      }
    });
  }, [planner, invalidatePlanner]);

  const addCourseMutation = useMutation({
    mutationFn: (payload: PlannerCourseAddPayload) => gradeStatisticsApi.addPlannerCourse(payload),
    onSuccess: invalidatePlanner,
  });

  const removeCourseMutation = useMutation({
    mutationFn: (courseId: number) => gradeStatisticsApi.removePlannerCourse(courseId),
    onSuccess: (_data, courseId) => {
      const courseLabel =
        planner?.courses?.find((c) => c.id === courseId)?.course_code ?? "Course";
      setAutoBuildResult(null);
      setAutoBuildError(null);
      setRefreshMessage(`${courseLabel} removed from planner.`);
      invalidatePlanner();
    },
    onError: () => {
      setAutoBuildResult(null);
      setAutoBuildError(null);
      setRefreshMessage("Remove failed. Please try again.");
    },
  });

  const refreshAllCoursesMutation = useMutation({
    mutationFn: () => gradeStatisticsApi.refreshPlannerCourses(),
    onMutate: () => {
      setAutoBuildResult(null);
      setAutoBuildError(null);
      setRefreshMessage(null);
      if (planner?.courses?.length) {
        setLoadingSections((prev) => {
          const next = { ...prev };
          planner.courses.forEach((course) => {
            next[course.id] = true;
          });
          return next;
        });
      }
    },
    onSuccess: () => {
      setRefreshMessage("All courses refreshed.");
      invalidatePlanner();
    },
    onError: () => {
      setRefreshMessage("Refresh failed. Please try again.");
    },
    onSettled: () => {
      setLoadingSections({});
    },
  });

  const selectSectionMutation = useMutation({
    mutationFn: ({
      courseId,
      sectionIds,
    }: {
      courseId: number;
      sectionIds: number[];
    }) =>
      gradeStatisticsApi.selectPlannerSections(courseId, {
        section_ids: sectionIds,
      }),
    onSuccess: invalidatePlanner,
  });

  const autoBuildMutation = useMutation({
    mutationFn: () => gradeStatisticsApi.autoBuildPlanner(),
    onMutate: () => {
      setAutoBuildError(null);
      setAutoBuildResult(null);
      setRefreshMessage(null);
    },
    onSuccess: (result: PlannerAutoBuildResponse) => {
      setAutoBuildResult(result);
      setRefreshMessage(null);
      invalidatePlanner();
    },
    onError: (error) => {
      setAutoBuildError(error instanceof Error ? error.message : "Shuffle failed");
      setRefreshMessage(null);
    },
  });

  const resetPlannerMutation = useMutation({
    mutationFn: (termValue?: string) => gradeStatisticsApi.resetPlanner(termValue),
    onSuccess: invalidatePlanner,
  });

  const courseSearchMutation = useMutation({
    mutationFn: ({
      term_value,
      query,
      page = 1,
    }: {
      term_value: string;
      query: string;
      page?: number;
    }) => gradeStatisticsApi.searchPlannerCourses({ term_value, query, page }),
  });

  const isCourseAlreadyAdded = useCallback(
    (courseCode: string, termValue: string) => {
      if (!planner?.courses) return false;
      return planner.courses.some(
        (course) => course.course_code === courseCode && course.term_value === termValue,
      );
    },
    [planner],
  );

  const handleAddCourse = (courseCode: string) => {
    if (!planner || !courseForm.term_value) return;
    if (isCourseAlreadyAdded(courseCode, courseForm.term_value)) return;
    addCourseMutation.mutate({
      course_code: courseCode,
      term_value: courseForm.term_value,
      term_label: courseForm.term_label,
    });
  };

  const performSearch = (
    params: { term_value: string; query: string; page: number },
    { append }: { append: boolean },
  ) => {
    courseSearchMutation.mutate(params, {
      onSuccess: (data) => {
        setSearchResults((prev) => (append ? [...prev, ...data.items] : data.items));
        setSearchCursor(data.cursor ?? null);
        setLastSearch({ term_value: params.term_value, query: params.query });
      },
      onSettled: () => {
        setIsLoadingMore(false);
      },
    });
  };

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!planner || !courseForm.term_value) return;
    const query = courseForm.query.trim();
    if (!query) return;
    setSearchResults([]);
    setSearchCursor(null);
    setLastSearch(null);
    performSearch(
      {
        term_value: courseForm.term_value,
        query,
        page: 1,
      },
      { append: false },
    );
  };

  const handleLoadMoreResults = () => {
    if (!searchCursor || !lastSearch) return;
    setIsLoadingMore(true);
    performSearch(
      {
        term_value: lastSearch.term_value,
        query: lastSearch.query,
        page: searchCursor,
      },
      { append: true },
    );
  };

  const searchError =
    courseSearchMutation.isError && courseSearchMutation.error instanceof Error
      ? courseSearchMutation.error.message
      : courseSearchMutation.isError
        ? "Unable to search courses"
        : null;
  const isSearchPending = courseSearchMutation.isPending && !isLoadingMore;
  const canSearch = Boolean(planner && courseForm.term_value && courseForm.query.trim());

  const selectedEvents: SectionEvent[] = useMemo(() => {
    if (!planner) return [];
    return planner.courses.flatMap((course) =>
      course.sections
        .filter((section) => section.is_selected)
        .map((section) => ({ course, section })),
    );
  }, [planner]);

  const handleShowRequirementsFromSearch = (result: PlannerCourseSearchResult) => {
    setActiveRequirements(buildRequirementDetailsFromSearch(result));
  };

  const handleShowRequirementsForCourse = (course: PlannerCourse) => {
    setActiveRequirements(buildRequirementDetailsFromCourse(course));
  };

  // Check for time clashes
  const hasClash = useMemo(() => {
    if (selectedEvents.length < 2) return false;
    
    // Group events by day
    const eventsByDay: Record<string, Array<{ start: number; end: number; id: string }>> = {};
    
    selectedEvents.forEach(({ section }) => {
      const [start, end] = parseTimeRange(section.times);
      // Only process events with valid times where start < end
      if (start == null || end == null || start >= end) return;
      if (!section.days || section.days.length === 0) return;
      
      section.days.split("").forEach((day) => {
        if (!day.trim()) return;
        if (!eventsByDay[day]) {
          eventsByDay[day] = [];
        }
        eventsByDay[day].push({ start, end, id: `${section.id}-${day}` });
      });
    });
    
    // Check for overlaps on each day
    for (const day in eventsByDay) {
      const dayEvents = eventsByDay[day];
      if (dayEvents.length < 2) continue;
      
      for (let i = 0; i < dayEvents.length; i++) {
        for (let j = i + 1; j < dayEvents.length; j++) {
          const event1 = dayEvents[i];
          const event2 = dayEvents[j];
          // Events overlap if: start1 < end2 && start2 < end1
          // This means they have a time period in common
          if (event1.start < event2.end && event2.start < event1.end) {
            return true;
          }
        }
      }
    }
    
    return false;
  }, [selectedEvents]);

  if (plannerQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading planner...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3">
        <div className="text-sm text-muted-foreground">
          Login to track your course progress this semester.
        </div>
        <Button onClick={login} size="sm" className="h-8 rounded-full px-3 text-xs font-medium">
          Login
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full space-y-4 lg:w-80">
        <section className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold">Find a course</h3>
          <form className="mt-3 space-y-2" onSubmit={handleSearchSubmit}>
            <input
              className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Search by code (e.g., MATH 161)"
              value={courseForm.query}
              onChange={(e) =>
                setCourseForm((prev) => ({
                  ...prev,
                  query: e.target.value,
                }))
              }
              disabled={!planner}
              required
            />
            <Select
              value={courseForm.term_value}
              onValueChange={(value) => {
                const term = semestersQuery.data?.find((option) => option.value === value);
                setCourseForm((prev) => ({
                  ...prev,
                  term_value: value,
                  term_label: term?.label ?? "",
                }));
              }}
              disabled={!planner || semestersQuery.isLoading}
            >
              <SelectTrigger className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-ring">
                <SelectValue placeholder="Select term" />
              </SelectTrigger>
              <SelectContent>
                {semestersQuery.data?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="submit"
              className="w-full"
              disabled={!canSearch || courseSearchMutation.isPending}
            >
              {isSearchPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Searching
                </span>
              ) : (
                "Search"
              )}
            </Button>
          </form>
          {searchError && (
            <p className="mt-2 text-xs text-destructive">{searchError}</p>
          )}
          <div className="mt-4 space-y-3 text-sm">
            {isSearchPending && searchResults.length === 0 ? (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching registrar catalog...
              </p>
            ) : searchResults.length ? (
              searchResults.map((result) => {
                const priorityValues = [
                  result.priority_1,
                  result.priority_2,
                  result.priority_3,
                  result.priority_4,
                ];
                const hasMeta =
                  hasText(result.pre_req) ||
                  hasText(result.co_req) ||
                  hasText(result.anti_req) ||
                  hasPriorityValues(priorityValues);
                const metaParts = [result.school, result.level, result.term].filter(Boolean);
                return (
                  <div
                    key={result.course_code}
                    className="rounded-lg border border-border/60 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{result.course_code}</p>
                        <p className="text-xs text-muted-foreground">{result.title}</p>
                        {metaParts.length > 0 && (
                          <p className="text-xs text-muted-foreground">{metaParts.join(" · ")}</p>
                        )}
                        {hasMeta && (
                          <Button
                            size="xs"
                            variant="link"
                            className="px-0 text-xs"
                            onClick={() => handleShowRequirementsFromSearch(result)}
                          >
                            Priorities & requisites
                          </Button>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddCourse(result.course_code)}
                        disabled={
                          !planner ||
                          !courseForm.term_value ||
                          addCourseMutation.isPending ||
                          isCourseAlreadyAdded(result.course_code, courseForm.term_value)
                        }
                        variant={
                          isCourseAlreadyAdded(result.course_code, courseForm.term_value)
                            ? "outline"
                            : "default"
                        }
                      >
                        {addCourseMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isCourseAlreadyAdded(result.course_code, courseForm.term_value) ? (
                          "Added"
                        ) : (
                          "Add"
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : null}
          </div>
          {searchCursor && (
            <Button
              size="sm"
              variant="ghost"
              className="mt-3 w-full"
              onClick={handleLoadMoreResults}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading more
                </span>
              ) : (
                "Load more"
              )}
            </Button>
          )}
        </section>

        <section className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Courses</h3>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => refreshAllCoursesMutation.mutate()}
                disabled={!planner?.courses.length || refreshAllCoursesMutation.isPending}
                aria-label="Refresh all courses"
              >
                {refreshAllCoursesMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => autoBuildMutation.mutate()}
                disabled={!planner || autoBuildMutation.isPending}
              >
                {autoBuildMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Shuffle
                  </>
                )}
              </Button>
            </div>
          </div>
          {(autoBuildResult || autoBuildError) && (
            <div className="mt-2 rounded-md border border-border/40 bg-muted/20 p-2 text-xs text-muted-foreground space-y-1">
              {autoBuildError && <p className="text-destructive">{autoBuildError}</p>}
              {autoBuildResult && (
                <>
                  <p>{autoBuildResult.message}</p>
                  {!!autoBuildResult.unscheduled_courses.length && (
                    <p>Couldn&apos;t place: {autoBuildResult.unscheduled_courses.join(", ")}</p>
                  )}
                </>
              )}
            </div>
          )}
          {!autoBuildResult && !autoBuildError && refreshMessage && (
            <div className="mt-2 rounded-md border border-border/40 bg-muted/20 p-2 text-xs text-muted-foreground">
              <p>{refreshMessage}</p>
            </div>
          )}
          <div className="mt-3 space-y-3 text-sm">
            {planner?.courses.length ? (
              planner.courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onRemove={removeCourseMutation}
                  onSelect={setActiveCourseId}
                  onShowMeta={handleShowRequirementsForCourse}
                  isActive={course.id === activeCourseId}
                />
              ))
            ) : (
              <p className="text-muted-foreground">
                {planner ? "Add a course to get started." : "Planner is still loading."}
              </p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-border/60 bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Planner data</h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => resetPlannerMutation.mutate(undefined)}
            >
              Reset
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Reset clears cached planner courses and sections for the current student.
          </p>
        </section>
        </aside>

        <section className="flex-1 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold">Planner preview</h3>
            {selectedEvents.length > 0 && (
              <Badge
                variant={hasClash ? "destructive" : "default"}
                className="text-xs font-semibold"
              >
                {hasClash ? "Clash" : "Fit"}
              </Badge>
            )}
          </div>
          <SchedulePreview
            schedule={planner}
            events={selectedEvents}
            onSelect={selectSectionMutation}
            selecting={selectSectionMutation.isPending}
            loadingSections={loadingSections}
            onShowDetails={setActiveSection}
            activeCourseId={activeCourseId}
          />
        </section>
      </div>
      {activeSection && (
        <SectionDetailModal sectionEvent={activeSection} onClose={() => setActiveSection(null)} />
      )}
      {activeRequirements && (
        <CourseRequirementModal
          details={activeRequirements}
          onClose={() => setActiveRequirements(null)}
        />
      )}
    </div>
  );
};

const CourseCard = ({
  course,
  onRemove,
  onSelect,
  onShowMeta,
  isActive,
}: {
  course: PlannerCourse;
  onRemove: MutationRef<RemoveArgs>;
  onSelect: (courseId: number) => void;
  onShowMeta: (course: PlannerCourse) => void;
  isActive: boolean;
}) => {
  const metaParts = [
    course.school,
    course.term_label || course.term_value,
    course.level,
  ].filter(Boolean);
  const priorityValues = [
    course.priority_1,
    course.priority_2,
    course.priority_3,
    course.priority_4,
  ];
  const hasMeta =
    hasText(course.pre_req) ||
    hasText(course.co_req) ||
    hasText(course.anti_req) ||
    hasPriorityValues(priorityValues);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(course.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(course.id);
        }
      }}
      className={`rounded-lg border p-3 outline-none transition focus-visible:ring-2 focus-visible:ring-primary ${
        isActive ? "border-primary bg-primary/5" : "border-border/60 bg-card"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{course.course_code}</p>
          {metaParts.length > 0 && (
            <p className="text-xs text-muted-foreground">{metaParts.join(" · ")}</p>
          )}
          {hasMeta && (
            <Button
              size="xs"
              variant="link"
              className="px-0 text-xs"
              onClick={(event) => {
                event.stopPropagation();
                onShowMeta(course);
              }}
            >
              Priorities & requisites
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={(event) => {
              event.stopPropagation();
              onRemove.mutate(course.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const SchedulePreview = ({
  schedule,
  events,
  onSelect,
  selecting,
  loadingSections,
  onShowDetails,
  activeCourseId,
}: {
  schedule: PlannerSchedule | null;
  events: SectionEvent[];
  onSelect: MutationRef<SelectArgs>;
  selecting: boolean;
  loadingSections: Record<number, boolean>;
  onShowDetails: (sectionEvent: SectionEvent) => void;
  activeCourseId: number | null;
}) => {
  if (!schedule) {
    return (
      <div className="mt-6 flex h-64 items-center justify-center text-sm text-muted-foreground">
        Create a schedule to preview blocks.
      </div>
    );
  }

  const hasSections = schedule.courses.some((course) => course.sections.length);
  const startHour = 8;
  const endHour = 22; // 10 PM
  const hourHeight = 75;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, idx) => startHour + idx);
  const maxTimeMinutes = endHour * 60; // 10 PM in minutes (1320)
  const overallProbability = calculateOverallScheduleProbability(events);
  
  // Filter out events that end after 10 PM
  const filteredEvents = events.filter(({ section }) => {
    const [start, end] = parseTimeRange(section.times);
    if (start == null || end == null) return false;
    return end <= maxTimeMinutes; // Only include events that end at or before 10 PM
  });
  const clashingSectionIds = useMemo(() => {
    const clashes = new Set<number>();
    const intervalsByDay: Record<string, Array<{ start: number; end: number; id: number }>> = {};
    filteredEvents.forEach(({ section }) => {
      const [start, end] = parseTimeRange(section.times);
      if (start == null || end == null) {
        return;
      }
      const days = (section.days || "").split("").filter((char) => dayDefs.some((d) => d.key === char));
      days.forEach((day) => {
        const intervals = intervalsByDay[day] || [];
        intervals.forEach((interval) => {
          if (!(end <= interval.start || start >= interval.end)) {
            clashes.add(section.id);
            clashes.add(interval.id);
          }
        });
        intervals.push({ start, end, id: section.id });
        intervalsByDay[day] = intervals;
      });
    });
    return clashes;
  }, [filteredEvents]);

  return (
    <div className="mt-4 space-y-4">
      {filteredEvents.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-4 py-2">
          <span className="text-sm font-medium text-muted-foreground">Schedule probability</span>
          <span className="text-lg font-bold text-foreground">
            {Math.round(overallProbability * 100)}%
          </span>
        </div>
      )}
      <SectionSelectorBar
        schedule={schedule}
        onSelect={onSelect}
        selecting={selecting}
        loadingSections={loadingSections}
        activeCourseId={activeCourseId}
      />
      {filteredEvents.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-border/60 bg-muted/10 p-4 text-sm text-muted-foreground">
          {hasSections
            ? "Select a section to populate the grid."
            : "Load registrar sections to start visualizing your schedule."}
        </div>
      ) : (
        <div className="overflow-auto rounded-xl border border-border/60 bg-muted/10 p-4">
          <div className="grid grid-cols-[60px_repeat(6,minmax(0,1fr))] gap-2 text-xs font-semibold">
            <div />
            {dayDefs.map((day) => (
              <div key={day.key} className="text-center text-muted-foreground">
                {day.label}
              </div>
            ))}
          </div>
          <div className="mt-2 flex">
            <div className="flex flex-col text-right text-xs text-muted-foreground">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="border-t border-border/40 pr-2"
                  style={{ height: hourHeight }}
                >
                  {formatHour(hour)}
                </div>
              ))}
            </div>
            <div className="relative flex-1">
              <div className="absolute inset-0 grid grid-cols-6 gap-2">
                {dayDefs.map((day) => (
                  <div key={day.key} className="relative border-l border-border/30">
                    {hours.map((hour) => (
                      <div
                        key={`${day.key}-${hour}`}
                        className="border-t border-dashed border-border/20"
                        style={{ height: hourHeight }}
                      />
                    ))}
                    {filteredEvents
                      .filter(({ section }) => section.days.includes(day.key))
                      .map(({ course, section }) => {
                        const [start, end] = parseTimeRange(section.times);
                        if (start == null || end == null) return null;
                        const demandRatio = computeDemandRatio(section);
                        const slotColors = getDemandClasses(demandRatio);
                        const isClashing = clashingSectionIds.has(section.id);
                        const clashClasses = isClashing
                          ? "bg-destructive text-destructive-foreground border border-destructive/70 ring-2 ring-destructive/60"
                          : `border-2 border-transparent ${slotColors.bg} ${slotColors.text}`;
                        return (
                      <div
                        key={`${section.id}-${day.key}`}
                            className={`absolute left-1 right-1 cursor-pointer rounded-md px-1.5 py-1 text-[10px] font-semibold shadow transition-all hover:border-blue-500/50 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${clashClasses}`}
                        style={{
                          top: ((start - startHour * 60) / 60) * hourHeight,
                          height: ((end - start) / 60) * hourHeight,
                          zIndex: isClashing ? 10 : 1,
                        }}
                            role="button"
                            tabIndex={0}
                            onClick={() => onShowDetails({ course, section })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onShowDetails({ course, section });
                              }
                            }}
                      >
                        <p className="truncate text-current">
                          {course.course_code}
                          <span className="ml-1 opacity-80">{section.section_code}</span>
                        </p>
                        {section.faculty && (
                          <p className="truncate text-[9px] text-current opacity-80">
                            {truncateFaculty(section.faculty)}
                          </p>
                        )}
                        <p className="text-[9px] text-current opacity-80">
                          {formatSectionProbability(section)}
                        </p>
                      </div>
                        );
                      })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SectionSelectorBar = ({
  schedule,
  onSelect,
  selecting,
  loadingSections,
  activeCourseId,
}: {
  schedule: PlannerSchedule;
  onSelect: MutationRef<SelectArgs>;
  selecting: boolean;
  loadingSections: Record<number, boolean>;
  activeCourseId: number | null;
}) => {
  if (!schedule.courses.length) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-4 text-sm text-muted-foreground">
        Add courses to start selecting time slots.
      </div>
    );
  }

  const activeCourse = activeCourseId
    ? schedule.courses.find((course) => course.id === activeCourseId)
    : schedule.courses[0];

  if (!activeCourse) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-4 text-sm text-muted-foreground">
        Add courses to start selecting time slots.
      </div>
    );
  }

  const hasSections = activeCourse.sections.length > 0;
  const isLoading = Boolean(loadingSections[activeCourse.id]);
  const sectionGroups = groupSectionsByType(activeCourse.sections);

  return (
    <div className="rounded-lg bg-card/70 p-4">
      {sectionGroups.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
          {isLoading
            ? "Pulling sections from registrar..."
                : "Use the global refresh to fetch registrar sections."}
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {sectionGroups.map((group) => {
            const selectedSectionId =
              group.sections.find((section) => section.is_selected)?.id ?? "";
            return (
              <div key={`${activeCourse.id}-${group.typeKey}`} className="w-[200px] flex-shrink-0">
                <Select
                  value={selectedSectionId ? String(selectedSectionId) : undefined}
                  onValueChange={(value) => {
                    if (!schedule.id) return;
                    const sectionId = value === "__clear__" ? 0 : Number(value);
                    const nextIds = computeNextSectionSelection(
                      activeCourse.sections,
                      group.typeKey,
                      sectionId,
                    );
                    onSelect.mutate({
                      courseId: activeCourse.id,
                      sectionIds: nextIds,
                    });
                  }}
                  disabled={!hasSections || selecting || isLoading}
                >
                  <SelectTrigger className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-xs shadow-sm focus:ring-2 focus:ring-ring">
                    <SelectValue placeholder={isLoading ? "Loading..." : "Select a slot"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__clear__">
                      {isLoading ? "Loading..." : "Select a slot"}
                    </SelectItem>
                    {group.sections.map((section) => {
                      const facultyDisplay = section.faculty
                        ? ` · ${truncateFaculty(section.faculty)}`
                        : "";
                      return (
                        <SelectItem key={section.id} value={String(section.id)}>
                          {`${section.section_code || "Section"} · ${section.days} ${
                            section.times
                          }${facultyDisplay}`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface SectionDetailModalProps {
  sectionEvent: SectionEvent;
  onClose: () => void;
}

const SectionDetailModal = ({ sectionEvent, onClose }: SectionDetailModalProps) => {
  const { course, section } = sectionEvent;
  const selected = section.selected_count ?? 0;
  const enrolled = section.enrollment_snapshot ?? 0;
  const capacity = section.capacity ?? 0;
  const demandRatio = computeDemandRatio(section);
  const demandLabel = getDemandLabel(demandRatio);
  const showBar = capacity > 0;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-lg overflow-auto rounded-2xl border border-border/60 bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "calc(100vh - 2rem)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">{course.course_code}</p>
            <h2 className="text-xl font-bold">{section.section_code}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Days</span>
            <span className="font-medium text-foreground">
              <DayIndicators days={section.days} />
            </span>
          </div>
          <DetailRow label="Time" value={section.times || "N/A"} />
          <DetailRow label="Room" value={section.room || "TBD"} />
          <DetailRow label="Faculty" value={section.faculty || "TBD"} />
        </div>
        {showBar && (
          <DemandBar capacity={capacity} picked={selected} enrolled={enrolled} />
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          Picked counts number of students who have selected this section.
        </p>
      </div>
    </div>,
    document.body
  );
};

interface CourseRequirementModalProps {
  details: CourseRequirementDetail;
  onClose: () => void;
}

const CourseRequirementModal = ({ details, onClose }: CourseRequirementModalProps) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const requirementRows = [
    { label: "Prerequisite", value: details.preReq },
    { label: "Corequisite", value: details.coReq },
    { label: "Antirequisite", value: details.antiReq },
  ];

  const priorityRows = [
    { label: "Priority 1", value: details.priority_1 },
    { label: "Priority 2", value: details.priority_2 },
    { label: "Priority 3", value: details.priority_3 },
    { label: "Priority 4", value: details.priority_4 },
  ];

  const formatValue = (value?: string | null) => value?.trim() || "—";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-lg rounded-2xl border border-border/60 bg-card shadow-lg flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "calc(100vh - 2rem)" }}
      >
        <div className="flex items-center justify-between p-6 pb-4 border-b border-border/40">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">{details.heading}</p>
            {details.subheading && <h2 className="text-xl font-bold">{details.subheading}</h2>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="overflow-y-auto p-6 pt-4 flex-1">
          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Priorities
              </h3>
              <div className="rounded-xl border border-border/60 bg-muted/10 text-xs">
                {priorityRows.map((row, index) => (
                  <div
                    key={row.label}
                    className={`space-y-1 px-3 py-3 ${
                      index !== priorityRows.length - 1 ? "border-b border-border/40" : ""
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {row.label}
                    </p>
                    <p className="text-xs font-medium text-foreground break-words whitespace-pre-wrap">
                      {formatValue(row.value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Requisites
              </h3>
              <div className="rounded-xl border border-border/60 bg-muted/10 text-xs">
                {requirementRows.map((row, index) => (
                  <div
                    key={row.label}
                    className={`space-y-1 px-3 py-3 ${
                      index !== requirementRows.length - 1 ? "border-b border-border/40" : ""
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {row.label}
                    </p>
                    <p className="text-xs font-medium text-foreground break-words whitespace-pre-wrap">
                      {formatValue(row.value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

const DemandBar = ({
  capacity,
  picked,
  enrolled,
}: {
  capacity: number;
  picked: number;
  enrolled: number;
}) => {
  const safePicked = Math.max(0, Math.min(picked, capacity));
  const safeEnrolled = Math.max(0, Math.min(enrolled, capacity));
  const pickedPercent = capacity > 0 ? (safePicked / capacity) * 100 : 0;
  const enrolledPercent = capacity > 0 ? (safeEnrolled / capacity) * 100 : 0;
  return (
    <div className="mt-6 space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4 text-xs">
      <div className="relative h-3 rounded-full bg-muted">
        <div
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary shadow"
          style={{ left: `${pickedPercent}%`, top: "50%" }}
        />
        <div
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-muted-foreground/70 shadow"
          style={{ left: `${enrolledPercent}%`, top: "50%" }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-primary" />
          <span className="text-foreground">Picked {picked}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/70" />
          <span className="text-foreground">Enrolled {enrolled}</span>
        </div>
        <span className="ml-auto text-foreground">Capacity {capacity}</span>
      </div>
    </div>
  );
};

const dayOrder = ["M", "T", "W", "R", "F", "S"];

const DayIndicators = ({ days }: { days: string | null }) => {
  const active = new Set((days ?? "").toUpperCase().split(""));
  return (
    <div className="flex gap-1">
      {dayOrder.map((day) => (
        <span
          key={day}
          className={`flex h-6 w-6 items-center justify-center rounded text-[10px] ${
            active.has(day) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          {day}
        </span>
      ))}
    </div>
  );
};

function computeDemandRatio(section: PlannerSection): number {
  const capacity = section.capacity ?? Number.POSITIVE_INFINITY;
  if (!isFinite(capacity) || capacity <= 0) {
    return 0;
  }
  const selected = section.selected_count ?? 0;
  const enrolled = section.enrollment_snapshot ?? 0;
  const demand = Math.max(selected, enrolled);
  return demand / capacity;
}

function getDemandClasses(ratio: number): { bg: string; text: string } {
  if (ratio >= 1.0) {
    return { bg: "bg-destructive/30 hover:bg-destructive/40", text: "text-destructive-foreground" };
  }
  if (ratio >= 0.75) {
    return { bg: "bg-amber-200/70 hover:bg-amber-200/80", text: "text-amber-950" };
  }
  if (ratio >= 0.5) {
    return { bg: "bg-primary/20 hover:bg-primary/30", text: "text-primary-900" };
  }
  return { bg: "bg-blue-500/20 hover:bg-blue-500/30", text: "text-blue-900 dark:text-blue-100" };
}

function calculateSectionProbability(section: PlannerSection): number {
  const picked = section.selected_count ?? 0;
  const enrolled = section.enrollment_snapshot ?? 0;
  const capacity = section.capacity ?? Number.POSITIVE_INFINITY;
  
  if (!isFinite(capacity) || capacity <= 0) {
    return 1.0; // If no capacity info, assume 100% probability
  }
  
  const demand = Math.max(picked, enrolled);
  // Probability of successfully registering = available spots / total capacity
  const availableSpots = Math.max(0, capacity - demand);
  return Math.min(availableSpots / capacity, 1.0); // Cap at 100%
}

function formatSectionProbability(section: PlannerSection): string {
  const probability = calculateSectionProbability(section);
  return `${Math.round(probability * 100)}%`;
}

function calculateOverallScheduleProbability(events: SectionEvent[]): number {
  if (events.length === 0) return 0;
  
  const probabilities = events.map(({ section }) => calculateSectionProbability(section));
  // Overall probability is the product of all section probabilities
  return probabilities.reduce((acc, prob) => acc * prob, 1.0);
}

function truncateFaculty(faculty: string | null | undefined): string {
  if (!faculty) return "";
  const maxLength = 24;
  const trimmed = faculty.trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}…` : trimmed;
}

function getDemandLabel(ratio: number): string {
  if (ratio >= 1.0) return "Over capacity";
  if (ratio >= 0.75) return "High demand";
  if (ratio >= 0.5) return "Moderate demand";
  return "Low demand";
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

function formatHour(value: number): string {
  const suffix = value >= 12 ? "PM" : "AM";
  const hour = ((value + 11) % 12) + 1;
  return `${hour} ${suffix}`;
}

type SectionGroup = {
  typeKey: string;
  label: string;
  sections: PlannerSection[];
};

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

function getSectionTypeKey(sectionCode?: string | null): string {
  if (!sectionCode) return "SECTION";
  const letters = sectionCode.replace(/[\d\s]+/g, "").toUpperCase();
  return letters || "SECTION";
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
  return dictionary[typeKey] ?? typeKey;
}

