"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { cn } from "@/utils/utils";
import { GradeStatisticsCard } from "../components/GradeStatisticsCard";
import { RegisteredCourseCard } from "../components/RegisteredCourseCard";
import {
  BaseCourseItem,
  CourseItemCreate,
  GradeStatistics,
  RegisteredCourse,
  RegistrarSyncResponse,
  ScheduleResponse,
  SemesterOption,
  StudentScheduleResponse,
  TemplateResponse,
} from "../types";
import { SearchableInfiniteList } from "@/components/virtual/SearchableInfiniteList";
import { usePreSearchGrades } from "../api/hooks/usePreSearchGrades";
import {
  BarChart3,
  CalendarClock,
  CalendarDays,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Info,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import MotionWrapper from "@/components/atoms/motion-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import { gradeStatisticsApi } from "../api/gradeStatisticsApi";
import {
  calculateTotalGPA,
  calculateMaxPossibleTotalGPA,
  calculateProjectedTotalGPA,
  hasCompleteScore,
  formatGPA,
  getGPAColorClass,
} from "../utils/gradeUtils";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms/tabs";
import { useUser } from "@/hooks/use-user";
import { Modal } from "@/components/atoms/modal";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { ToggleGroup, ToggleGroupItem } from "@/components/atoms/toggle-group";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/atoms/sheet";
import { Skeleton } from "@/components/atoms/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/atoms/avatar";
import {
  buildTemplateCreatePayload,
  canShareTemplate,
  calculateTemplateCoverage,
  sortTemplatesByRecency,
  calculateTemplateWeight,
  buildTemplateUpdatePayload,
  canUpdateTemplate,
} from "../utils/templateUtils";
import { useToast } from "@/hooks/use-toast";
import { SynchronizeCoursesControl } from "../components/SynchronizeCoursesControl";
import { ScheduleDialog } from "../components/ScheduleDialog";
import { formatDistanceToNow, parseISO } from "date-fns";

export default function GradeStatisticsPage() {
  const [selected, setSelected] = useState<GradeStatistics[]>([]);
  // Live GPA state
  const [registeredCourses, setRegisteredCourses] = useState<RegisteredCourse[]>([]);
  const [selectedRegisteredCourse, setSelectedRegisteredCourse] = useState<RegisteredCourse | null>(null);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<BaseCourseItem | null>(null);
  const [itemToEdit, setItemToEdit] = useState<BaseCourseItem | null>(null);
  const [gpaMode, setGpaMode] = useState<'semester' | 'maxPossible' | 'projected'>('semester');
  const [hasFetched, setHasFetched] = useState(false);
  const [newItem, setNewItem] = useState<Partial<CourseItemCreate>>({
    item_name: "",
    total_weight_pct: null,
    obtained_score: null,
    max_score: null,
  });
  const [newItemInput, setNewItemInput] = useState<{ weight: string; max: string; obtained: string }>({
    weight: "",
    max: "",
    obtained: "",
  });
  const [semesters, setSemesters] = useState<SemesterOption[]>([]);
  const { user, login } = useUser();
  const { toast } = useToast();
  const [templateDrawerCourse, setTemplateDrawerCourse] = useState<RegisteredCourse | null>(null);
  const [isTemplateDrawerOpen, setIsTemplateDrawerOpen] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templates, setTemplates] = useState<TemplateResponse[]>([]);
  const [templatePage, setTemplatePage] = useState(1);
  const [templateTotalPages, setTemplateTotalPages] = useState(1);
  const [isTemplatesInitialFetch, setIsTemplatesInitialFetch] = useState(false);
  const [importingTemplateId, setImportingTemplateId] = useState<number | null>(null);
  const [sharingCourse, setSharingCourse] = useState<RegisteredCourse | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [withdrawnCourseIds, setWithdrawnCourseIds] = useState<Set<number>>(new Set());
  const [scheduleData, setScheduleData] = useState<ScheduleResponse | null>(null);
  const [scheduleMeta, setScheduleMeta] = useState<
    Pick<StudentScheduleResponse, "term_label" | "term_value" | "last_synced_at">
    | null
  >(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  const scheduleLastSyncedText = useMemo(() => {
    if (!scheduleMeta?.last_synced_at) return null;
    try {
      return formatDistanceToNow(parseISO(scheduleMeta.last_synced_at), { addSuffix: true });
    } catch (error) {
      return null;
    }
  }, [scheduleMeta?.last_synced_at]);

  const maxSelections = 8;

  // Historical expected GPA (kept for potential future use)
  // const expectedGPA = useMemo(() => {
  //   if (selected.length === 0) return 0;
  //   const total = selected.reduce((sum, s) => sum + (s.avg_gpa || 0), 0);
  //   return total / selected.length;
  // }, [selected]);

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

  // Fetch registered courses once on mount or when user changes
  useEffect(() => {
    if (user && !hasFetched) {
      let cancelled = false;
      (async () => {
        setScheduleLoading(true);
        try {
          const registered = await gradeStatisticsApi.getRegisteredCourses();
          if (cancelled) return;
          setRegisteredCourses(registered);
          setWithdrawnCourseIds(prev => {
            if (cancelled || prev.size === 0) return prev;
            const valid = new Set(registered.map(course => course.id));
            const next = new Set<number>();
            prev.forEach(id => {
              if (valid.has(id)) next.add(id);
            });
            return next;
          });

          const semesterData = await gradeStatisticsApi.getSemesters();
          if (cancelled) return;
          setSemesters(semesterData);

          try {
            const latestSchedule = await gradeStatisticsApi.getSchedule();
            if (cancelled) return;
            if (latestSchedule) {
              setScheduleData(latestSchedule.schedule);
              setScheduleMeta({
                term_label: latestSchedule.term_label,
                term_value: latestSchedule.term_value,
                last_synced_at: latestSchedule.last_synced_at,
              });
            } else {
              setScheduleData(null);
              setScheduleMeta(null);
            }
          } catch (error) {
            if (!cancelled) {
              console.error("Failed to fetch schedule", error);
              setScheduleData(null);
              setScheduleMeta(null);
            }
          }
        } catch (error) {
          if (!cancelled) {
            console.error("Failed to load registrar data", error);
          }
        } finally {
          if (!cancelled) {
            setScheduleLoading(false);
            setHasFetched(true);
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    } else if (!user) {
      // Clear data on logout
      setRegisteredCourses([]);
      setSelectedRegisteredCourse(null);
      setHasFetched(false);
      setWithdrawnCourseIds(new Set());
      setScheduleData(null);
      setScheduleMeta(null);
      setScheduleLoading(false);
      setIsScheduleOpen(false);
    }
  }, [user, hasFetched]);

  const handleSyncCourses = useCallback(
    async (password: string): Promise<RegistrarSyncResponse> => {
      setScheduleLoading(true);
      try {
        const result = await gradeStatisticsApi.syncRegistrarCourses({ password });
        setRegisteredCourses(result.synced_courses);
        if (result.schedule) {
          setScheduleData(result.schedule);
          setScheduleMeta(prev => ({
            term_label: result.term_label ?? prev?.term_label ?? null,
            term_value: result.term_value ?? prev?.term_value ?? null,
            last_synced_at: result.last_synced_at ?? new Date().toISOString(),
          }));
        }
        return result;
      } finally {
        setScheduleLoading(false);
      }
    },
  []);

  const handleDeleteItem = (item: BaseCourseItem) => {
    setItemToDelete(item);
  };

  const handleEditItem = (item: BaseCourseItem) => {
    setItemToEdit(item);
    setNewItem({
      item_name: item.item_name,
      total_weight_pct: item.total_weight_pct,
      obtained_score: item.obtained_score,
      max_score: item.max_score,
    });
    setNewItemInput({
      weight: item.total_weight_pct != null ? String(item.total_weight_pct) : "",
      max: item.max_score != null ? String(item.max_score) : "",
      obtained: item.obtained_score != null ? String(item.obtained_score) : "",
    });
  };

  const handleDeleteItemConfirm = async () => {
    if (!itemToDelete) return;
    try {
      await gradeStatisticsApi.deleteCourseItem(itemToDelete.id);
      // Update the registered courses list by removing the deleted item
      setRegisteredCourses(prev => prev.map(rc => ({
        ...rc,
        items: rc.items.filter(item => item.id !== itemToDelete.id)
      })));
    } catch (error) {
      console.error('Failed to delete course item:', error);
    }
  };

  // Calculate total GPA across all registered courses
  const filteredCourses = useMemo(() => {
    const coursesNotWithdrawn = withdrawnCourseIds.size === 0
      ? registeredCourses
      : registeredCourses.filter((course) => !withdrawnCourseIds.has(course.id));

    return coursesNotWithdrawn.map((course) => ({
      gpaCoverage: course.items.reduce(
        (acc, item) => {
          if (hasCompleteScore(item)) {
            acc.currentIncluded += 1;
          } else {
            acc.currentExcluded += 1;
          }
          return acc;
        },
        { currentIncluded: 0, currentExcluded: 0 },
      ),
      ...course,
      items: course.items.map((item) => ({
        ...item,
        isIncludedInGPA: hasCompleteScore(item),
      })),
    }));
  }, [registeredCourses, withdrawnCourseIds]);

  const totalGPA = useMemo(() => calculateTotalGPA(filteredCourses), [filteredCourses]);
  const maxPotentialGPA = useMemo(
    () => calculateMaxPossibleTotalGPA(filteredCourses),
    [filteredCourses],
  );
  const projectedGPA = useMemo(
    () => calculateProjectedTotalGPA(filteredCourses),
    [filteredCourses],
  );

  const displayedGPA = useMemo(() => {
    if (gpaMode === 'semester') {
      return totalGPA;
    }
    if (gpaMode === 'maxPossible') {
      return maxPotentialGPA;
    }
    return projectedGPA;
  }, [gpaMode, maxPotentialGPA, projectedGPA, totalGPA]);

  const handleToggleWithdraw = useCallback((courseId: number) => {
    setWithdrawnCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  }, []);

  const sanitizeNonNegative = (value: number | null | undefined): number | null => {
    if (value == null || Number.isNaN(value)) return null;
    return Math.max(0, value);
  };

  const handleShareTemplate = async () => {
    if (!sharingCourse) return;
    try {
      if (!canShareTemplate(sharingCourse)) {
        toast({
          variant: "warning",
          title: "Add assignments first",
          description: "Please add at least one item before sharing a template.",
        });
        return;
      }
      setIsSharing(true);
      const payload = buildTemplateCreatePayload(sharingCourse);
      let createdTemplate: TemplateResponse | null = null;
      let createError: unknown = null;

      try {
        createdTemplate = await gradeStatisticsApi.createTemplate(payload);
      } catch (err) {
        createError = err;
      }

      if (!createdTemplate) {
        const isConflict =
          typeof createError === "object" &&
          createError !== null &&
          "response" in createError &&
          (createError as { response?: Response }).response?.status === 409;

        if (isConflict) {
          // Validate that template_items is not empty before updating
          if (!canUpdateTemplate(sharingCourse)) {
            toast({
              variant: "warning",
              title: "Add assignments first",
              description: "Please add at least one item before updating a template.",
            });
            return;
          }

          const updatePayload = buildTemplateUpdatePayload(sharingCourse);

          const ensureTemplateId = async (): Promise<number | null> => {
            const existing = templates.find((t) => t.template.course_id === sharingCourse.course.id);
            if (existing) return existing.template.id;

            const response = await gradeStatisticsApi.getTemplates({
              course_id: sharingCourse.course.id,
              page: 1,
              size: 1,
            });
            return response.templates[0]?.template.id ?? null;
          };

          const templateId = await ensureTemplateId();
          if (templateId) {
            createdTemplate = await gradeStatisticsApi.updateTemplate(templateId, updatePayload);
          } else {
            throw createError;
          }
        } else if (createError) {
          throw createError;
        }
      }

      toast({
        variant: "success",
        title: "Template shared",
        description: "Your course template is now available to peers.",
      });
      closeShareModal();
      if (templateDrawerCourse?.id === sharingCourse.id) {
        setTemplates([]);
        setTemplateTotalPages(1);
        setTemplatePage(1);
        setIsTemplatesInitialFetch(true);
        await loadTemplates(sharingCourse, 1, true);
      }
    } catch (error) {
      console.error("Failed to share template", error);
      toast({
        variant: "destructive",
        title: "Share failed",
        description: "We couldn't share this template. Try again later.",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const openShareModal = (course: RegisteredCourse) => {
    setSharingCourse(course);
    setIsShareModalOpen(true);
  };

  const closeShareModal = () => {
    setIsShareModalOpen(false);
    setSharingCourse(null);
  };

  const templatesPageSize = 10;

  const loadTemplates = useCallback(
    async (course: RegisteredCourse, page: number, replace = false) => {
      setTemplatesLoading(true);
      try {
        const response = await gradeStatisticsApi.getTemplates({
          course_id: course.course.id,
          page,
          size: templatesPageSize,
        });
        const sorted = sortTemplatesByRecency(response.templates);
        setTemplates((prev) =>
          replace
            ? sorted
            : [
                ...prev,
                ...sorted.filter((tmpl) => !prev.some((p) => p.template.id === tmpl.template.id)),
              ],
        );
        setTemplateTotalPages(response.total_pages);
        setTemplatePage(page);
      } catch (error) {
        console.error("Failed to load templates", error);
        toast({
          variant: "destructive",
          title: "Failed to load",
          description: "Unable to fetch templates for this course.",
        });
      } finally {
        setTemplatesLoading(false);
        setIsTemplatesInitialFetch(false);
      }
    },
    [toast],
  );

  const handleOpenTemplates = useCallback(
    async (course: RegisteredCourse) => {
      setTemplateDrawerCourse(course);
      setIsTemplateDrawerOpen(true);
      setTemplates([]);
      setTemplateTotalPages(1);
      setTemplatePage(1);
      setIsTemplatesInitialFetch(true);
      await loadTemplates(course, 1, true);
    },
    [loadTemplates],
  );

  const handleLoadMoreTemplates = useCallback(async () => {
    if (!templateDrawerCourse) return;
    const nextPage = templatePage + 1;
    if (nextPage > templateTotalPages) return;
    await loadTemplates(templateDrawerCourse, nextPage);
  }, [templateDrawerCourse, templatePage, templateTotalPages, loadTemplates]);

  const closeTemplateDrawer = useCallback(() => {
    setIsTemplateDrawerOpen(false);
    setTemplateDrawerCourse(null);
    setTemplates([]);
    setTemplatePage(1);
    setTemplateTotalPages(1);
    setImportingTemplateId(null);
  }, []);

  const handleImportTemplate = useCallback(
    async (template: TemplateResponse) => {
      if (!templateDrawerCourse) return;
      setImportingTemplateId(template.template.id);
      try {
        const response = await gradeStatisticsApi.importTemplate(
          template.template.id,
          templateDrawerCourse.id,
        );
        setRegisteredCourses((prev) =>
          prev.map((course) =>
            course.id === response.student_course_id
              ? {
                  ...course,
                  items: response.items,
                }
              : course,
          ),
        );
        toast({
          variant: "success",
          title: "Template imported",
          description: `Imported ${template.template_items.length} items into your course.`,
        });
        closeTemplateDrawer();
      } catch (error) {
        console.error("Failed to import template", error);
        toast({
          variant: "destructive",
          title: "Import failed",
          description: "Unable to import this template. Please try again.",
        });
      } finally {
        setImportingTemplateId(null);
      }
    },
    [templateDrawerCourse, toast, closeTemplateDrawer],
  );

  // Smart numeric input helpers (mobile-first): allow digits + one decimal, clamp 0..100
  const normalizeNumberInput = (raw: string): string => {
    if (!raw) return "";
    const cleaned = raw
      .replace(/,/g, ".")
      .replace(/[^0-9.]/g, "");
    const dotIndex = cleaned.indexOf(".");
    const normalized = dotIndex === -1
      ? cleaned
      : cleaned.slice(0, dotIndex + 1) + cleaned.slice(dotIndex + 1).replace(/\./g, "");
    return normalized;
  };

  const parseInput = (raw: string): number | null => {
    if (!raw) return null;
    const v = Number(raw.replace(/,/g, "."));
    return Number.isNaN(v) ? null : Math.max(0, v);
  };

  // Keep obtained <= max in real-time
  useEffect(() => {
    const maxNum = parseInput(newItemInput.max);
    const obtainedNum = parseInput(newItemInput.obtained);
    if (maxNum != null && obtainedNum != null && obtainedNum > maxNum) {
      setNewItemInput(v => ({ ...v, obtained: maxNum.toString() }));
    }
  }, [newItemInput.max]);

  // Form validity flags
  const nameValid = (newItem.item_name?.trim().length || 0) > 0 && (newItem.item_name?.length || 0) <= 15;
  const weightNumValid = (() => {
    const n = parseInput(newItemInput.weight);
    return newItemInput.weight === "" || (n != null && n >= 0 && n <= 100);
  })();
  const maxNumValid = (() => {
    const n = parseInput(newItemInput.max);
    return newItemInput.max === "" || (n != null && n >= 0 && n <= 99999.99);
  })();
  const obtainedNumValid = (() => {
    const o = parseInput(newItemInput.obtained);
    const m = parseInput(newItemInput.max);
    if (newItemInput.obtained === "") return true;
    if (o == null || o < 0) return false;
    if (o > 99999.99) return false;
    if (m != null && o > m) return false;
    return true;
  })();
  const isAddOrEditValid = nameValid && weightNumValid && maxNumValid && obtainedNumValid;

  const handleAddItem = async () => {
    if (!selectedRegisteredCourse || !newItem.item_name) return;
    // Parse inputs allowing comma decimal separators
    const weightNumRaw = newItemInput.weight ? Number(newItemInput.weight.replace(/,/g, '.')) : null;
    const maxScoreNumRaw = newItemInput.max ? Number(newItemInput.max.replace(/,/g, '.')) : undefined;
    const obtainedRawRaw = newItemInput.obtained ? Number(newItemInput.obtained.replace(/,/g, '.')) : null;
    const weightNum = sanitizeNonNegative(weightNumRaw);
    const maxScore = typeof maxScoreNumRaw === "number" ? sanitizeNonNegative(maxScoreNumRaw) : null;
    const obtained = sanitizeNonNegative(obtainedRawRaw);
    const resolvedMaxScore = maxScore != null && maxScore > 0 ? maxScore : null;
    const resolvedObtained = obtained != null ? (resolvedMaxScore == null ? obtained : Math.min(obtained, resolvedMaxScore)) : null;

    const payload: CourseItemCreate = {
      student_course_id: selectedRegisteredCourse.id,
      item_name: newItem.item_name!,
      total_weight_pct: weightNum,
      max_score: resolvedMaxScore,
      obtained_score: resolvedObtained,
    };
    
    try {
      const newItem = await gradeStatisticsApi.addCourseItem(payload);
      // Update the registered courses list with the new item
      setRegisteredCourses(prev => prev.map(rc => 
        rc.id === selectedRegisteredCourse.id 
          ? { ...rc, items: [...rc.items, newItem] }
          : rc
      ));
    setNewItem({ item_name: "", total_weight_pct: null, obtained_score: null, max_score: null });
      setNewItemInput({ weight: "", max: "", obtained: "" });
      setIsAddItemModalOpen(false);
      setSelectedRegisteredCourse(null);
    } catch (error) {
      console.error('Failed to add course item:', error);
    }
  };

  const handleUpdateItem = async () => {
    if (!itemToEdit) return;
    const weightNum = sanitizeNonNegative(newItemInput.weight ? Number(newItemInput.weight.replace(/,/g, '.')) : null);
    const obtainedRaw = sanitizeNonNegative(newItemInput.obtained ? Number(newItemInput.obtained.replace(/,/g, '.')) : null);
    const maxScoreRaw = sanitizeNonNegative(newItemInput.max ? Number(newItemInput.max.replace(/,/g, '.')) : null);
    const resolvedMaxScore = maxScoreRaw != null && maxScoreRaw > 0 ? maxScoreRaw : null;
    const resolvedObtained = obtainedRaw != null ? (resolvedMaxScore == null ? obtainedRaw : Math.min(obtainedRaw, resolvedMaxScore)) : null;
    try {
      const updated = await gradeStatisticsApi.updateCourseItem(itemToEdit.id, {
        item_name: newItem.item_name || itemToEdit.item_name,
        total_weight_pct: weightNum,
        max_score: resolvedMaxScore,
        obtained_score: resolvedObtained,
      });
      setRegisteredCourses(prev => prev.map(rc => ({
        ...rc,
        items: rc.items.map(it => it.id === updated.id ? updated : it)
      })));
      setItemToEdit(null);
    setNewItem({ item_name: "", total_weight_pct: null, obtained_score: null, max_score: null });
      setNewItemInput({ weight: "", max: "", obtained: "" });
    } catch (error) {
      console.error('Failed to update course item:', error);
    }
  };

  return (
    <MotionWrapper>
      <div className="w-full max-w-none space-y-6">
        {/* Tabs: Course Statistics vs Live GPA */}
        <Tabs defaultValue="live-gpa">
          <TabsList className="mb-4 grid w-full grid-cols-2 rounded-full bg-muted/60 p-1">
            <TabsTrigger value="live-gpa">My Courses</TabsTrigger>
            <TabsTrigger value="course-stats">Course Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="live-gpa">
            <div className="space-y-6">
              {/* My Courses Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Courses</h1>
                    <p className="text-gray-600 dark:text-gray-400">Track your academic progress and manage your course schedule</p>
                  </div>
                  {user && (
                    <SynchronizeCoursesControl
                      onSync={handleSyncCourses}
                      userEmail={user.email ?? ""}
                    />
                  )}
                </div>
              </div>


                {user && (
                <Card className="rounded-2xl border border-border/50 bg-muted/30">
                  <CardHeader className="flex flex-row items-start justify-between gap-4 pb-1">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-semibold text-foreground">Weekly timetable</CardTitle>
                    </div>
                    <CalendarClock className="h-5 w-5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>
                        {scheduleMeta?.term_label ? `Current term: ${scheduleMeta.term_label}` : "No schedule synced yet"}
                      </span>
                      {scheduleMeta?.last_synced_at && (
                        <span>Last synced {new Date(scheduleMeta.last_synced_at + 'Z').toLocaleString()}</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => setIsScheduleOpen(true)}
                      disabled={scheduleLoading}
                    >
                      <CalendarDays className="h-4 w-4" />
                      {scheduleLoading ? "Loading schedule…" : "View schedule"}
                    </Button>
                  </CardContent>
                </Card>
              )}

              <ScheduleDialog
                open={isScheduleOpen}
                onClose={() => setIsScheduleOpen(false)}
                schedule={scheduleData}
                meta={scheduleMeta}
                isLoading={scheduleLoading}
              />

              {/* Add Course Item Modal */}
              {selectedRegisteredCourse && (
                <Modal
                  isOpen={isAddItemModalOpen}
                  onClose={() => {
                    setIsAddItemModalOpen(false);
                    setSelectedRegisteredCourse(null);
                    setNewItem({ item_name: "", total_weight_pct: null, obtained_score: null, max_score: null });
                    setNewItemInput({ weight: "", max: "", obtained: "" });
                  }}
                  title={itemToEdit ? "Edit assignment" : "Add assignment"}
                  className="max-w-md"
                  contentClassName="rounded-3xl"
                >
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Item Name</label>
                        <Input
                          placeholder="e.g., Midterm Exam"
                          maxLength={15}
                          value={newItem.item_name || ''}
                          onChange={(e) => setNewItem(v => ({ ...v, item_name: e.target.value.slice(0, 15) }))}
                        />
                        {!nameValid && (
                          <p className="mt-1 text-xs text-red-600">Name is required and max 15 characters.</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Weight (%)</label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="e.g., 25"
                          value={newItemInput.weight}
                          onChange={(e) => setNewItemInput(v => ({ ...v, weight: normalizeNumberInput(e.target.value) }))}
                        />
                        {!weightNumValid && (
                          <p className="mt-1 text-xs text-red-600">Weight must be between 0 and 100.</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium mb-2 block">Max Score</label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="e.g., 100"
                          value={newItemInput.max}
                          onChange={(e) => setNewItemInput(v => ({ ...v, max: normalizeNumberInput(e.target.value) }))}
                        />
                        {!maxNumValid && (
                          <p className="mt-1 text-xs text-red-600">Max must be between 0 and 99999.99.</p>
                        )}
                        {maxNumValid && parseInput(newItemInput.max) != null && parseInput(newItemInput.obtained) == null && (
                          <p className="text-xs text-muted-foreground">Add an obtained score for this item to appear in GPA.</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium mb-2 block">Obtained Score</label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="e.g., 85"
                          value={newItemInput.obtained}
                          onChange={(e) => setNewItemInput(v => ({ ...v, obtained: normalizeNumberInput(e.target.value) }))}
                        />
                        {!obtainedNumValid && (
                          <p className="mt-1 text-xs text-red-600">Obtained must be between 0 and 99999.99 and ≤ Max.</p>
                        )}
                        {obtainedNumValid && parseInput(newItemInput.obtained) != null && parseInput(newItemInput.max) == null && (
                          <p className="text-xs text-muted-foreground">Add a max score so this item counts toward GPA.</p>
                        )}
                      </div>
                    </div>
                    {parseInput(newItemInput.max) != null && parseInput(newItemInput.obtained) != null ? (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                        <p className="font-semibold">Ready for GPA</p>
                        <p>This assignment will be included in all GPA calculations.</p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        <p className="font-semibold">Heads up</p>
                        <p>Add both max and obtained scores for this assignment to count toward GPA.</p>
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => {
                        setIsAddItemModalOpen(false);
                        setSelectedRegisteredCourse(null);
                        setNewItem({ item_name: "", total_weight_pct: null, obtained_score: null, max_score: null });
                        setNewItemInput({ weight: "", max: "", obtained: "" });
                      }}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddItem} disabled={!isAddOrEditValid}>
                        <Plus className="h-4 w-4 mr-1" /> Add Item
                      </Button>
                    </div>
                  </div>
                </Modal>
              )}

              {/* Confirmation Modals */}
              <ConfirmationModal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={handleDeleteItemConfirm}
                title="Delete assignment"
                className="max-w-sm"
                contentClassName="rounded-3xl"
                description={`Are you sure you want to delete "${itemToDelete?.item_name}"? This action cannot be undone.`}
                confirmText="Delete"
              />
              {/* Edit Item Modal */}
              {itemToEdit && (
                <Modal
                  isOpen={!!itemToEdit}
                  onClose={() => {
                    setItemToEdit(null);
                    setNewItem({ item_name: "", total_weight_pct: null, obtained_score: null, max_score: null });
                    setNewItemInput({ weight: "", max: "", obtained: "" });
                  }}
                  title="Edit assignment"
                  className="max-w-md"
                  contentClassName="rounded-3xl"
                >
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Item Name</label>
                        <Input
                          placeholder="e.g., Midterm Exam"
                          maxLength={15}
                          value={newItem.item_name || ''}
                          onChange={(e) => setNewItem(v => ({ ...v, item_name: e.target.value.slice(0, 15) }))}
                        />
                        {!nameValid && (
                          <p className="mt-1 text-xs text-red-600">Name is required and max 15 characters.</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Weight (%)</label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="e.g., 25"
                          value={newItemInput.weight}
                          onChange={(e) => setNewItemInput(v => ({ ...v, weight: normalizeNumberInput(e.target.value) }))}
                        />
                        {!weightNumValid && (
                          <p className="mt-1 text-xs text-red-600">Weight must be between 0 and 100.</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium mb-2 block">Max Score</label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="e.g., 100"
                          value={newItemInput.max}
                          onChange={(e) => setNewItemInput(v => ({ ...v, max: normalizeNumberInput(e.target.value) }))}
                        />
                        {!maxNumValid && (
                          <p className="mt-1 text-xs text-red-600">Max must be between 0 and 99999.99.</p>
                        )}
                        {maxNumValid && parseInput(newItemInput.max) != null && parseInput(newItemInput.obtained) == null && (
                          <p className="text-xs text-muted-foreground">Add an obtained score for this item to appear in GPA.</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium mb-2 block">Obtained Score</label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="e.g., 85"
                          value={newItemInput.obtained}
                          onChange={(e) => setNewItemInput(v => ({ ...v, obtained: normalizeNumberInput(e.target.value) }))}
                        />
                        {!obtainedNumValid && (
                          <p className="mt-1 text-xs text-red-600">Obtained must be between 0 and 99999.99 and ≤ Max.</p>
                        )}
                        {obtainedNumValid && parseInput(newItemInput.obtained) != null && parseInput(newItemInput.max) == null && (
                          <p className="text-xs text-muted-foreground">Add a max score so this item counts toward GPA.</p>
                        )}
                      </div>
                    </div>
                    {parseInput(newItemInput.max) != null && parseInput(newItemInput.obtained) != null ? (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                        <p className="font-semibold">Ready for GPA</p>
                        <p>This assignment will be included in all GPA calculations.</p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        <p className="font-semibold">Heads up</p>
                        <p>Add both max and obtained scores for this assignment to count toward GPA.</p>
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => {
                        setItemToEdit(null);
                        setNewItem({ item_name: "", total_weight_pct: null, obtained_score: null, max_score: null });
                        setNewItemInput({ weight: "", max: "", obtained: "" });
                      }}>
                        Cancel
                      </Button>
                      <Button onClick={handleUpdateItem} disabled={!isAddOrEditValid}>
                        Save
                      </Button>
                    </div>
                  </div>
                </Modal>
              )}

              {sharingCourse && (
                <Modal
                  isOpen={isShareModalOpen}
                  onClose={closeShareModal}
                  title="Share course template"
                  className="max-w-md"
                  contentClassName="rounded-3xl"
                >
                  <div className="space-y-5">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-foreground">
                        {sharingCourse.course.course_code}
                        {sharingCourse.course.section ? ` · ${sharingCourse.course.section}` : ""}
                      </h3>
                      {sharingCourse.course.title && (
                        <p className="text-sm text-muted-foreground">
                          {sharingCourse.course.title}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-center text-xs">
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Assignments</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">{sharingCourse.items.length}</p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Coverage</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">
                          {Math.min(100, Math.max(0, calculateTemplateCoverage(sharingCourse))).toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Share your assignment names and weights (not your grades) so peers can set up their course structure.
                    </p>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Preview</p>
                      {sharingCourse.items.length > 0 ? (
                        <div className="space-y-2">
                          {sharingCourse.items.slice(0, 5).map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between rounded-lg border border-border/40 bg-background/70 px-3 py-2"
                            >
                              <span className="text-sm font-medium text-foreground line-clamp-1">{item.item_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {(item.total_weight_pct ?? 0).toFixed(1)}%
                              </span>
                            </div>
                          ))}
                          {sharingCourse.items.length > 5 && (
                            <p className="text-xs text-muted-foreground">+
                              {sharingCourse.items.length - 5} more assignments included
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
                          Add at least one assignment to share a template.
                        </div>
                      )}
                    </div>

                    {calculateTemplateCoverage(sharingCourse) < 100 && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        <p className="font-medium">Heads up</p>
                        <p>Your template covers less than 100% of the course weight. Peers can add missing items after importing.</p>
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={closeShareModal} disabled={isSharing}>
                        Cancel
                      </Button>
                      <Button onClick={handleShareTemplate} disabled={isSharing || !canShareTemplate(sharingCourse)}>
                        {isSharing ? "Sharing…" : "Share template"}
                      </Button>
                    </div>
                  </div>
                </Modal>
              )}

              <Sheet
                open={isTemplateDrawerOpen}
                onOpenChange={(open) => {
                  if (!open) closeTemplateDrawer();
                }}
              >
                <SheetContent
                  side="right"
                  className="w-full max-w-full overflow-y-auto bg-background/95 sm:max-w-md"
                >
                  <SheetHeader className="space-y-2">
                    <SheetTitle className="text-left text-lg font-semibold">
                      {templateDrawerCourse?.course.course_code}
                      {templateDrawerCourse?.course.section ? ` · ${templateDrawerCourse?.course.section}` : ""}
                    </SheetTitle>
                    <SheetDescription className="text-left text-sm">
                      Browse templates shared by peers and replace your course items with a single tap.
                    </SheetDescription>
                  </SheetHeader>

                  <div className="mt-4 space-y-4">
                    {templateDrawerCourse && (
                      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm">
                        <div className="font-semibold text-foreground">
                    {templateDrawerCourse.course.title || templateDrawerCourse.course.course_code}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-3 text-center text-xs text-muted-foreground">
                          <div className="rounded-xl border border-border/40 bg-background/60 p-3">
                            <p className="text-[11px] uppercase tracking-wide">Assignments</p>
                            <p className="mt-1 text-lg font-semibold text-foreground">
                              {templateDrawerCourse.items.length}
                            </p>
                          </div>
                          <div className="rounded-xl border border-border/40 bg-background/60 p-3">
                            <p className="text-[11px] uppercase tracking-wide">Coverage</p>
                            <p className="mt-1 text-lg font-semibold text-foreground">
                              {Math.min(100, Math.max(0, calculateTemplateCoverage(templateDrawerCourse))).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {isTemplatesInitialFetch ? (
                      <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, index) => (
                          <div key={index} className="space-y-3 rounded-2xl border border-border/60 bg-background/70 p-4">
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-3 w-32" />
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-9 w-full" />
                          </div>
                        ))}
                      </div>
                    ) : templates.length > 0 ? (
                      <div className="space-y-3">
                        {!isTemplatesInitialFetch && templateDrawerCourse && (
                          <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                            Importing a template will replace your current assignments for this course. You can always edit them afterwards.
                          </div>
                        )}
                        {templates.map((template) => {
                          const coverage = Math.min(100, Math.max(0, calculateTemplateWeight(template))).toFixed(1);
                          const createdAt = new Date(template.template.created_at);
                          const initials = `${template.student.name?.charAt(0) ?? ""}${template.student.surname?.charAt(0) ?? ""}`.toUpperCase() || "P";
                          return (
                            <div
                              key={template.template.id}
                              className="space-y-3 rounded-2xl border border-border/60 bg-background/85 p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage
                                      src={template.student.picture}
                                      alt={`${template.student.name} ${template.student.surname}`}
                                    />
                                    <AvatarFallback>{initials}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">
                                      {template.student.name} {template.student.surname}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Shared on {createdAt.toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  className="flex items-center gap-2"
                                  onClick={() => handleImportTemplate(template)}
                                  disabled={importingTemplateId === template.template.id}
                                >
                                  {importingTemplateId === template.template.id ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Import"
                                  )}
                                </Button>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-center text-xs text-muted-foreground">
                                <div className="rounded-lg border border-border/40 bg-muted/20 p-2">
                                  <p className="text-[10px] uppercase tracking-wide">Items</p>
                                  <p className="mt-1 text-sm font-semibold text-foreground">
                                    {template.template_items.length}
                                  </p>
                                </div>
                                <div className="rounded-lg border border-border/40 bg-muted/20 p-2">
                                  <p className="text-[10px] uppercase tracking-wide">Coverage</p>
                                  <p className="mt-1 text-sm font-semibold text-foreground">{coverage}%</p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground">Assignments preview</p>
                                <div className="space-y-1">
                                  {template.template_items.slice(0, 4).map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between rounded-lg border border-border/40 bg-background/70 px-3 py-2"
                                    >
                                      <span className="text-sm font-medium text-foreground line-clamp-1">
                                        {item.item_name}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {(item.total_weight_pct ?? 0).toFixed(1)}%
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                {template.template_items.length > 4 && (
                                  <p className="text-xs text-muted-foreground">
                                    +{template.template_items.length - 4} more items included
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {templatePage < templateTotalPages && (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleLoadMoreTemplates}
                            disabled={templatesLoading}
                          >
                            {templatesLoading ? "Loading…" : "Load more"}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3 rounded-2xl border border-dashed border-border/60 bg-muted/15 p-6 text-center">
                        <p className="text-sm font-medium text-foreground">No templates shared yet</p>
                        <p className="text-xs text-muted-foreground">
                          Be the first to share your course structure so your peers can start with a plan.
                        </p>
                      </div>
                    )}

                  </div>
                </SheetContent>
              </Sheet>

              {!user ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3">
                  <div className="text-sm text-muted-foreground">Login to track your course progress this semester.</div>
                  <Button onClick={login} size="sm" className="h-8 rounded-full px-3 text-xs font-medium">Login</Button>
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Card className="rounded-2xl border border-border/50 bg-muted/40 p-4">
                      <CardContent className="space-y-2 p-0">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Total GPA</p>
                        <p className={`text-3xl font-semibold ${getGPAColorClass(displayedGPA)}`}>{formatGPA(displayedGPA)}</p>
                        <p className="text-xs text-muted-foreground">Across all registered courses</p>
                      </CardContent>
                    </Card>
                    <Card className="rounded-2xl border border-border/50 bg-muted/40 p-4">
                      <CardContent className="space-y-2 p-0">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Max potential</p>
                        <p className="text-3xl font-semibold text-foreground">
                          {maxPotentialGPA.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">If you ace everything left</p>
                      </CardContent>
                    </Card>
                    <Card className="rounded-2xl border border-border/50 bg-muted/40 p-4">
                      <CardContent className="space-y-2 p-0">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Projected GPA</p>
                        <p className="text-3xl font-semibold text-foreground">
                          {projectedGPA.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">Based on current trend</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Registered Courses */}
                  {registeredCourses.length > 0 ? (
                    <div className="space-y-3">
                      {registeredCourses.map((registeredCourse) => (
                        <RegisteredCourseCard
                          key={registeredCourse.id}
                          registeredCourse={registeredCourse}
                          onAddItem={(courseId) => {
                            const course = registeredCourses.find((rc) => rc.id === courseId);
                            if (course) {
                              setSelectedRegisteredCourse(course);
                              setIsAddItemModalOpen(true);
                            }
                          }}
                          onDeleteItem={handleDeleteItem}
                          onEditItem={handleEditItem}
                          onShareTemplate={openShareModal}
                          onOpenTemplates={handleOpenTemplates}
                          isWithdrawn={withdrawnCourseIds.has(registeredCourse.id)}
                          onToggleWithdraw={handleToggleWithdraw}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No courses registered yet. Use the Synchronize button to import your schedule.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="course-stats">
            {/* Course Statistics List (historical) */}
            <div className="w-full overflow-x-hidden" id="courses-section">
              <SearchableInfiniteList
                queryKey={["courses"]}
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
                title="Course Statistics"
                itemCountPlaceholder=""
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MotionWrapper>
  );
}