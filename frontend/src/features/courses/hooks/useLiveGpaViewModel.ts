import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { gradeStatisticsApi } from "../api/gradeStatisticsApi";
import {
  BaseCourseItem,
  CourseItemCreate,
  RegisteredCourse,
  RegistrarSyncResponse,
  ScheduleResponse,
  StudentScheduleResponse,
  TemplateResponse,
} from "../types";
import {
  buildTemplateCreatePayload,
  buildTemplateUpdatePayload,
  canShareTemplate,
  canUpdateTemplate,
  sortTemplatesByRecency,
} from "../utils/templateUtils";
import {
  calculateMaxPossibleTotalGPA,
  calculateProjectedTotalGPA,
  calculateTotalGPA,
  hasCompleteScore,
} from "../utils/gradeUtils";
import { useToast } from "@/hooks/use-toast";

type NullableUser = { email?: string | null } | null | undefined;
type AssignmentField = "weight" | "max" | "obtained";

export function useLiveGpaViewModel(user: NullableUser) {
  const { toast } = useToast();

  const [registeredCourses, setRegisteredCourses] = useState<RegisteredCourse[]>([]);
  const [selectedRegisteredCourse, setSelectedRegisteredCourse] = useState<RegisteredCourse | null>(null);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<BaseCourseItem | null>(null);
  const [itemToEdit, setItemToEdit] = useState<BaseCourseItem | null>(null);

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

  const [templateDrawerCourse, setTemplateDrawerCourse] = useState<RegisteredCourse | null>(null);
  const [isTemplateDrawerOpen, setIsTemplateDrawerOpen] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templates, setTemplates] = useState<TemplateResponse[]>([]);
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

  const resetAssignmentForm = useCallback(() => {
    setNewItem({ item_name: "", total_weight_pct: null, obtained_score: null, max_score: null });
    setNewItemInput({ weight: "", max: "", obtained: "" });
  }, []);

  const normalizeNumberInput = (raw: string): string => {
    if (!raw) return "";
    const cleaned = raw.replace(/,/g, ".").replace(/[^0-9.]/g, "");
    const dotIndex = cleaned.indexOf(".");
    return dotIndex === -1
      ? cleaned
      : cleaned.slice(0, dotIndex + 1) + cleaned.slice(dotIndex + 1).replace(/\./g, "");
  };

  const sanitizeNonNegative = (value: number | null | undefined): number | null => {
    if (value == null || Number.isNaN(value)) return null;
    return Math.max(0, value);
  };

  const parseInput = (raw: string): number | null => {
    if (!raw) return null;
    const v = Number(raw.replace(/,/g, "."));
    return Number.isNaN(v) ? null : Math.max(0, v);
  };

  useEffect(() => {
    const maxNum = parseInput(newItemInput.max);
    const obtainedNum = parseInput(newItemInput.obtained);
    if (maxNum != null && obtainedNum != null && obtainedNum > maxNum) {
      setNewItemInput((prev) => ({ ...prev, obtained: maxNum.toString() }));
    }
  }, [newItemInput.max, newItemInput.obtained]);

  useEffect(() => {
    if (user && !hasFetched) {
      let cancelled = false;
      const loadInitial = async () => {
        setScheduleLoading(true);
        try {
          const registered = await gradeStatisticsApi.getRegisteredCourses();
          if (cancelled) return;
          setRegisteredCourses(registered);

          setWithdrawnCourseIds((prev) => {
            if (cancelled || prev.size === 0) return prev;
            const valid = new Set(registered.map((course) => course.id));
            const next = new Set<number>();
            prev.forEach((id) => {
              if (valid.has(id)) next.add(id);
            });
            return next;
          });

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
      };

      loadInitial();
      return () => {
        cancelled = true;
      };
    }

    if (!user) {
      setRegisteredCourses([]);
      setSelectedRegisteredCourse(null);
      setHasFetched(false);
      setWithdrawnCourseIds(new Set());
      setScheduleData(null);
      setScheduleMeta(null);
      setScheduleLoading(false);
      setIsScheduleOpen(false);
      setTemplates([]);
      setTemplateDrawerCourse(null);
      setIsTemplateDrawerOpen(false);
      setSharingCourse(null);
      setIsShareModalOpen(false);
      setIsSharing(false);
      setItemToDelete(null);
      setItemToEdit(null);
      setIsAddItemModalOpen(false);
      setImportingTemplateId(null);
      resetAssignmentForm();
    }
  }, [user, hasFetched, resetAssignmentForm]);

  const filteredCourses = useMemo(() => {
    const coursesNotWithdrawn =
      withdrawnCourseIds.size === 0
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
      setIsTemplatesInitialFetch(true);
      await loadTemplates(course, 1, true);
    },
    [loadTemplates],
  );

  const handleLoadMoreTemplates = useCallback(async () => {
    if (!templateDrawerCourse) return;
    const nextPage = Math.floor(templates.length / templatesPageSize) + 1;
    if (nextPage > templateTotalPages) return;
    await loadTemplates(templateDrawerCourse, nextPage);
  }, [templateDrawerCourse, templates.length, templateTotalPages, loadTemplates]);

  const closeTemplateDrawer = useCallback(() => {
    setIsTemplateDrawerOpen(false);
    setTemplateDrawerCourse(null);
    setTemplates([]);
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

  const openShareModal = useCallback((course: RegisteredCourse) => {
    setSharingCourse(course);
    setIsShareModalOpen(true);
  }, []);

  const closeShareModal = useCallback(() => {
    setIsShareModalOpen(false);
    setSharingCourse(null);
  }, []);

  const handleShareTemplate = useCallback(async () => {
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
  }, [sharingCourse, toast, templateDrawerCourse, loadTemplates, templates, closeShareModal]);

  const scheduleLastSyncedText = useMemo(() => {
    if (!scheduleMeta?.last_synced_at) return null;
    try {
      return formatDistanceToNow(parseISO(scheduleMeta.last_synced_at), { addSuffix: true });
    } catch (error) {
      return null;
    }
  }, [scheduleMeta?.last_synced_at]);

  const handleSyncCourses = useCallback(
    async (password: string): Promise<RegistrarSyncResponse> => {
      setScheduleLoading(true);
      try {
        const result = await gradeStatisticsApi.syncRegistrarCourses({ password });
        setRegisteredCourses(result.synced_courses);
        if (result.schedule) {
          setScheduleData(result.schedule);
          setScheduleMeta((prev) => ({
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
    [],
  );

  const openSchedule = useCallback(() => setIsScheduleOpen(true), []);
  const closeSchedule = useCallback(() => setIsScheduleOpen(false), []);

  const handleCloseAddModal = useCallback(() => {
    setIsAddItemModalOpen(false);
    setSelectedRegisteredCourse(null);
    resetAssignmentForm();
  }, [resetAssignmentForm]);

  const handleCloseEditModal = useCallback(() => {
    setItemToEdit(null);
    resetAssignmentForm();
  }, [resetAssignmentForm]);

  const handleOpenAddModal = useCallback(
    (courseId: number) => {
      const course = registeredCourses.find((rc) => rc.id === courseId);
      if (!course) return;
      setSelectedRegisteredCourse(course);
      setItemToEdit(null);
      resetAssignmentForm();
      setIsAddItemModalOpen(true);
    },
    [registeredCourses, resetAssignmentForm],
  );

  const handleNameChange = useCallback((value: string) => {
    setNewItem((prev) => ({ ...prev, item_name: value.slice(0, 15) }));
  }, []);

  const handleNumericChange = useCallback((field: AssignmentField, value: string) => {
    setNewItemInput((prev) => ({
      ...prev,
      [field]: normalizeNumberInput(value),
    }));
  }, []);

  const handleEditItem = useCallback((item: BaseCourseItem) => {
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
  }, []);

  const handleDeleteItem = useCallback((item: BaseCourseItem) => {
    setItemToDelete(item);
  }, []);

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
  const hasReadyStatus =
    parseInput(newItemInput.max) != null && parseInput(newItemInput.obtained) != null;
  const assignmentStatusCard = hasReadyStatus
    ? {
        tone: "ready" as const,
        title: "Ready for GPA",
        message: "This assignment will be included in all GPA calculations.",
      }
    : {
        tone: "warning" as const,
        title: "Heads up",
        message: "Add both max and obtained scores for this assignment to count toward GPA.",
      };
  const nameError = nameValid ? undefined : "Name is required and max 15 characters.";
  const weightError = weightNumValid ? undefined : "Weight must be between 0 and 100.";
  const maxError = maxNumValid ? undefined : "Max must be between 0 and 99999.99.";
  const obtainedError = obtainedNumValid
    ? undefined
    : "Obtained must be between 0 and 99999.99 and ≤ Max.";

  const handleAddItem = useCallback(async () => {
    if (!selectedRegisteredCourse || !newItem.item_name) return;
    const weightNumRaw = newItemInput.weight ? Number(newItemInput.weight.replace(/,/g, ".")) : null;
    const maxScoreNumRaw = newItemInput.max ? Number(newItemInput.max.replace(/,/g, ".")) : undefined;
    const obtainedRawRaw = newItemInput.obtained ? Number(newItemInput.obtained.replace(/,/g, ".")) : null;
    const weightNum = sanitizeNonNegative(weightNumRaw);
    const maxScore = typeof maxScoreNumRaw === "number" ? sanitizeNonNegative(maxScoreNumRaw) : null;
    const obtained = sanitizeNonNegative(obtainedRawRaw);
    const resolvedMaxScore = maxScore != null && maxScore > 0 ? maxScore : null;
    const resolvedObtained =
      obtained != null ? (resolvedMaxScore == null ? obtained : Math.min(obtained, resolvedMaxScore)) : null;

    const payload: CourseItemCreate = {
      student_course_id: selectedRegisteredCourse.id,
      item_name: newItem.item_name,
      total_weight_pct: weightNum,
      max_score: resolvedMaxScore,
      obtained_score: resolvedObtained,
    };

    try {
      const created = await gradeStatisticsApi.addCourseItem(payload);
      setRegisteredCourses((prev) =>
        prev.map((rc) =>
          rc.id === selectedRegisteredCourse.id ? { ...rc, items: [...rc.items, created] } : rc,
        ),
      );
      handleCloseAddModal();
    } catch (error) {
      console.error("Failed to add course item:", error);
    }
  }, [
    selectedRegisteredCourse,
    newItem.item_name,
    newItemInput.weight,
    newItemInput.max,
    newItemInput.obtained,
    handleCloseAddModal,
  ]);

  const handleUpdateItem = useCallback(async () => {
    if (!itemToEdit) return;
    const weightNum = sanitizeNonNegative(
      newItemInput.weight ? Number(newItemInput.weight.replace(/,/g, ".")) : null,
    );
    const obtainedRaw = sanitizeNonNegative(
      newItemInput.obtained ? Number(newItemInput.obtained.replace(/,/g, ".")) : null,
    );
    const maxScoreRaw = sanitizeNonNegative(
      newItemInput.max ? Number(newItemInput.max.replace(/,/g, ".")) : null,
    );
    const resolvedMaxScore = maxScoreRaw != null && maxScoreRaw > 0 ? maxScoreRaw : null;
    const resolvedObtained =
      obtainedRaw != null ? (resolvedMaxScore == null ? obtainedRaw : Math.min(obtainedRaw, resolvedMaxScore)) : null;
    try {
      const updated = await gradeStatisticsApi.updateCourseItem(itemToEdit.id, {
        item_name: newItem.item_name || itemToEdit.item_name,
        total_weight_pct: weightNum,
        max_score: resolvedMaxScore,
        obtained_score: resolvedObtained,
      });
      setRegisteredCourses((prev) =>
        prev.map((rc) => ({
          ...rc,
          items: rc.items.map((it) => (it.id === updated.id ? updated : it)),
        })),
      );
      handleCloseEditModal();
    } catch (error) {
      console.error("Failed to update course item:", error);
    }
  }, [
    itemToEdit,
    newItem.item_name,
    newItemInput.weight,
    newItemInput.max,
    newItemInput.obtained,
    handleCloseEditModal,
  ]);

  const handleDeleteItemConfirm = useCallback(async () => {
    if (!itemToDelete) return;
    try {
      await gradeStatisticsApi.deleteCourseItem(itemToDelete.id);
      setRegisteredCourses((prev) =>
        prev.map((rc) => ({
          ...rc,
          items: rc.items.filter((item) => item.id !== itemToDelete.id),
        })),
      );
    } catch (error) {
      console.error("Failed to delete course item:", error);
    } finally {
      setItemToDelete(null);
    }
  }, [itemToDelete]);

  return {
    registeredCourses,
    filteredCourses,
    metrics: {
      totalGPA,
      maxPotentialGPA,
      projectedGPA,
    },
    withdraw: {
      ids: withdrawnCourseIds,
      toggle: handleToggleWithdraw,
    },
    schedule: {
      data: scheduleData,
      meta: scheduleMeta,
      loading: scheduleLoading,
      lastSyncedText: scheduleLastSyncedText,
      isOpen: isScheduleOpen,
      open: openSchedule,
      close: closeSchedule,
    },
    assignment: {
      form: {
        itemName: newItem.item_name ?? "",
        weight: newItemInput.weight,
        max: newItemInput.max,
        obtained: newItemInput.obtained,
        updateName: handleNameChange,
        updateWeight: (value: string) => handleNumericChange("weight", value),
        updateMax: (value: string) => handleNumericChange("max", value),
        updateObtained: (value: string) => handleNumericChange("obtained", value),
        nameError,
        weightError,
        maxError,
        obtainedError,
        statusCard: assignmentStatusCard,
        isValid: isAddOrEditValid,
      },
      addModal: {
        isOpen: isAddItemModalOpen,
        course: selectedRegisteredCourse,
        open: handleOpenAddModal,
        close: handleCloseAddModal,
        submit: handleAddItem,
      },
      editModal: {
        item: itemToEdit,
        open: handleEditItem,
        close: handleCloseEditModal,
        submit: handleUpdateItem,
      },
    },
    deletion: {
      item: itemToDelete,
      request: handleDeleteItem,
      cancel: () => setItemToDelete(null),
      confirm: handleDeleteItemConfirm,
    },
    templates: {
      isOpen: isTemplateDrawerOpen,
      course: templateDrawerCourse,
      templates,
      importingTemplateId,
      isInitialFetch: isTemplatesInitialFetch,
      isLoading: templatesLoading,
      open: handleOpenTemplates,
      close: closeTemplateDrawer,
      loadMore: handleLoadMoreTemplates,
      importTemplate: handleImportTemplate,
    },
    sharing: {
      course: sharingCourse,
      isOpen: isShareModalOpen,
      open: openShareModal,
      close: closeShareModal,
      submit: handleShareTemplate,
      isSubmitting: isSharing,
    },
    syncCourses: handleSyncCourses,
  };
}

export type LiveGpaViewModel = ReturnType<typeof useLiveGpaViewModel>;
