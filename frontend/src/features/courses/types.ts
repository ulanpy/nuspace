export interface GradeStatistics {
  id: number;
  course_code: string;
  course_title: string;
  section: string;
  term: string;
  grades_count: number;
  avg_gpa: number;
  std_dev: number;
  median_gpa: number;
  pct_A: number;
  pct_B: number;
  pct_C: number;
  pct_D: number;
  pct_F: number;
  pct_P: number;
  pct_I: number;
  pct_AU: number;
  pct_W_AW: number;
  letters_count: number;
  faculty: string;
  created_at: string;
  updated_at: string;
}

export interface GradeStatisticsResponse {
  grades: GradeStatistics[];
  total_pages: number;
}

export interface GradeStatisticsFilters {
  search?: string;
  keyword?: string;
  page?: number;
  size?: number;
}

export interface GradeDistribution {
  grade: string;
  percentage: number;
  count: number;
  color: string;
}


// ==== Live GPA / Courses types ====
export interface BaseCourse {
  id: number;
  registrar_id: number;
  course_code: string;
  pre_req: string | null;
  anti_req: string | null;
  co_req: string | null;
  level: string;
  school: string;
  description: string | null;
  department: string | null;
  title: string | null;
  credits: number | null;
  term: string | null;
  created_at: string;
  updated_at: string;
}

export interface BaseCourseListResponse {
  courses: BaseCourse[];
  total_pages: number;
}

export interface BaseCourseFilters {
  keyword?: string;
  page?: number;
  size?: number;
  term?: string;
}

export interface BaseCourseItem {
  id: number;
  student_course_id: number;
  item_name: string;
  total_weight_pct: number | null; // e.g., 20.00 for 20%
  obtained_score: number | null;
  max_score: number | null;
  isIncludedInGPA?: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentCourse {
  id: number;
  student_sub: string;
  course_id: number;
  created_at: string;
  updated_at: string;
}

export interface RegisteredCourse {
  id: number;
  course: BaseCourse;
  items: BaseCourseItem[];
  section?: string | null;
  class_average?: number | null;
  gpaCoverage?: {
    currentIncluded: number;
    currentExcluded: number;
  };
}

export interface CourseWithItems {
  course: BaseCourse;
  items: BaseCourseItem[];
}

export interface CourseItemCreate {
  student_course_id: number;
  item_name: string;
  total_weight_pct?: number | null;
  obtained_score?: number | null;
  max_score?: number | null;
}

export interface CourseItemUpdate {
  item_name?: string;
  total_weight_pct?: number | null;
  obtained_score?: number | null;
  max_score?: number | null;
}

export interface RegisteredCourseCreate {
  course_id: number;
  student_sub?: string;
}

// ==== Templates ====

export interface TemplateItem {
  id: number;
  template_id: number;
  item_name: string;
  total_weight_pct: number | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateCourseInfo {
  id: number;
  course_id: number;
  student_sub: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateStudentInfo {
  sub: string;
  name: string;
  surname: string;
  picture: string;
}

export interface TemplateResponse {
  template: TemplateCourseInfo;
  template_items: TemplateItem[];
  student: TemplateStudentInfo;
}

export interface TemplateListResponse {
  templates: TemplateResponse[];
  total_pages: number;
}

export interface TemplateFilters {
  course_id?: number;
  page?: number;
  size?: number;
}

export interface TemplateItemCreatePayload {
  item_name: string;
  total_weight_pct: number | null;
}

export interface TemplateItemUpdatePayload {
  item_name?: string | null;
  total_weight_pct?: number | null;
}

export interface TemplateCreatePayload {
  course_id: number;
  student_sub: string;
  template_items: TemplateItemCreatePayload[];
}

export interface TemplateUpdatePayload {
  template_items: TemplateItemUpdatePayload[];
}

export interface TemplateImportResponse {
  student_course_id: number;
  items: BaseCourseItem[];
}

export interface TemplateListItem {
  template: TemplateCourseInfo;
  student: TemplateStudentInfo;
  template_items: TemplateItem[];
}

export interface TemplateListResponse {
  templates: TemplateListItem[];
  total_pages: number;
}

// ==== Semester types ====
export interface SemesterOption {
  label: string;
  value: string;
}

export interface RegisteredCourseResponse extends RegisteredCourse {
  class_average: number | null;
}

export interface ScheduleTime {
  start: {
    hh: number;
    mm: number;
  };
  end: {
    hh: number;
    mm: number;
  };
}

export interface UserScheduleItem {
  label: string;
  title: string;
  info: string;
  teacher: string;
  cab: string;
  course_code: string;
  time: ScheduleTime;
}

export interface SchedulePreferences {
  classes: string[];
  colors: Record<string, string>;
}

export interface ScheduleResponse {
  data: UserScheduleItem[][];
  preferences: SchedulePreferences;
}

export interface RegistrarSyncResponse {
  synced_courses: RegisteredCourse[];
  total_synced: number;
  added_count: number;
  deleted_count: number;
  kept_count: number;
  schedule?: ScheduleResponse | null;
  term_label?: string | null;
  term_value?: string | null;
  last_synced_at?: string | null;
}

export interface StudentScheduleResponse {
  term_label: string | null;
  term_value: string | null;
  last_synced_at: string | null;
  schedule: ScheduleResponse;
}
