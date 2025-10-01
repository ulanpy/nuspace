"use client";

import { useMemo, useState, useCallback } from "react";
import { GradeStatisticsCard } from "../components/GradeStatisticsCard";
import { RegisteredCourseCard } from "../components/RegisteredCourseCard";
import {
  GradeStatistics,
  BaseCourse,
  RegisteredCourse,
  CourseItemCreate,
  BaseCourseItem,
  TemplateResponse,
} from "../types";
import { SearchableInfiniteList } from "@/components/virtual/SearchableInfiniteList";
import { usePreSearchGrades } from "../api/hooks/usePreSearchGrades";
import { BarChart3, Calculator, Plus, Search, UsersRound, Share2, RefreshCw } from "lucide-react";
import MotionWrapper from "@/components/atoms/motion-wrapper";
import { Card, CardContent } from "@/components/atoms/card";
import { gradeStatisticsApi } from "../api/gradeStatisticsApi";
import { 
  calculateTotalGPA, 
  calculateMaxPossibleTotalGPA,
  calculateProjectedTotalGPA,
  formatGPA, 
  getGPAColorClass 
} from "../utils/gradeUtils";
import { useEffect } from "react";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/select";
import { useUser } from "@/hooks/use-user";
import { Modal } from "@/components/atoms/modal";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { ToggleGroup, ToggleGroupItem } from "@/components/atoms/toggle-group";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/atoms/sheet";
import { Skeleton } from "@/components/atoms/skeleton";
import {
  buildTemplateCreatePayload,
  canShareTemplate,
  calculateTemplateCoverage,
  sortTemplatesByRecency,
  calculateTemplateWeight,
  buildTemplateUpdatePayload,
} from "../utils/templateUtils";
import { useToast } from "@/hooks/use-toast";

export default function GradeStatisticsPage() {
  const [selected, setSelected] = useState<GradeStatistics[]>([]);
  // Live GPA state
  const [courses, setCourses] = useState<BaseCourse[]>([]);
  const [registeredCourses, setRegisteredCourses] = useState<RegisteredCourse[]>([]);
  const [selectedRegisteredCourse, setSelectedRegisteredCourse] = useState<RegisteredCourse | null>(null);
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<RegisteredCourse | null>(null);
  const [itemToDelete, setItemToDelete] = useState<BaseCourseItem | null>(null);
  const [itemToEdit, setItemToEdit] = useState<BaseCourseItem | null>(null);
  const [gpaMode, setGpaMode] = useState<'semester' | 'maxPossible' | 'projected'>('semester');
  const [hasFetched, setHasFetched] = useState(false);
  const [newItem, setNewItem] = useState<Partial<CourseItemCreate> & { max_score?: number }>({ 
    item_name: "", 
    total_weight_pct: null, 
    obtained_score_pct: null, 
    max_score: undefined 
  });
  const [newItemInput, setNewItemInput] = useState<{ weight: string; max: string; obtained: string }>({
    weight: "",
    max: "",
    obtained: "",
  });
  const [courseSearch, setCourseSearch] = useState<string>("");
  const [debouncedCourseSearch, setDebouncedCourseSearch] = useState<string>("");
  const [terms, setTerms] = useState<string[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
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

  // Debounce course search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCourseSearch(courseSearch.trim()), 250);
    return () => clearTimeout(t);
  }, [courseSearch]);

  // Fetch registered courses once on mount or when user changes
  useEffect(() => {
    if (user && !hasFetched) {
      (async () => {
        const registered = await gradeStatisticsApi.getRegisteredCourses();
        setRegisteredCourses(registered);
        const termData = await gradeStatisticsApi.getTerms();
        setTerms(termData);
        setHasFetched(true);
      })();
    } else if (!user) {
      // Clear data on logout
      setRegisteredCourses([]);
      setSelectedRegisteredCourse(null);
      setHasFetched(false);
    }
  }, [user, hasFetched]);

  // Fetch courses for searching when search term changes
  useEffect(() => {
    if (!selectedTerm) {
      setCourses([]);
      return;
    };
    (async () => {
      const courseList = await gradeStatisticsApi.getCourses({ 
        page: 1, 
        size: 50, 
        keyword: debouncedCourseSearch || undefined,
        term: selectedTerm,
      });
      setCourses(courseList.courses);
    })();
  }, [debouncedCourseSearch, selectedTerm]);

  const registeredCourseIds = useMemo(() => new Set(registeredCourses.map(rc => rc.course.id)), [registeredCourses]);
  const availableCourses = useMemo(() => courses.filter(c => !registeredCourseIds.has(c.id)), [courses, registeredCourseIds]);

  const handleRegisterCourse = async (courseId: number) => {
    try {
      const newRegisteredCourse = await gradeStatisticsApi.registerCourse({ course_id: courseId });
      setRegisteredCourses(prev => [...prev, newRegisteredCourse]);
      if (!selectedRegisteredCourse) {
        setSelectedRegisteredCourse(newRegisteredCourse);
      }
      setIsAddCourseModalOpen(false); // Close modal after successful registration
    } catch (error) {
      console.error('Failed to register course:', error);
    }
  };

  const handleUnregisterCourse = async (studentCourseId: number) => {
    const course = registeredCourses.find(rc => rc.id === studentCourseId);
    if (course) setCourseToDelete(course);
  };

  const handleUnregisterCourseConfirm = async () => {
    if (!courseToDelete) return;
    try {
      await gradeStatisticsApi.unregisterCourse(courseToDelete.id);
      setRegisteredCourses(prev => prev.filter(rc => rc.id !== courseToDelete.id));
    } catch (error) {
      console.error('Failed to unregister course:', error);
    }
  };

  const handleDeleteItem = (item: BaseCourseItem) => {
    setItemToDelete(item);
  };

  const handleEditItem = (item: BaseCourseItem) => {
    setItemToEdit(item);
    setNewItem({
      item_name: item.item_name,
      total_weight_pct: item.total_weight_pct,
      obtained_score_pct: item.obtained_score_pct,
      max_score: undefined,
    });
    setNewItemInput({
      weight: item.total_weight_pct != null ? String(item.total_weight_pct) : "",
      max: "",
      obtained: item.obtained_score_pct != null ? String(item.obtained_score_pct) : "",
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
  const displayedGPA = useMemo(() => {
    if (gpaMode === 'semester') {
      return calculateTotalGPA(registeredCourses);
    }
    if (gpaMode === 'maxPossible') {
      return calculateMaxPossibleTotalGPA(registeredCourses);
    }
    return calculateProjectedTotalGPA(registeredCourses);
  }, [registeredCourses, gpaMode]);

  const clamp0to100 = (value: number | null | undefined): number | null => {
    if (value == null || Number.isNaN(value)) return null;
    return Math.max(0, Math.min(100, value));
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
    return Number.isNaN(v) ? null : Math.min(100, Math.max(0, v));
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
    return newItemInput.max === "" || (n != null && n >= 0 && n <= 100);
  })();
  const obtainedNumValid = (() => {
    const o = parseInput(newItemInput.obtained);
    const m = parseInput(newItemInput.max);
    if (newItemInput.obtained === "") return true;
    if (o == null || o < 0 || o > 100) return false;
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
    const weightNum = clamp0to100(weightNumRaw);
    const maxScoreNum = typeof maxScoreNumRaw === 'number' ? clamp0to100(maxScoreNumRaw) ?? undefined : undefined;
    const obtainedRaw = clamp0to100(obtainedRawRaw);
    // Convert raw scores to percentage of the item (max -> 100%)
    let obtainedPct = Number(obtainedRaw ?? 0);
    const maxScore = typeof maxScoreNum === 'number' ? maxScoreNum : null;
    if (maxScore && maxScore > 0) {
      obtainedPct = Math.min(100, (Number(obtainedRaw ?? 0) / maxScore) * 100);
    }

    const payload: CourseItemCreate = {
      student_course_id: selectedRegisteredCourse.id,
      item_name: newItem.item_name!,
      total_weight_pct: weightNum,
      obtained_score_pct: obtainedPct,
    };
    
    try {
      const newItem = await gradeStatisticsApi.addCourseItem(payload);
      // Update the registered courses list with the new item
      setRegisteredCourses(prev => prev.map(rc => 
        rc.id === selectedRegisteredCourse.id 
          ? { ...rc, items: [...rc.items, newItem] }
          : rc
      ));
      setNewItem({ item_name: "", total_weight_pct: null, obtained_score_pct: null, max_score: undefined });
      setNewItemInput({ weight: "", max: "", obtained: "" });
      setIsAddItemModalOpen(false);
      setSelectedRegisteredCourse(null);
    } catch (error) {
      console.error('Failed to add course item:', error);
    }
  };

  const handleUpdateItem = async () => {
    if (!itemToEdit) return;
    const weightNum = clamp0to100(newItemInput.weight ? Number(newItemInput.weight.replace(/,/g, '.')) : null);
    const obtainedRaw = clamp0to100(newItemInput.obtained ? Number(newItemInput.obtained.replace(/,/g, '.')) : null);
    const maxScoreNumRaw = newItemInput.max ? Number(newItemInput.max.replace(/,/g, '.')) : undefined;
    const maxScoreNum = typeof maxScoreNumRaw === 'number' ? clamp0to100(maxScoreNumRaw) ?? undefined : undefined;
    let obtainedPct: number | null = obtainedRaw;
    if (maxScoreNum && maxScoreNum > 0 && obtainedRaw != null) {
      obtainedPct = Math.min(100, (obtainedRaw / maxScoreNum) * 100);
    }
    try {
      const updated = await gradeStatisticsApi.updateCourseItem(itemToEdit.id, {
        item_name: newItem.item_name || itemToEdit.item_name,
        total_weight_pct: weightNum,
        obtained_score_pct: obtainedPct,
      });
      setRegisteredCourses(prev => prev.map(rc => ({
        ...rc,
        items: rc.items.map(it => it.id === updated.id ? updated : it)
      })));
      setItemToEdit(null);
      setNewItem({ item_name: "", total_weight_pct: null, obtained_score_pct: null, max_score: undefined });
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
            <TabsTrigger value="live-gpa">Your Live GPA</TabsTrigger>
            <TabsTrigger value="course-stats">Course Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="live-gpa">
            <div className="space-y-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calculator className="h-5 w-5" />
                  <h2 className="text-base font-medium text-foreground">Live GPA overview</h2>
                </div>
                {user && (
                  <>
                    <Button size="sm" onClick={() => setIsAddCourseModalOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add course
                    </Button>
                    <Modal
                      isOpen={isAddCourseModalOpen}
                      onClose={() => setIsAddCourseModalOpen(false)}
                      title="Add course"
                      className="max-w-lg"
                      contentClassName="rounded-3xl"
                    >
                      <div className="space-y-4">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-foreground">Term</label>
                          <select
                            className="flex h-11 w-full items-center rounded-xl border border-border/60 bg-muted/30 px-3 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={selectedTerm || ''}
                            onChange={(e) => setSelectedTerm(e.target.value || null)}
                          >
                            <option value="">Select a term…</option>
                            {terms.map(term => (
                              <option key={term} value={term}>{term}</option>
                            ))}
                          </select>
                        </div>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            className="h-11 rounded-xl border-border/60 bg-background pl-9"
                            placeholder="Search course code, title or faculty…"
                            value={courseSearch}
                            onChange={(e) => setCourseSearch(e.target.value)}
                            disabled={!selectedTerm}
                          />
                        </div>
                        <div className="max-h-72 space-y-3 overflow-y-auto rounded-2xl border border-border/60 bg-card/40 p-3">
                          {availableCourses.map(course => (
                            <div key={course.id} className="flex items-start gap-3 rounded-xl border border-border/40 bg-background/90 p-3">
                              <div className="flex-1 space-y-1 text-sm">
                                <p className="font-medium text-foreground">
                                  {course.course_code} {course.section ? `(${course.section})` : ''}
                                </p>
                                {course.course_title && (
                                  <p className="text-muted-foreground">{course.course_title}</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  {course.faculty} · {course.credits} credits · {course.term}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                className="rounded-full px-4"
                                onClick={() => handleRegisterCourse(course.id)}
                              >
                                Add
                              </Button>
                            </div>
                          ))}
                          {availableCourses.length === 0 && (
                            <div className="py-8 text-center text-sm text-muted-foreground">
                              {!selectedTerm
                                ? "Select a term to view courses"
                                : courseSearch
                                  ? "No matching courses"
                                  : "Start typing to search for courses"}
                            </div>
                          )}
                        </div>
                      </div>
                    </Modal>
                  </>
                )}
              </div>

              {/* Add Course Item Modal */}
              {selectedRegisteredCourse && (
                <Modal
                  isOpen={isAddItemModalOpen}
                  onClose={() => {
                    setIsAddItemModalOpen(false);
                    setSelectedRegisteredCourse(null);
                    setNewItem({ item_name: "", total_weight_pct: null, obtained_score_pct: null, max_score: undefined });
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
                      <div>
                        <label className="text-sm font-medium mb-2 block">Max Score</label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="e.g., 100"
                          value={newItemInput.max}
                          onChange={(e) => setNewItemInput(v => ({ ...v, max: normalizeNumberInput(e.target.value) }))}
                        />
                        {!maxNumValid && (
                          <p className="mt-1 text-xs text-red-600">Max must be between 0 and 100.</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Obtained Score</label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="e.g., 85"
                          value={newItemInput.obtained}
                          onChange={(e) => setNewItemInput(v => ({ ...v, obtained: normalizeNumberInput(e.target.value) }))}
                        />
                        {!obtainedNumValid && (
                          <p className="mt-1 text-xs text-red-600">Obtained must be 0–100 and ≤ Max.</p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => {
                        setIsAddItemModalOpen(false);
                        setSelectedRegisteredCourse(null);
                        setNewItem({ item_name: "", total_weight_pct: null, obtained_score_pct: null, max_score: undefined });
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
                isOpen={!!courseToDelete}
                onClose={() => setCourseToDelete(null)}
                onConfirm={handleUnregisterCourseConfirm}
                title="Delete Course Registration"
                description={`Are you sure you want to remove "${courseToDelete?.course.course_code}" from your registered courses? All associated items will be deleted.`}
                confirmText="Delete"
              />
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
                    setNewItem({ item_name: "", total_weight_pct: null, obtained_score_pct: null, max_score: undefined });
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
                      <div>
                        <label className="text-sm font-medium mb-2 block">Max Score</label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="e.g., 100"
                          value={newItemInput.max}
                          onChange={(e) => setNewItemInput(v => ({ ...v, max: normalizeNumberInput(e.target.value) }))}
                        />
                        {!maxNumValid && (
                          <p className="mt-1 text-xs text-red-600">Max must be between 0 and 100.</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Obtained Score</label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="e.g., 85"
                          value={newItemInput.obtained}
                          onChange={(e) => setNewItemInput(v => ({ ...v, obtained: normalizeNumberInput(e.target.value) }))}
                        />
                        {!obtainedNumValid && (
                          <p className="mt-1 text-xs text-red-600">Obtained must be 0–100 and ≤ Max.</p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => {
                        setItemToEdit(null);
                        setNewItem({ item_name: "", total_weight_pct: null, obtained_score_pct: null, max_score: undefined });
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
                      {sharingCourse.course.course_title && (
                        <p className="text-sm text-muted-foreground">
                          {sharingCourse.course.course_title}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center text-xs">
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
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Credits</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">{sharingCourse.course.credits ?? "–"}</p>
                      </div>
                    </div>

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
                          {templateDrawerCourse.course.course_title || templateDrawerCourse.course.course_code}
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-3 text-center text-xs text-muted-foreground">
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
                          <div className="rounded-xl border border-border/40 bg-background/60 p-3">
                            <p className="text-[11px] uppercase tracking-wide">Credits</p>
                            <p className="mt-1 text-lg font-semibold text-foreground">
                              {templateDrawerCourse.course.credits ?? "–"}
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
                        {templates.map((template) => {
                          const coverage = Math.min(100, Math.max(0, calculateTemplateWeight(template))).toFixed(1);
                          const createdAt = new Date(template.template.created_at);
                          return (
                            <div
                              key={template.template.id}
                              className="space-y-3 rounded-2xl border border-border/60 bg-background/85 p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-foreground">
                                    {template.student.name} {template.student.surname}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Shared on {createdAt.toLocaleDateString()}
                                  </p>
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
                              <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
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
                                <div className="rounded-lg border border-border/40 bg-muted/20 p-2">
                                  <p className="text-[10px] uppercase tracking-wide">Owner</p>
                                  <p className="mt-1 text-sm font-semibold text-foreground">Peer</p>
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

                    {!isTemplatesInitialFetch && templateDrawerCourse && (
                      <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        Importing a template will replace your current assignments for this course. You can always edit them afterwards.
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
                          {calculateMaxPossibleTotalGPA(registeredCourses).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">If you ace everything left</p>
                      </CardContent>
                    </Card>
                    <Card className="rounded-2xl border border-border/50 bg-muted/40 p-4">
                      <CardContent className="space-y-2 p-0">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Projected GPA</p>
                        <p className="text-3xl font-semibold text-foreground">
                          {calculateProjectedTotalGPA(registeredCourses).toFixed(2)}
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
                          onDeleteCourse={handleUnregisterCourse}
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
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No courses registered. Tap "Add course" to get started.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="course-stats">
            {/* Course Statistics List (historical) */}
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