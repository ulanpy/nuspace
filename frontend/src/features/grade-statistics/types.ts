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

