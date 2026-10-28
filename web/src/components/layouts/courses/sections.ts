import {
  BookOpenIcon,
  CalendarDaysIcon,
  ChartNoAxesColumnIcon,
  GraduationCapIcon,
} from "lucide-react"

import type { RailSection } from "@/components/layouts/site"

/**
 * The four courses sections, in the site shell's rail (a sheet from the
 * header's burger below `md`). Each is a real child route, not `useState`, so
 * it is linkable, back-button-able and separately code-split: the schedule
 * builder and degree audit are the two heaviest screens in the app.
 */
export const COURSES_SECTIONS: readonly RailSection[] = [
  { to: "/courses", label: "My Courses", icon: BookOpenIcon, exact: true },
  {
    to: "/courses/statistics",
    label: "Statistics",
    icon: ChartNoAxesColumnIcon,
  },
  {
    to: "/courses/schedule",
    label: "Schedule Builder",
    icon: CalendarDaysIcon,
  },
  { to: "/courses/audit", label: "Degree Audit", icon: GraduationCapIcon },
]
