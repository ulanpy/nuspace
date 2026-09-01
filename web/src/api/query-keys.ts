/**
 * Every query key in the app is built here.
 *
 * The previous app had 88 inline `queryKey:` literals with no shared
 * convention — ["campusCurrent","communities"] next to ["grade-terms"] next to
 * ["sgotinish","list"] — which made targeted invalidation guesswork. Keys are
 * hierarchical: invalidating `qk.events.all()` clears every events query,
 * including lists and details.
 */
export const qk = {
  session: () => ["session"] as const,

  events: {
    all: () => ["events"] as const,
    list: (filters: Record<string, unknown>) =>
      ["events", "list", filters] as const,
    detail: (id: number) => ["events", "detail", id] as const,
  },

  communities: {
    all: () => ["communities"] as const,
    list: (filters: Record<string, unknown>) =>
      ["communities", "list", filters] as const,
    detail: (id: number) => ["communities", "detail", id] as const,
    mine: () => ["communities", "mine"] as const,
  },

  announcements: {
    all: () => ["announcements"] as const,
    bundle: () => ["announcements", "bundle"] as const,
    telegram: () => ["announcements", "telegram"] as const,
  },

  opportunities: {
    all: () => ["opportunities"] as const,
    list: (filters: Record<string, unknown>) =>
      ["opportunities", "list", filters] as const,
    detail: (id: number) => ["opportunities", "detail", id] as const,
  },

  courses: {
    all: () => ["courses"] as const,
    catalog: (filters: Record<string, unknown>) =>
      ["courses", "catalog", filters] as const,
    registered: () => ["courses", "registered"] as const,
    schedule: () => ["courses", "schedule"] as const,
    templates: (courseId: number) =>
      ["courses", "templates", courseId] as const,
    requirements: (year: string, name: string, type: string) =>
      ["courses", "degree-requirements", year, name, type] as const,
    semesters: () => ["courses", "semesters"] as const,
    gradeTerms: () => ["courses", "grade-terms"] as const,
    grades: (filters: Record<string, unknown>) =>
      ["courses", "grades", filters] as const,
    degreeAudit: () => ["courses", "degree-audit"] as const,
    /**
     * One key per plan. A student can keep several schedule variants, and
     * caching them under a single key would show the previous plan's courses
     * for a frame after switching — the plans differ in exactly the data the
     * grid draws.
     */
    planner: (scheduleId?: number | null) =>
      ["courses", "planner", scheduleId ?? "default"] as const,
    /** The list of plans, without their courses. */
    plannerPlans: () => ["courses", "planner-plans"] as const,
  },

  sgotinish: {
    all: () => ["sgotinish"] as const,
    stats: () => ["sgotinish", "stats"] as const,
  },

  notifications: {
    all: () => ["notifications"] as const,
    list: (filters: Record<string, unknown>) =>
      ["notifications", "list", filters] as const,
  },

  search: (keyword: string, storageName: string) =>
    ["search", storageName, keyword] as const,
} as const
