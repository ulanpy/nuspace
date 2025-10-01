import { apiCall } from "@/utils/api";
import {
  GradeStatisticsResponse,
  GradeStatisticsFilters,
  BaseCourseFilters,
  BaseCourseListResponse,
  BaseCourseItem,
  RegisteredCourse,
  CourseItemCreate,
  CourseItemUpdate,
  RegisteredCourseCreate,
  TemplateCreatePayload,
  TemplateFilters,
  TemplateListResponse,
  TemplateImportResponse,
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
  getTerms: async (): Promise<string[]> => {
    return await apiCall('/terms');
  },
  
  // ==== Registered Courses APIs ====
  getRegisteredCourses: async (): Promise<RegisteredCourse[]> => {
    return await apiCall(`/registered_courses`);
  },
  
  registerCourse: async (payload: RegisteredCourseCreate): Promise<RegisteredCourse> => {
    return await apiCall(`/registered_courses`, { method: 'POST', json: payload });
  },
  
  unregisterCourse: async (studentCourseId: number): Promise<void> => {
    await apiCall(`/registered_courses/${studentCourseId}`, { method: 'DELETE' });
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
};
