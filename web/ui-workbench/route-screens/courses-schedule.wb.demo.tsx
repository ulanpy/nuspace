import type {
  PlannerCourse,
  PlannerSchedule,
  PlannerSection,
} from "@/lib/courses/planner"

function section(
  id: number,
  section_code: string,
  days: string,
  times: string,
  room: string | null,
  faculty: string,
  is_selected: boolean,
  capacity: number,
  enrollment_snapshot: number
): PlannerSection {
  return {
    id,
    section_code,
    days,
    times,
    room,
    faculty,
    capacity,
    enrollment_snapshot,
    is_selected,
    selected_count: is_selected ? 1 : 0,
  }
}

function course(
  id: number,
  course_code: string,
  title: string,
  school: string,
  level: string,
  term_label: string,
  term_value: string,
  capacity_total: number,
  sections: PlannerSection[]
): PlannerCourse {
  return {
    id,
    catalog_id: `cat-${id}`,
    course_code,
    title,
    level,
    school,
    term_value,
    term_label,
    capacity_total,
    sections,
    pre_req: null,
    co_req: null,
    anti_req: null,
    priority_1: null,
    priority_2: null,
    priority_3: null,
    priority_4: null,
  }
}

export const PLANNER: PlannerSchedule = {
  id: 1,
  name: "Fall 2026",
  courses: [
    course(
      1,
      "CS 302",
      "Data Structures and Algorithms",
      "School of Computing and Data Science",
      "Bachelor",
      "Fall 2026",
      "825",
      90,
      [
        section(
          101,
          "01",
          "MWF",
          "9:00 AM - 9:50 AM",
          "C1-25",
          "Aigerim Sbeketova",
          true,
          40,
          38
        ),
        section(
          102,
          "02",
          "TTh",
          "10:00 AM - 11:30 AM",
          "B1-15",
          "Arman Sagdyshev",
          false,
          35,
          35
        ),
      ]
    ),
    course(
      2,
      "MATH 252",
      "Discrete Mathematics",
      "School of Mathematics",
      "Bachelor",
      "Fall 2026",
      "825",
      120,
      [
        section(
          201,
          "01",
          "TTh",
          "9:00 AM - 10:30 AM",
          "D1-10",
          "Daniyar Aubakirov",
          true,
          60,
          57
        ),
        section(
          202,
          "02",
          "MWF",
          "11:00 AM - 12:30 PM",
          "D1-12",
          "Aigul Nurgali",
          false,
          60,
          41
        ),
      ]
    ),
    course(
      3,
      "PHYS 101",
      "General Physics",
      "School of Engineering and Digital Sciences",
      "Bachelor",
      "Fall 2026",
      "825",
      80,
      [
        section(
          301,
          "01",
          "TTh",
          "11:00 AM - 12:20 PM",
          "Lab 3",
          "Yelena Kuznetsova",
          true,
          30,
          30
        ),
        section(
          302,
          "02",
          "F",
          "2:00 PM - 3:50 PM",
          "Lab 5",
          "Yelena Kuznetsova",
          false,
          30,
          18
        ),
      ]
    ),
    course(
      4,
      "ECON 1207",
      "Microeconomics",
      "School of Economics and Management",
      "Bachelor",
      "Fall 2026",
      "825",
      200,
      [
        section(
          401,
          "01",
          "TTh",
          "11:00 AM - 12:30 PM",
          "A2-08",
          "Marat Nurlanov",
          true,
          80,
          78
        ),
        section(
          402,
          "02",
          "S",
          "10:00 AM - 11:50 AM",
          "A2-10",
          "Madina Iskakova",
          false,
          70,
          44
        ),
      ]
    ),
  ],
}

export const PLANS = [
  { id: 1, name: "Fall 2026", course_count: 4 },
  { id: 2, name: "Light load", course_count: 2 },
  { id: 3, name: "Spring 2026", course_count: 5 },
]

export const SEARCH_RESULTS = [
  {
    course_code: "CS 411",
    title: "Web Technologies",
    school: "School of Computing and Data Science",
    level: "Bachelor",
    term: "Fall 2026",
    priority_1: "CS 302",
    co_req: null,
  },
  {
    course_code: "MATH 261",
    title: "Applied Linear Algebra",
    school: "School of Mathematics",
    level: "Bachelor",
    term: "Fall 2026",
    priority_1: "MATH 252",
    co_req: null,
  },
]
