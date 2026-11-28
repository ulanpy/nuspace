export interface PrototypeItem {
  id: number
  student_course_id: number
  item_name: string
  total_weight_pct: number | null
  obtained_score: number | null
  max_score: number | null
}

export interface PrototypeCourse {
  id: number
  course: {
    course_code: string
    title: string | null
    school: string
    credits: number | null
    term: string | null
  }
  items: PrototypeItem[]
  class_average: number | null
  professor: string | null
}

function item(
  id: number,
  student_course_id: number,
  item_name: string,
  total_weight_pct: number | null,
  obtained_score: number | null,
  max_score: number | null
): PrototypeItem {
  return {
    id,
    student_course_id,
    item_name,
    total_weight_pct,
    obtained_score,
    max_score,
  }
}

export const COURSES: PrototypeCourse[] = [
  {
    id: 1,
    course: {
      course_code: "CS 302",
      title: "Data Structures and Algorithms",
      school: "School of Computing and Data Science",
      credits: 6,
      term: "FA2026",
    },
    items: [
      item(11, 1, "Assignment 1", 10, 92, 100),
      item(12, 1, "Assignment 2", 10, 88, 100),
      item(13, 1, "Midterm", 25, 84, 100),
      item(14, 1, "Project", 30, 91, 100),
      item(15, 1, "Final", 25, null, null),
    ],
    class_average: 71,
    professor: "Aigerim Sbeketova",
  },
  {
    id: 2,
    course: {
      course_code: "MATH 252",
      title: "Discrete Mathematics",
      school: "School of Mathematics",
      credits: 6,
      term: "FA2026",
    },
    items: [
      item(21, 2, "Homework 1", 10, 45, 50),
      item(22, 2, "Homework 2", 10, 41, 50),
      item(23, 2, "Quiz", 20, 18, 20),
      item(24, 2, "Midterm", 30, 88, 100),
      item(25, 2, "Final", 30, null, null),
    ],
    class_average: 66,
    professor: "Daniyar Aubakirov",
  },
  {
    id: 3,
    course: {
      course_code: "ECON 1207",
      title: "Microeconomics",
      school: "School of Economics and Management",
      credits: 4,
      term: "FA2026",
    },
    items: [
      item(31, 3, "Quiz 1", 10, 8, 10),
      item(32, 3, "Case study", 20, 21, 25),
      item(33, 3, "Essay", 10, 9, 10),
      item(34, 3, "Midterm", 20, 88, 100),
      item(35, 3, "Final", 40, null, null),
    ],
    class_average: 63,
    professor: "Marat Nurlanov",
  },
  {
    id: 4,
    course: {
      course_code: "PHYS 101",
      title: "General Physics",
      school: "School of Engineering and Digital Sciences",
      credits: 4,
      term: "FA2026",
    },
    items: [
      item(41, 4, "Lab 1", 15, 27, 30),
      item(42, 4, "Lab 2", 15, 29, 30),
      item(43, 4, "Midterm", 30, 91, 100),
      item(44, 4, "Final", 40, null, null),
    ],
    class_average: 68,
    professor: "Yelena Kuznetsova",
  },
  {
    id: 5,
    course: {
      course_code: "PSY 101",
      title: "Introduction to Psychology",
      school: "School of Humanities",
      credits: 4,
      term: "FA2026",
    },
    items: [
      item(51, 5, "Reading quiz", 20, 19, 20),
      item(52, 5, "Essay", 30, 25, 30),
      item(53, 5, "Group project", 20, 18, 20),
      item(54, 5, "Final", 30, 26, 30),
    ],
    class_average: 74,
    professor: "Zhulduz Rakhimova",
  },
]
