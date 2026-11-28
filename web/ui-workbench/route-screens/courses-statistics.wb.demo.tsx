export interface PrototypeGradeReport {
  id: number
  course_code: string
  course_title: string
  section: string
  term: string
  faculty: string
  grades_count: number
  avg_gpa: number
  median_gpa: number
  std_dev: number | null
  pct_A: number | null
  pct_B: number | null
  pct_C: number | null
  pct_D: number | null
  pct_F: number | null
  pct_W_AW: number | null
}

export const TERMS = ["Fall 2026", "Spring 2026", "Fall 2025"]

export const REPORTS: PrototypeGradeReport[] = [
  {
    id: 1,
    course_code: "CS 302",
    course_title: "Data Structures and Algorithms",
    section: "01",
    term: "Fall 2026",
    faculty: "Aigerim Sbeketova",
    grades_count: 84,
    avg_gpa: 3.12,
    median_gpa: 3.33,
    std_dev: 0.41,
    pct_A: 34.5,
    pct_B: 33.3,
    pct_C: 17.9,
    pct_D: 8.3,
    pct_F: 6,
    pct_W_AW: 2.4,
  },
  {
    id: 2,
    course_code: "MATH 252",
    course_title: "Discrete Mathematics",
    section: "02",
    term: "Fall 2026",
    faculty: "Daniyar Aubakirov",
    grades_count: 126,
    avg_gpa: 2.61,
    median_gpa: 3,
    std_dev: 0.68,
    pct_A: 19.8,
    pct_B: 27.8,
    pct_C: 25.4,
    pct_D: 15.9,
    pct_F: 11.1,
    pct_W_AW: 4.8,
  },
  {
    id: 3,
    course_code: "ECON 1207",
    course_title: "Microeconomics",
    section: "01",
    term: "Fall 2026",
    faculty: "Marat Nurlanov",
    grades_count: 211,
    avg_gpa: 3.44,
    median_gpa: 3.67,
    std_dev: 0.29,
    pct_A: 52.6,
    pct_B: 26.1,
    pct_C: 12.3,
    pct_D: 4.7,
    pct_F: 4.3,
    pct_W_AW: 1.1,
  },
  {
    id: 4,
    course_code: "PHYS 101",
    course_title: "General Physics",
    section: "03",
    term: "Fall 2026",
    faculty: "Yelena Kuznetsova",
    grades_count: 97,
    avg_gpa: 2.24,
    median_gpa: 2.33,
    std_dev: 0.79,
    pct_A: 11.3,
    pct_B: 21.6,
    pct_C: 26.8,
    pct_D: 19.6,
    pct_F: 20.7,
    pct_W_AW: 7.2,
  },
  {
    id: 5,
    course_code: "PSY 101",
    course_title: "Introduction to Psychology",
    section: "01",
    term: "Fall 2026",
    faculty: "Zhulduz Rakhimova",
    grades_count: 158,
    avg_gpa: 3.71,
    median_gpa: 3.67,
    std_dev: 0.33,
    pct_A: 61.4,
    pct_B: 22.8,
    pct_C: 8.9,
    pct_D: 3.2,
    pct_F: 3.7,
    pct_W_AW: 0.6,
  },
  {
    id: 6,
    course_code: "CS 401",
    course_title: "Machine Learning",
    section: "01",
    term: "Fall 2025",
    faculty: "Arman Sagdyshev",
    grades_count: 64,
    avg_gpa: 2.88,
    median_gpa: 3,
    std_dev: 0.55,
    pct_A: 23.4,
    pct_B: 29.7,
    pct_C: 23.4,
    pct_D: 12.5,
    pct_F: 11,
    pct_W_AW: 3.1,
  },
]
