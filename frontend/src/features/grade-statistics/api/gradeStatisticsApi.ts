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
};
