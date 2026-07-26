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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { gradeStatisticsApi } from '../api/grade-statistics-api';
import { ApiError } from "@/utils/api";
import {
  PlannerAutoBuildResponse,
  PlannerCourse,
  PlannerSection,
  PlannerSchedule,
  PlannerCourseAddPayload,
  PlannerCourseSearchResult,
} from "../types";
import { SignInCard } from "@/components/molecules/sign-in-card";
import { CalendarPlus, ChevronDown, ClipboardCopy, Copy, Loader2, Plus, Pencil, RefreshCcw, RotateCcw, Trash2, Wand2, X } from "lucide-react";
import { ConfirmationModal } from './confirmation-modal';
import { useSyllabusLinks } from '../utils/use-syllabus-links';
import { toast } from "@/hooks/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const formatPlanCourseCount = (count: number) => {
  if (count === 0) return "No courses yet";
  return count === 1 ? "1 course" : `${count} courses`;
};

const formatScheduleShortlist = (schedule: PlannerSchedule | null): string => {
  if (!schedule?.courses?.length) return "";
  return schedule.courses
    .map((course) => {
      const selectedCodes = course.sections
        .filter((section) => section.is_selected)
        .map((section) => section.section_code)
        .filter(Boolean);
      if (!selectedCodes.length) return null;
      return `${course.course_code} ${selectedCodes.join(" | ")}`;
    })
    .filter(Boolean)
    .join("\n");
};

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
const normalizeCourseQuery = (raw: string) => {
  const map: Record<string, string> = {
    // Russian keyboard layout -> Latin
    "й": "q",
    "ц": "w",
    "у": "e",
    "к": "r",
    "е": "t",
    "н": "y",
    "г": "u",
    "ш": "i",
    "щ": "o",
    "з": "p",
    "х": "[",
    "ъ": "]",
    "ф": "a",
    "ы": "s",
    "в": "d",
    "а": "f",
    "п": "g",
    "р": "h",
    "о": "j",
    "л": "k",
    "д": "l",
    "ж": ";",
    "э": "'",
    "я": "z",
    "ч": "x",
    "с": "c",
    "м": "v",
    "и": "b",
    "т": "n",
    "ь": "m",
    "б": ",",
    "ю": ".",
    // Kazakh-specific letters on the Kazakh layout (positions mirror QWERTY)
    "ұ": "o",
    "қ": "p",
    "ө": "[",
    "һ": "]",
    "і": "b",
    "ү": ",",
    "ң": ".",
    "ғ": "/",
  };
  return raw
    .split("")
    .map((ch) => {
      const lower = ch.toLowerCase();
      if (map[lower]) {
        const mapped = map[lower];
        return ch === lower ? mapped : mapped.toUpperCase();
      }
      return ch;
    })
    .join("")
    .toUpperCase()
    .trim();
};
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
  user: User | null;
}

export const ScheduleBuilderTab = ({ user }: ScheduleBuilderTabProps) => {
  const queryClient = useQueryClient();
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const schedulesQuery = useQuery({
    queryKey: ["plannerSchedules"],
    queryFn: gradeStatisticsApi.listPlannerSchedules,
    enabled: Boolean(user),
  });
  const plannerQuery = useQuery({
    queryKey: ["plannerSchedule", selectedScheduleId],
    queryFn: () => gradeStatisticsApi.getPlannerSchedule(selectedScheduleId ?? undefined),
    enabled: Boolean(user) && selectedScheduleId != null,
  });
  const semestersQuery = useQuery({
    queryKey: ["plannerSemesters"],
    queryFn: gradeStatisticsApi.getPlannerSemesters,
  });

  const [courseForm, setCourseForm] = useState<CourseForm>(defaultCourseForm);
  const [loadingSections, setLoadingSections] = useState<Record<number, boolean>>({});
  const autoBuildUndoSnapshot = useRef<Record<number, number[]> | null>(null);
  const [searchResults, setSearchResults] = useState<PlannerCourseSearchResult[]>([]);
  const [searchCursor, setSearchCursor] = useState<number | null>(null);
  const [lastSearch, setLastSearch] = useState<{ term_value: string; query: string } | null>(
    null,
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const searchResultsListRef = useRef<HTMLDivElement | null>(null);
  const searchLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const { getLinkForCode: getSyllabusLink } = useSyllabusLinks("/data/course_links.csv");
  const [activeSection, setActiveSection] = useState<SectionEvent | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [activeRequirements, setActiveRequirements] = useState<CourseRequirementDetail | null>(null);
  const [activeCourseId, setActiveCourseId] = useState<number | null>(null);
  const autoFetchedCourses = useRef<Set<number>>(new Set());
  const planner = plannerQuery.data ?? null;
  const scheduleVariants = schedulesQuery.data?.items ?? [];
  const selectedPlanName = useMemo(() => {
    if (selectedScheduleId == null) return null;
    return (
      scheduleVariants.find((variant) => variant.id === selectedScheduleId)?.name ??
      planner?.name ??
      null
    );
  }, [selectedScheduleId, scheduleVariants, planner?.name]);
  const scheduleLimitReached =
    (schedulesQuery.data?.count ?? 0) >= (schedulesQuery.data?.max_allowed ?? 5);
  const canDeleteSchedule = scheduleVariants.length > 1;
  const currentTermValue = courseForm.term_value;
  const invalidatePlanner = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["plannerSchedules"] });
    if (selectedScheduleId != null) {
      void queryClient.invalidateQueries({ queryKey: ["plannerSchedule", selectedScheduleId] });
    }
  }, [queryClient, selectedScheduleId]);

  useEffect(() => {
    const items = schedulesQuery.data?.items;
    if (!items?.length) return;
    if (selectedScheduleId == null || !items.some((item) => item.id === selectedScheduleId)) {
      setSelectedScheduleId(items[0].id);
    }
  }, [schedulesQuery.data, selectedScheduleId]);

  const handleScheduleChange = useCallback((value: string) => {
    const scheduleId = Number(value);
    if (!Number.isFinite(scheduleId)) return;
    setSelectedScheduleId(scheduleId);
  }, []);

  const handleCopyShortlist = useCallback(async () => {
    const text = formatScheduleShortlist(planner);
    if (!text) {
      toast({
        variant: "error",
        title: "Nothing to copy",
        description: "Select at least one section in this plan first.",
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast({
        variant: "success",
        title: "Copied as text",
        description: "Paste it somewhere handy for registration.",
      });
    } catch {
      toast({
        variant: "error",
        title: "Copy failed",
        description: "Could not access the clipboard.",
      });
    }
  }, [planner]);

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
    setLoadingSections({});
    setSearchResults([]);
    setSearchCursor(null);
    setLastSearch(null);
    setIsLoadingMore(false);
    autoBuildUndoSnapshot.current = null;
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

  const capturePlannerSelections = useCallback((schedule: PlannerSchedule | null) => {
    if (!schedule) return {};
    return Object.fromEntries(
      schedule.courses.map((course) => [
        course.id,
        course.sections.filter((section) => section.is_selected).map((section) => section.id),
      ]),
    );
  }, []);

  const restorePlannerSelections = useCallback(
    async (snapshot: Record<number, number[]>) => {
      await Promise.all(
        Object.entries(snapshot).map(([courseId, sectionIds]) =>
          gradeStatisticsApi.selectPlannerSections(Number(courseId), {
            section_ids: sectionIds,
          }),
        ),
      );
      await invalidatePlanner();
    },
    [invalidatePlanner],
  );

  const addCourseMutation = useMutation({
    mutationFn: (payload: PlannerCourseAddPayload) =>
      gradeStatisticsApi.addPlannerCourse(payload, selectedScheduleId ?? undefined),
    onSuccess: (_data, variables) => {
      toast({
        variant: "success",
        title: `${variables.course_code} added`,
        description: "Course added to your planner.",
      });
      invalidatePlanner();
    },
    onError: () => {
      toast({
        variant: "error",
        title: "Could not add course",
        description: "Please try again.",
      });
    },
  });

  const removeCourseMutation = useMutation({
    mutationFn: (courseId: number) => gradeStatisticsApi.removePlannerCourse(courseId),
    onSuccess: (_data, courseId) => {
      const courseLabel =
        planner?.courses?.find((c) => c.id === courseId)?.course_code ?? "Course";
      toast({
        variant: "success",
        title: `${courseLabel} removed`,
        description: "Course removed from your planner.",
      });
      invalidatePlanner();
    },
    onError: () => {
      toast({
        variant: "error",
        title: "Remove failed",
        description: "Please try again.",
      });
    },
  });

  const refreshAllCoursesMutation = useMutation({
    mutationFn: () => gradeStatisticsApi.refreshPlannerCourses(selectedScheduleId ?? undefined),
    onMutate: () => {
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
      toast({
        variant: "success",
        title: "Courses refreshed",
        description: "Loaded latest registrar data.",
      });
      invalidatePlanner();
    },
    onError: () => {
      toast({
        variant: "error",
        title: "Refresh failed",
        description: "Please try again.",
      });
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
    mutationFn: () => gradeStatisticsApi.autoBuildPlanner(selectedScheduleId ?? undefined),
    onMutate: () => {
      autoBuildUndoSnapshot.current = capturePlannerSelections(planner);
    },
    onSuccess: (result: PlannerAutoBuildResponse) => {
      const snapshot = autoBuildUndoSnapshot.current;
      const description = result.unscheduled_courses.length
        ? `${result.message} Couldn't place: ${result.unscheduled_courses.join(", ")}.`
        : result.message;

      toast({
        variant: "success",
        title: "Schedule auto-built",
        description,
        duration: 8000,
        action: snapshot
          ? {
              label: "Undo",
              onClick: () => {
                void restorePlannerSelections(snapshot)
                  .then(() => {
                    autoBuildUndoSnapshot.current = null;
                    toast({
                      title: "Auto-build undone",
                      description: "Restored your previous section selections.",
                    });
                  })
                  .catch(() => {
                    toast({
                      variant: "error",
                      title: "Undo failed",
                      description: "Please try again.",
                    });
                  });
              },
            }
          : undefined,
      });
      invalidatePlanner();
    },
    onError: (error) => {
      autoBuildUndoSnapshot.current = null;
      toast({
        variant: "error",
        title: "Auto-build failed",
        description: error instanceof Error ? error.message : "Shuffle failed.",
      });
    },
  });

  const resetPlannerMutation = useMutation({
    mutationFn: (termValue?: string) =>
      gradeStatisticsApi.resetPlanner(termValue, selectedScheduleId ?? undefined),
    onSuccess: invalidatePlanner,
  });

  const createScheduleMutation = useMutation({
    mutationFn: () => gradeStatisticsApi.createPlannerSchedule(),
    onSuccess: (summary) => {
      setSelectedScheduleId(summary.id);
      toast({
        variant: "success",
        title: "New plan created",
        description: `"${summary.name}" is ready.`,
      });
      invalidatePlanner();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.response.status === 409) {
        toast({
          variant: "error",
          title: "Plan limit reached",
          description: `You can save up to ${schedulesQuery.data?.max_allowed ?? 5} schedule plans.`,
        });
        return;
      }
      toast({
        variant: "error",
        title: "Could not create plan",
        description: "Please try again.",
      });
    },
  });

  const duplicateScheduleMutation = useMutation({
    mutationFn: () =>
      gradeStatisticsApi.duplicatePlannerSchedule(selectedScheduleId as number),
    onSuccess: (summary) => {
      setSelectedScheduleId(summary.id);
      toast({
        variant: "success",
        title: "Plan duplicated",
        description: `"${summary.name}" created from your current plan.`,
      });
      invalidatePlanner();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.response.status === 409) {
        toast({
          variant: "error",
          title: "Plan limit reached",
          description: `You can save up to ${schedulesQuery.data?.max_allowed ?? 5} schedule plans.`,
        });
        return;
      }
      toast({
        variant: "error",
        title: "Could not duplicate plan",
        description: "Please try again.",
      });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: () => gradeStatisticsApi.deletePlannerSchedule(selectedScheduleId as number),
    onSuccess: () => {
      setSelectedScheduleId(null);
      toast({
        variant: "success",
        title: "Plan deleted",
        description: "The schedule variant was removed.",
      });
      invalidatePlanner();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.response.status === 409) {
        toast({
          variant: "error",
          title: "Cannot delete plan",
          description: "At least one schedule plan must remain.",
        });
        return;
      }
      toast({
        variant: "error",
        title: "Could not delete plan",
        description: "Please try again.",
      });
    },
  });

  const renameScheduleMutation = useMutation({
    mutationFn: (name: string) =>
      gradeStatisticsApi.updatePlannerSchedule(selectedScheduleId as number, { name }),
    onSuccess: (summary) => {
      toast({
        variant: "success",
        title: "Plan renamed",
        description: `Now called "${summary.name}".`,
      });
      invalidatePlanner();
    },
    onError: () => {
      toast({
        variant: "error",
        title: "Could not rename plan",
        description: "Please try again.",
      });
    },
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
  };

  // Live search on typing (debounced)
  const searchDebounce = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!planner || !courseForm.term_value) return;
    const query = normalizeCourseQuery(courseForm.query);
    if (!query) {
      setSearchResults([]);
      setSearchCursor(null);
      setLastSearch(null);
      return;
    }
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      performSearch(
        { term_value: courseForm.term_value, query, page: 1 },
        { append: false },
      );
    }, 250);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [courseForm.query, courseForm.term_value, planner]);

  useEffect(() => {
    const sentinel = searchLoadMoreRef.current;
    const root = searchResultsListRef.current;
    if (!sentinel || !root || !searchCursor || !lastSearch) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (isLoadingMore || courseSearchMutation.isPending) return;
        setIsLoadingMore(true);
        performSearch(
          {
            term_value: lastSearch.term_value,
            query: lastSearch.query,
            page: searchCursor,
          },
          { append: true },
        );
      },
      { root, rootMargin: "80px", threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    searchCursor,
    lastSearch,
    isLoadingMore,
    courseSearchMutation.isPending,
    searchResults.length,
  ]);

  const searchError =
    courseSearchMutation.isError && courseSearchMutation.error instanceof Error
      ? courseSearchMutation.error.message
      : courseSearchMutation.isError
        ? "Unable to search courses"
        : null;
  const isSearchPending = courseSearchMutation.isPending && !isLoadingMore;
  const activeSearchQuery = normalizeCourseQuery(courseForm.query);

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

  if (plannerQuery.isLoading || schedulesQuery.isLoading || selectedScheduleId == null) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading planner...
      </div>
    );
  }

  if (!user) {
    return (
      <SignInCard
        icon={<CalendarPlus className="h-6 w-6" aria-hidden="true" />}
        title="Sign in to build your schedule"
        description="We will save your schedule for you in your account."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <aside className="w-full min-w-0 shrink-0 space-y-4 xl:w-72">
        <section className="min-w-0 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Find a course</h3>
            {(courseForm.term_label || courseForm.term_value) && (
              <Badge variant="secondary" className="font-normal">
                {courseForm.term_label || courseForm.term_value}
              </Badge>
            )}
          </div>
          <div className="relative mt-3 min-w-0 space-y-2">
            <form className="space-y-2" onSubmit={handleSearchSubmit}>
              <Input
                placeholder="Search by code (e.g., MATH 161)"
                value={courseForm.query}
                onChange={(e) =>
                  setCourseForm((prev) => ({
                    ...prev,
                    query: e.target.value,
                  }))
                }
                disabled={!planner}
              />
            </form>
            {searchError && (
              <p className="text-xs text-destructive">{searchError}</p>
            )}
            {activeSearchQuery && (
              <div className="absolute left-0 right-0 top-full z-20 mt-2 min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card shadow-lg">
                <div
                  ref={searchResultsListRef}
                  className="max-h-80 overflow-x-hidden overflow-y-auto text-sm scroll-thin"
                >
                  {isSearchPending && searchResults.length === 0 ? (
                    <p className="flex items-center gap-2 px-3 py-4 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Searching registrar catalog...
                    </p>
                  ) : searchResults.length ? (
                    <>
                      {searchResults.map((result, index) => {
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
                        const syllabusLink = getSyllabusLink(result.course_code);
                        const alreadyAdded = isCourseAlreadyAdded(
                          result.course_code,
                          courseForm.term_value,
                        );
                        return (
                          <div
                            key={result.course_code}
                            className={
                              index > 0 ? "border-t border-border/60 px-3 py-3" : "px-3 py-3"
                            }
                          >
                            <div className="flex items-start gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold">{result.course_code}</p>
                                <p className="break-words text-xs text-muted-foreground">
                                  {result.title}
                                </p>
                                {metaParts.length > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    {metaParts.join(" · ")}
                                  </p>
                                )}
                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                                  {hasMeta && (
                                    <Button
                                      size="xs"
                                      variant="link"
                                      className="h-auto min-h-0 px-0 py-0 text-xs whitespace-normal"
                                      onClick={() => handleShowRequirementsFromSearch(result)}
                                    >
                                      Priorities & requisites
                                    </Button>
                                  )}
                                  {hasMeta && syllabusLink && (
                                    <span className="text-border" aria-hidden="true">
                                      |
                                    </span>
                                  )}
                                  <Button
                                    size="xs"
                                    variant="link"
                                    className="h-auto min-h-0 px-0 py-0 text-xs whitespace-normal"
                                    disabled={!syllabusLink}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (syllabusLink) {
                                        window.open(syllabusLink, "_blank");
                                      }
                                    }}
                                  >
                                    Syllabus
                                  </Button>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                className="shrink-0 self-start"
                                onClick={() => handleAddCourse(result.course_code)}
                                disabled={
                                  !planner ||
                                  !courseForm.term_value ||
                                  addCourseMutation.isPending ||
                                  alreadyAdded
                                }
                                variant={alreadyAdded ? "outline" : "default"}
                              >
                                {addCourseMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : alreadyAdded ? (
                                  "Added"
                                ) : (
                                  "Add"
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      {searchCursor ? (
                        <div
                          ref={searchLoadMoreRef}
                          className="flex items-center justify-center gap-2 border-t border-border/60 px-3 py-3 text-xs text-muted-foreground"
                          aria-hidden={!isLoadingMore}
                        >
                          {isLoadingMore ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Loading more
                            </>
                          ) : (
                            <span className="h-3.5" />
                          )}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p className="px-3 py-4 text-xs text-muted-foreground">
                      No results. Try another code.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="scroll-thin rounded-xl border border-border/60 bg-card p-4 shadow-sm max-h-[500px] overflow-y-auto overflow-x-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Courses</h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5">
                  Actions
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Course actions</DropdownMenuLabel>
                <DropdownMenuItem
                  className="items-start py-2"
                  disabled={!planner?.courses.length || refreshAllCoursesMutation.isPending}
                  onClick={() => refreshAllCoursesMutation.mutate()}
                >
                  {refreshAllCoursesMutation.isPending ? (
                    <Loader2 className="mt-0.5 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="mt-0.5 h-4 w-4" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium leading-none">Refresh courses</p>
                    <p className="mt-1 text-xs font-normal text-muted-foreground">
                      Reload section times and instructors from registrar.
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="items-start py-2"
                  disabled={!planner || autoBuildMutation.isPending}
                  onClick={() => autoBuildMutation.mutate()}
                >
                  {autoBuildMutation.isPending ? (
                    <Loader2 className="mt-0.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="mt-0.5 h-4 w-4" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium leading-none">Auto-build schedule</p>
                    <p className="mt-1 text-xs font-normal text-muted-foreground">
                      Build valid schedule without time clashes from your courses.
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  className="items-start py-2"
                  disabled={resetPlannerMutation.isPending}
                  onClick={() => setResetConfirmOpen(true)}
                >
                  <RotateCcw className="mt-0.5 h-4 w-4" />
                  <div className="min-w-0">
                    <p className="font-medium leading-none">Reset plan courses</p>
                    <p className="mt-1 text-xs font-normal opacity-80">
                      Remove all courses and clear selections in this plan.
                    </p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
                  getSyllabusLink={getSyllabusLink}
                />
              ))
            ) : (
              <p className="text-muted-foreground">
                {planner ? "Add a course to get started." : "Planner is still loading."}
              </p>
            )}
          </div>
        </section>
        </aside>

        <section className="w-full min-w-0 flex-1 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={!scheduleVariants.length}
                    className="h-auto max-w-full gap-1.5 px-2 py-1 text-base font-semibold hover:bg-accent/50"
                  >
                    <span className="truncate">{selectedPlanName ?? "Planner preview"}</span>
                    <ChevronDown className="size-4 shrink-0 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuLabel className="text-xs font-medium">
                    Schedule plans
                    {schedulesQuery.data
                      ? ` · ${schedulesQuery.data.count}/${schedulesQuery.data.max_allowed}`
                      : ""}
                  </DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={selectedScheduleId != null ? String(selectedScheduleId) : undefined}
                    onValueChange={handleScheduleChange}
                  >
                    {scheduleVariants.map((variant) => (
                      <DropdownMenuRadioItem
                        key={variant.id}
                        value={String(variant.id)}
                        className="items-start py-2"
                      >
                        <div className="flex min-w-0 flex-col gap-0.5 pr-6">
                          <span className="truncate leading-none">{variant.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatPlanCourseCount(variant.course_count)}
                          </span>
                        </div>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={scheduleLimitReached || createScheduleMutation.isPending}
                    onClick={() => createScheduleMutation.mutate()}
                  >
                    {createScheduleMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    New plan
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={
                      !selectedScheduleId ||
                      scheduleLimitReached ||
                      duplicateScheduleMutation.isPending
                    }
                    onClick={() => duplicateScheduleMutation.mutate()}
                  >
                    {duplicateScheduleMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!selectedScheduleId || renameScheduleMutation.isPending}
                    onClick={() => {
                      const currentName =
                        scheduleVariants.find((item) => item.id === selectedScheduleId)?.name ??
                        planner?.name ??
                        "";
                      const nextName = window.prompt("Rename schedule plan", currentName)?.trim();
                      if (!nextName || nextName === currentName) return;
                      renameScheduleMutation.mutate(nextName);
                    }}
                  >
                    {renameScheduleMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Pencil className="h-4 w-4" />
                    )}
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={!canDeleteSchedule || deleteScheduleMutation.isPending}
                    onClick={() => deleteScheduleMutation.mutate()}
                  >
                    {deleteScheduleMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Delete plan
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                disabled={!selectedEvents.length}
                onClick={() => {
                  void handleCopyShortlist();
                }}
              >
                <ClipboardCopy className="size-3.5" />
                Copy as text
              </Button>
              {selectedEvents.length > 0 && (
                <Badge
                  variant={hasClash ? "destructive" : "default"}
                  className="text-xs font-semibold"
                >
                  {hasClash ? "Clash" : "Fit"}
                </Badge>
              )}
            </div>
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
          {activeSection && (
            <SectionDetailModal
              sectionEvent={activeSection}
              onClose={() => setActiveSection(null)}
              onRemove={() => {
                const { course, section } = activeSection;
                const remainingSectionIds = course.sections
                  .filter((s) => s.is_selected && s.id !== section.id)
                  .map((s) => s.id);
                selectSectionMutation.mutate(
                  { courseId: course.id, sectionIds: remainingSectionIds },
                  { onSuccess: () => setActiveSection(null) },
                );
              }}
              removing={selectSectionMutation.isPending}
            />
          )}
        </section>
      </div>
      {activeRequirements && (
        <CourseRequirementModal
          details={activeRequirements}
          onClose={() => setActiveRequirements(null)}
        />
      )}
      <ConfirmationModal
        isOpen={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={() => resetPlannerMutation.mutate(undefined)}
        title="Reset planner?"
        description="This will clear all courses and selections in the current plan. This action cannot be undone."
        confirmText="Reset"
      />
    </div>
  );
};

const CourseCard = ({
  course,
  onRemove,
  onSelect,
  onShowMeta,
  isActive,
  getSyllabusLink,
}: {
  course: PlannerCourse;
  onRemove: MutationRef<RemoveArgs>;
  onSelect: (courseId: number) => void;
  onShowMeta: (course: PlannerCourse) => void;
  isActive: boolean;
  getSyllabusLink: (code?: string | null) => string | undefined;
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
  const syllabusLink = useMemo(
    () => getSyllabusLink(course.course_code),
    [course.course_code, getSyllabusLink],
  );

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
      className={`rounded-lg border p-3 outline-none transition focus-visible:ring-2 focus-visible:ring-primary ${isActive ? "border-primary bg-primary/5" : "border-border/60 bg-card"
        }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{course.course_code}</p>
          {course.title && (
            <p className="text-xs text-muted-foreground">{course.title}</p>
          )}
          {metaParts.length > 0 && (
            <p className="text-xs text-muted-foreground">{metaParts.join(" · ")}</p>
          )}
          <div className="flex items-center gap-2 text-xs">
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
            <span className="text-border">|</span>
            <Button
              size="xs"
              variant="link"
              className="px-0 text-xs"
              disabled={!syllabusLink}
              onClick={(event) => {
                event.stopPropagation();
                if (syllabusLink) {
                  window.open(syllabusLink, "_blank");
                }
              }}
            >
              Syllabus
            </Button>
          </div>
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
  const timedEvents = useMemo(
    () => events.filter(({ section }) => {
      const [start, end] = parseTimeRange(section.times);
      return start != null && end != null;
    }),
    [events],
  );

  // Grid spans at least the standard campus day (8 AM–10 PM), but widens to fit
  // any section outside that window instead of silently dropping it.
  const { startHour, endHour } = useMemo(() => {
    let minStart = 8 * 60;
    let maxEnd = 22 * 60;
    timedEvents.forEach(({ section }) => {
      const [start, end] = parseTimeRange(section.times);
      if (start != null) minStart = Math.min(minStart, start);
      if (end != null) maxEnd = Math.max(maxEnd, end);
    });
    return { startHour: Math.floor(minStart / 60), endHour: Math.ceil(maxEnd / 60) };
  }, [timedEvents]);

  const clashingSectionIds = useMemo(() => {
    const clashes = new Set<number>();
    const intervalsByDay: Record<string, Array<{ start: number; end: number; id: number }>> = {};
    timedEvents.forEach(({ section }) => {
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
  }, [timedEvents]);

  // Drop unused weekend columns so Mon–Fri get more width.
  const visibleDays = useMemo(() => {
    const used = new Set<string>();
    timedEvents.forEach(({ section }) => {
      for (const day of section.days || "") {
        used.add(day);
      }
    });
    const hasWeekend = used.has("S");
    return hasWeekend ? dayDefs : dayDefs.filter((day) => day.key !== "S");
  }, [timedEvents]);

  if (!schedule) {
    return (
      <div className="mt-6 flex h-64 items-center justify-center text-sm text-muted-foreground">
        Create a schedule to preview blocks.
      </div>
    );
  }

  const hasSections = schedule.courses.some((course) => course.sections.length);
  const hourHeight = 84;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, idx) => startHour + idx);
  const filteredEvents = timedEvents;
  const dayCount = visibleDays.length;
  const gridTemplateColumns = `64px repeat(${dayCount}, minmax(7.5rem, 1fr))`;
  const minGridWidth = 64 + dayCount * 120;

  return (
    <div className="mt-4 space-y-4">
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
        <>
        <div className="md:hidden">
          <ScheduleAgenda
            events={filteredEvents}
            clashingSectionIds={clashingSectionIds}
            onShowDetails={onShowDetails}
          />
        </div>
        <div className="hidden overflow-x-auto rounded-xl border border-border/60 bg-muted/10 p-3 scroll-thin md:block">
          <div style={{ minWidth: minGridWidth }}>
            <div
              className="grid gap-2 text-xs font-semibold"
              style={{ gridTemplateColumns }}
            >
              <div />
              {visibleDays.map((day) => (
                <div key={day.key} className="text-center text-muted-foreground">
                  {day.label}
                </div>
              ))}
            </div>
            <div
              className="relative mt-2 grid gap-2"
              style={{
                gridTemplateColumns,
                height: hours.length * hourHeight,
              }}
            >
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
              {visibleDays.map((day) => (
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
                          className={`absolute inset-x-1 cursor-pointer overflow-hidden rounded-md px-2 py-1 text-[11px] font-semibold shadow transition-all hover:border-primary/50 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${clashClasses}`}
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
                            <p className="truncate text-[10px] text-current opacity-80">
                              {truncateFaculty(section.faculty)}
                            </p>
                          )}
                          {section.room && (
                            <p className="truncate text-[10px] text-current opacity-80">
                              {truncateRoom(section.room)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
};

const ScheduleAgenda = ({
  events,
  clashingSectionIds,
  onShowDetails,
}: {
  events: SectionEvent[];
  clashingSectionIds: Set<number>;
  onShowDetails: (sectionEvent: SectionEvent) => void;
}) => {
  const daysWithEvents = dayDefs.filter((day) =>
    events.some(({ section }) => section.days.includes(day.key)),
  );
  const [selectedDay, setSelectedDay] = useState(daysWithEvents[0]?.key ?? dayDefs[0].key);

  useEffect(() => {
    if (!daysWithEvents.some((d) => d.key === selectedDay) && daysWithEvents[0]) {
      setSelectedDay(daysWithEvents[0].key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  const dayEvents = events
    .filter(({ section }) => section.days.includes(selectedDay))
    .map((event) => ({ event, start: parseTimeRange(event.section.times)[0] ?? 0 }))
    .sort((a, b) => a.start - b.start)
    .map(({ event }) => event);

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1 scroll-thin">
        {dayDefs.map((day) => {
          const hasEvents = daysWithEvents.some((d) => d.key === day.key);
          return (
            <button
              key={day.key}
              type="button"
              disabled={!hasEvents}
              onClick={() => setSelectedDay(day.key)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                selectedDay === day.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : hasEvents
                    ? "border-border/60 bg-card text-foreground hover:bg-muted"
                    : "border-border/30 bg-card text-muted-foreground/40"
              }`}
            >
              {day.label}
            </button>
          );
        })}
      </div>

      {dayEvents.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-xl border border-border/60 bg-muted/10 text-sm text-muted-foreground">
          No sections on this day.
        </div>
      ) : (
        <div className="space-y-2">
          {dayEvents.map(({ course, section }) => {
            const demandRatio = computeDemandRatio(section);
            const slotColors = getDemandClasses(demandRatio);
            const isClashing = clashingSectionIds.has(section.id);
            return (
              <div
                key={section.id}
                role="button"
                tabIndex={0}
                onClick={() => onShowDetails({ course, section })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onShowDetails({ course, section });
                  }
                }}
                className={`cursor-pointer rounded-xl border p-3 shadow-sm transition-colors ${
                  isClashing
                    ? "border-destructive/70 bg-destructive text-destructive-foreground ring-2 ring-destructive/60"
                    : `border-border/60 ${slotColors.bg} ${slotColors.text}`
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-current">
                    {course.course_code}
                    <span className="ml-1.5 opacity-80">{section.section_code}</span>
                  </p>
                  {section.times && (
                    <span className="shrink-0 text-xs font-medium text-current opacity-90">
                      {section.times}
                    </span>
                  )}
                </div>
                {section.faculty && (
                  <p className="mt-1 truncate text-xs text-current opacity-80">{section.faculty}</p>
                )}
                {section.room && (
                  <p className="truncate text-xs text-current opacity-80">{section.room}</p>
                )}
              </div>
            );
          })}
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
                          {`${section.section_code || "Section"} · ${section.days} ${section.times
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
  onRemove: () => void;
  removing: boolean;
}

const SectionDetailModal = ({ sectionEvent, onClose, onRemove, removing }: SectionDetailModalProps) => {
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
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">
              {course.course_code}
              <span className="ml-1.5 font-normal">{section.section_code}</span>
            </p>
            <h2 className="text-xl font-bold leading-tight">{course.title || course.course_code}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Days & time</span>
            <span className="flex items-center gap-2 font-medium text-foreground">
              <DayIndicators days={section.days} />
              {section.times || "N/A"}
            </span>
          </div>
          <DetailRow label="Room" value={section.room || "TBD"} />
          <DetailRow label="Faculty" value={section.faculty || "TBD"} />
        </div>
        {showBar && (
          <DemandBar capacity={capacity} picked={selected} enrolled={enrolled} />
        )}
        <Button
          variant="outline"
          className="mt-4 w-full text-destructive hover:text-destructive"
          onClick={onRemove}
          disabled={removing}
        >
          {removing ? "Removing…" : "Remove this section"}
        </Button>
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
                    className={`space-y-1 px-3 py-3 ${index !== priorityRows.length - 1 ? "border-b border-border/40" : ""
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
                    className={`space-y-1 px-3 py-3 ${index !== requirementRows.length - 1 ? "border-b border-border/40" : ""
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
  const markersOverlap = Math.abs(pickedPercent - enrolledPercent) < 4;
  return (
    <div className="mt-6 space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4 text-xs">
      <div className="relative h-3 rounded-full bg-muted">
        <div
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary shadow"
          style={{ left: `${pickedPercent}%`, top: markersOverlap ? "35%" : "50%" }}
        />
        <div
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 border-background bg-muted-foreground/70 shadow"
          style={{ left: `${enrolledPercent}%`, top: markersOverlap ? "65%" : "50%" }}
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
          className={`flex h-6 w-6 items-center justify-center rounded text-[10px] ${active.has(day) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
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
    return {
      bg: "bg-destructive/40 hover:bg-destructive/50 dark:bg-destructive/30 dark:hover:bg-destructive/40",
      text: "text-destructive-foreground",
    };
  }
  if (ratio >= 0.75) {
    return {
      bg: "bg-warning/40 hover:bg-warning/50 dark:bg-warning/25 dark:hover:bg-warning/35",
      text: "text-warning-foreground",
    };
  }
  if (ratio >= 0.5) {
    return {
      bg: "bg-primary/30 hover:bg-primary/40 dark:bg-primary/20 dark:hover:bg-primary/30",
      text: "text-primary",
    };
  }
  return { bg: "bg-secondary/60 hover:bg-secondary/80", text: "text-secondary-foreground" };
}

function truncateFaculty(faculty: string | null | undefined): string {
  if (!faculty) return "";
  const maxLength = 24;
  const trimmed = faculty.trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}…` : trimmed;
}

function truncateRoom(room: string | null | undefined): string {
    if (!room) {
        return "";
    }
    if (room.includes("-")) {
        return room.split("-")[0];
    }
    return room.split(/( |cap)/g)[0]
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
