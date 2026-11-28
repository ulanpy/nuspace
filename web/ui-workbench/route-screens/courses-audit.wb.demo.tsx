export interface PrototypeAuditRow {
  course_code: string
  course_name: string
  credits_required: number
  min_grade: string
  status: "Satisfied" | "Pending"
  used_courses: string
  credits_applied: number
  credits_remaining: number
  note: string
}

export const AUDIT_SUMMARY = {
  total_required: 120,
  total_applied: 96,
  total_remaining: 24,
  total_taken: 144,
}

export const AUDIT_ROWS: PrototypeAuditRow[] = [
  {
    course_code: "CS 302",
    course_name: "Data Structures and Algorithms",
    credits_required: 6,
    min_grade: "C",
    status: "Satisfied",
    used_courses: "CS 302",
    credits_applied: 6,
    credits_remaining: 0,
    note: "",
  },
  {
    course_code: "MATH 252",
    course_name: "Discrete Mathematics",
    credits_required: 6,
    min_grade: "C",
    status: "Satisfied",
    used_courses: "MATH 252",
    credits_applied: 6,
    credits_remaining: 0,
    note: "",
  },
  {
    course_code: "CS 401",
    course_name: "Machine Learning",
    credits_required: 6,
    min_grade: "C",
    status: "Satisfied",
    used_courses: "CS 401",
    credits_applied: 6,
    credits_remaining: 0,
    note: "",
  },
  {
    course_code: "CS 411",
    course_name: "Web Technologies",
    credits_required: 6,
    min_grade: "C",
    status: "Pending",
    used_courses: "",
    credits_applied: 0,
    credits_remaining: 6,
    note: "Not taken yet",
  },
  {
    course_code: "CS 412",
    course_name: "Software Engineering",
    credits_required: 6,
    min_grade: "C",
    status: "Pending",
    used_courses: "",
    credits_applied: 0,
    credits_remaining: 6,
    note: "Not taken yet",
  },
  {
    course_code: "MATH 261",
    course_name: "Applied Linear Algebra",
    credits_required: 6,
    min_grade: "C",
    status: "Pending",
    used_courses: "",
    credits_applied: 0,
    credits_remaining: 6,
    note: "Not taken yet",
  },
  {
    course_code: "HUM 110",
    course_name: "Introduction to Academic Writing",
    credits_required: 3,
    min_grade: "D",
    status: "Satisfied",
    used_courses: "HUM 110",
    credits_applied: 3,
    credits_remaining: 0,
    note: "",
  },
  {
    course_code: "PE 100",
    course_name: "Physical Education",
    credits_required: 2,
    min_grade: "P",
    status: "Satisfied",
    used_courses: "PE 100",
    credits_applied: 2,
    credits_remaining: 0,
    note: "",
  },
]
