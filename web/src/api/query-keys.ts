/**
 * Every query key in the app is built here.
 *
 * The previous app had 88 inline `queryKey:` literals with no shared
 * convention — ["campusCurrent","events"] next to ["grade-terms"] next to
 * ["sgotinish","list"] — which made targeted invalidation guesswork. Keys are
 * hierarchical: invalidating `qk.events.all()` clears every events query,
 * including lists and details.
 */
export const qk = {
  session: () => ["session"] as const,

  users: {
    all: () => ["users"] as const,
    detail: (slug: string) => ["users", "detail", slug] as const,
  },

  events: {
    all: () => ["events"] as const,
    list: (filters: Record<string, unknown>) =>
      ["events", "list", filters] as const,
    detail: (id: number) => ["events", "detail", id] as const,
  },

  pages: {
    all: () => ["pages"] as const,
    list: (filters: Record<string, unknown>) =>
      ["pages", "list", filters] as const,
    detail: (slug: string) => ["pages", "detail", slug] as const,
    /**
     * Every parameter the request carries has to be in the key.
     *
     * A key that omits one is the subtlest version of the stale-cache bug: the
     * table looks broken only for users who navigated in a particular order —
     * filter by role, go back, land on a cached unfiltered page. The backend
     * takes `role`, `visibility`, `sort`, `order` and `size` on this endpoint,
     * so all five are here.
     *
     * An object rather than six positional arguments, matching `pages.list` and
     * `events.list`. Build it in **one** place per call site (usually the
     * route's `search`, memoised): react-query hashes the key, and an object
     * literal rebuilt with its properties in a different order is a different
     * key.
     */
    mine: (filters: Record<string, unknown>) =>
      ["pages", "mine", filters] as const,
    /**
     * The page number is one of the filters, not a separate key segment, so
     * `invalidateQueries({ queryKey: qk.pages.all() })` after a removal still
     * refreshes every page the user could be looking at — `all()` is the
     * `["pages"]` prefix and never reads the filters — while a single page can
     * still be prefetched or refetched on its own.
     *
     * `excludeSub` changes which rows come back, so it belongs here too, and
     * so do `size`, `sort` and `order` for the same reason they do on `mine`.
     */
    admins: (slug: string, filters: Record<string, unknown>) =>
      ["pages", "admins", slug, filters] as const,
  },

  /**
   * The shareable admin-access link is a secret artifact, not page data — and
   * the backend issues a fresh token on every GET. Kept OUT of the `pages`
   * prefix so list/detail invalidations can never silently rotate the link the
   * user is currently looking at.
   */
  adminLink: {
    detail: (slug: string) => ["admin-link", slug] as const,
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
