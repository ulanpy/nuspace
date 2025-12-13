import { apiCall } from "@/utils/api";
import {
  BaseCourseFilters,
  BaseCourseItem,
  BaseCourseListResponse,
  CourseItemCreate,
  CourseItemUpdate,
  GradeStatisticsFilters,
  GradeStatisticsResponse,
  PlannerAutoBuildResponse,
  PlannerCourseAddPayload,
  PlannerCourseResponse,
  PlannerCourseSearchResponse,
  PlannerSchedule,
  PlannerSection,
  PlannerSectionSelectionPayload,
  SemesterOption,
  RegistrarSyncResponse,
  RegisteredCourse,
  StudentScheduleResponse,
  TemplateCreatePayload,
  TemplateFilters,
  TemplateImportResponse,
  TemplateListResponse,
  TemplateResponse,
  TemplateUpdatePayload,
} from "../types";

export const gradeStatisticsApi = {
  getGradeStatistics: async (filters?: GradeStatisticsFilters): Promise<GradeStatisticsResponse> => {
    const params = new URLSearchParams();
    
    if (filters?.keyword) params.append('keyword', filters.keyword);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.size) params.append('size', filters.size.toString());

    return await apiCall(`/grades?${params.toString()}`);
  },
  // ==== Courses APIs (Live GPA) ====
  getCourses: async (filters?: BaseCourseFilters): Promise<BaseCourseListResponse> => {
    const params = new URLSearchParams();
    if (filters?.keyword) params.append('keyword', filters.keyword);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.size) params.append('size', String(filters.size));
    if (filters?.term) params.append('term', filters.term);
    return await apiCall(`/courses?${params.toString()}`);
  },
  // ==== Registered Courses APIs ====
  getRegisteredCourses: async (): Promise<RegisteredCourse[]> => {
    return await apiCall(`/registered_courses`);
  },

  syncRegistrarCourses: async (payload: { password: string }): Promise<RegistrarSyncResponse> => {
    return await apiCall(`/registered_courses/sync`, { method: 'POST', json: payload });
  },

  getSchedule: async (): Promise<StudentScheduleResponse | null> => {
    const response = await apiCall<StudentScheduleResponse | null>(`/registered_courses/schedule`);
    return response ?? null;
  },
  
  // ==== Course Items APIs ====
  addCourseItem: async (payload: CourseItemCreate): Promise<BaseCourseItem> => {
    return await apiCall(`/course_items`, { method: 'POST', json: payload });
  },
  
  updateCourseItem: async (itemId: number, payload: CourseItemUpdate): Promise<BaseCourseItem> => {
    return await apiCall(`/course_items/${itemId}`, { method: 'PATCH', json: payload });
  },
  
  deleteCourseItem: async (itemId: number): Promise<void> => {
    await apiCall(`/course_items/${itemId}`, { method: 'DELETE' });
  },

  // ==== Templates APIs ====
  createTemplate: async (payload: TemplateCreatePayload): Promise<TemplateResponse> => {
    return await apiCall(`/templates`, { method: 'POST', json: payload });
  },

  updateTemplate: async (templateId: number, payload: TemplateUpdatePayload): Promise<TemplateResponse> => {
    return await apiCall(`/templates/${templateId}`, { method: 'PATCH', json: payload });
  },

  getTemplates: async (filters: TemplateFilters): Promise<TemplateListResponse> => {
    const params = new URLSearchParams();
    if (filters.course_id != null) params.append('course_id', String(filters.course_id));
    if (filters.page) params.append('page', String(filters.page));
    if (filters.size) params.append('size', String(filters.size));
    return await apiCall(`/templates?${params.toString()}`);
  },

  importTemplate: async (templateId: number, studentCourseId: number): Promise<TemplateImportResponse> => {
    return await apiCall(`/templates/${templateId}/import?student_course_id=${studentCourseId}`, { method: 'POST' });
  },

  // ==== Planner APIs ====
  getPlannerSchedule: async (): Promise<PlannerSchedule> => {
    return await apiCall(`/planner`);
  },

  getPlannerSemesters: async (): Promise<SemesterOption[]> => {
    return await apiCall(`/planner/semesters`);
  },

  searchPlannerCourses: async ({
    term_value,
    query,
    page = 1,
  }: {
    term_value: string;
    query?: string;
    page?: number;
  }): Promise<PlannerCourseSearchResponse> => {
    const params = new URLSearchParams();
    params.append("term_value", term_value);
    if (query) params.append("course_code", query);
    if (page) params.append("page", String(page));
    return await apiCall(`/planner/courses/search?${params.toString()}`);
  },

  refreshPlannerCourses: async (): Promise<PlannerSchedule> => {
    return await apiCall(`/planner/courses/refresh`, { method: "POST" });
  },

  addPlannerCourse: async (payload: PlannerCourseAddPayload): Promise<PlannerCourseResponse> => {
    return await apiCall(`/planner/courses`, { method: 'POST', json: payload });
  },

  removePlannerCourse: async (courseId: number): Promise<void> => {
    await apiCall(`/planner/courses/${courseId}`, { method: 'DELETE' });
  },

  fetchPlannerSections: async (courseId: number, refresh = false): Promise<PlannerSection[]> => {
    const params = new URLSearchParams();
    if (refresh) params.append("refresh", "true");
    return await apiCall(`/planner/courses/${courseId}/sections?${params.toString()}`);
  },

  selectPlannerSections: async (
    courseId: number,
    payload: PlannerSectionSelectionPayload,
  ): Promise<PlannerCourseResponse> => {
    return await apiCall(`/planner/courses/${courseId}/sections/select`, {
      method: 'POST',
      json: payload,
    });
  },

  autoBuildPlanner: async (): Promise<PlannerAutoBuildResponse> => {
    return await apiCall(`/planner/autobuild`, { method: 'POST' });
  },

  resetPlanner: async (term_value?: string): Promise<void> => {
    await apiCall(`/planner/reset`, { method: 'POST', json: { term_value } });
  },

};
