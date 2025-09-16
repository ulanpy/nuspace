"use client";

import { useMemo, useState } from "react";
import { GradeStatisticsCard } from "../components/GradeStatisticsCard";
import { RegisteredCourseCard } from "../components/RegisteredCourseCard";
import { GradeStatistics, BaseCourse, RegisteredCourse, CourseItemCreate, BaseCourseItem } from "../types";
import { SearchableInfiniteList } from "@/components/virtual/SearchableInfiniteList";
import { usePreSearchGrades } from "../api/hooks/usePreSearchGrades";
import { BarChart3, Calculator, Plus, Search } from "lucide-react";
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
import { useUser } from "@/hooks/use-user";
import { Modal } from "@/components/atoms/modal";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { ToggleGroup, ToggleGroupItem } from "@/components/atoms/toggle-group";

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

  // Smart numeric input helpers (mobile-first): allow digits + one decimal, clamp 0..100
  const normalizeNumberInput = (raw: string): string => {
    const replaced = raw.replace(/,/g, ".");
    const filtered = replaced.replace(/[^0-9.]/g, "");
    const firstDot = filtered.indexOf(".");
    const singleDecimal = firstDot === -1
      ? filtered
      : filtered.slice(0, firstDot + 1) + filtered.slice(firstDot + 1).replace(/\./g, "");
    if (singleDecimal === "" || singleDecimal === ".") return singleDecimal; // allow typing start
    const num = Number(singleDecimal);
    if (Number.isNaN(num)) return "";
    const clamped = Math.max(0, Math.min(100, num));
    return clamped.toString();
  };

  const parseInput = (raw: string): number | null => {
    if (!raw) return null;
    const v = Number(raw.replace(/,/g, "."));
    return Number.isNaN(v) ? null : v;
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
      <div className="w-full max-w-none">

        {/* Tabs: Course Statistics vs Live GPA */}
        <Tabs defaultValue="live-gpa">
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="live-gpa">Your Live GPA</TabsTrigger>
            <TabsTrigger value="course-stats">Course Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="live-gpa">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">Live GPA Calculator</h2>
                </div>
                {user && (
                  <>
                    <Button size="sm" onClick={() => setIsAddCourseModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Course
                    </Button>
                    <Modal
                      isOpen={isAddCourseModalOpen}
                      onClose={() => setIsAddCourseModalOpen(false)}
                      title="Find & Register Courses"
                    >
                      <div className="relative my-3">
                        <label className="text-sm font-medium mb-2 block">Select Term</label>
                        <select 
                          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={selectedTerm || ''}
                          onChange={(e) => setSelectedTerm(e.target.value || null)}
                        >
                          <option value="">Select a term...</option>
                          {terms.map(term => (
                            <option key={term} value={term}>{term}</option>
                          ))}
                        </select>
                      </div>
                      <div className="relative my-3">
                        <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
                        <Input
                          className="pl-8"
                          placeholder="Search course code, title or faculty..."
                          value={courseSearch}
                          onChange={(e) => setCourseSearch(e.target.value)}
                          disabled={!selectedTerm}
                        />
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {availableCourses.map(course => (
                          <div key={course.id} className="flex items-center justify-between p-2 border rounded-md">
                            <div className="flex-1">
                              <div className="text-sm font-medium">
                                {course.course_code} {course.section ? `(${course.section})` : ''}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {course.faculty} · {course.credits} credits · {course.term}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleRegisterCourse(course.id)}
                              className="ml-2"
                            >
                              Add
                            </Button>
                          </div>
                        ))}
                        {availableCourses.length === 0 && (
                          <div className="text-sm text-muted-foreground text-center py-4">
                            {!selectedTerm
                              ? 'Please select a term to begin'
                              : courseSearch
                                ? 'No matching courses found'
                                : 'Start typing to search for courses.'}
                          </div>
                        )}
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
                  title={`Add Item to ${selectedRegisteredCourse.course.course_code}`}
                >
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                title="Delete Course Item"
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
                  title={`Edit Item: ${itemToEdit.item_name}`}
                >
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <label className="text-sm font-medium mb-2 block">Obtained Score (%)</label>
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

              {!user ? (
                <div className="p-4 border rounded-md bg-muted/30 flex items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">Login to track your course progress this semester.</div>
                  <Button onClick={login} size="sm">Login</Button>
                </div>
              ) : (
                <>
                  {/* Total GPA Display */}
                  {registeredCourses.length > 0 && (
                    <Card className="mb-6">
                      <CardContent className="p-6">
                        <div className="flex flex-col items-center gap-4">
                          <div className="text-center">
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              {gpaMode === 'semester' ? 'Current Semester GPA' : gpaMode === 'maxPossible' ? 'Max Possible Semester GPA' : 'Projected Semester GPA'}
                            </h3>
                            <div className={`text-4xl font-bold ${getGPAColorClass(displayedGPA)}`}>
                              {formatGPA(displayedGPA)}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                              Based on {registeredCourses.length} registered course{registeredCourses.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <ToggleGroup 
                            type="single" 
                            value={gpaMode}
                            onValueChange={(value) => {
                              if (value) setGpaMode(value as 'semester' | 'maxPossible' | 'projected');
                            }}
                            className="w-full max-w-sm grid grid-cols-3"
                          >
                            <ToggleGroupItem value="semester" aria-label="Toggle semester GPA">
                              Semester
                            </ToggleGroupItem>
                            <ToggleGroupItem value="maxPossible" aria-label="Toggle max possible semester GPA">
                              Max
                            </ToggleGroupItem>
                            <ToggleGroupItem value="projected" aria-label="Toggle projected semester GPA">
                              Projected
                            </ToggleGroupItem>
                          </ToggleGroup>
                          <p className="text-xs text-center text-gray-500 max-w-md">
                            {gpaMode === 'semester' 
                              ? 'GPA using current contributions (treating missing items as zero).'
                              : gpaMode === 'maxPossible'
                                ? 'Maximum possible GPA if you ace all remaining course work (credit-weighted).'
                                : 'Projected GPA assuming your average item score continues for remaining weight (credit-weighted).'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Registered Courses */}
                  {registeredCourses.length > 0 ? (
                    <div className="space-y-4">
                      {registeredCourses.map((registeredCourse) => (
                        <RegisteredCourseCard
                          key={registeredCourse.id}
                          registeredCourse={registeredCourse}
                          onDeleteCourse={handleUnregisterCourse}
                          onAddItem={(courseId) => {
                            const course = registeredCourses.find(rc => rc.id === courseId);
                            if (course) {
                              setSelectedRegisteredCourse(course);
                              setIsAddItemModalOpen(true);
                            }
                          }}
                          onDeleteItem={handleDeleteItem}
                          onEditItem={handleEditItem}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No courses registered. Click "Add Course" to register courses and start tracking your GPA.</p>
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