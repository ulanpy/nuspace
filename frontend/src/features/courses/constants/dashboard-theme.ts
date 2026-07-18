/** Tailwind classes aligned with app theme tokens (light + dark). */
export const coursesSurface = {
  card: "border-border bg-card",
  cardLg: "rounded-[18px] border border-border bg-card",
  cardMd: "rounded-[16px] border border-border bg-card",
  cardSm: "rounded-2xl border border-border bg-card",
  text: "text-foreground",
  textMuted: "text-muted-foreground",
  badge: "rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground",
  divider: "bg-border",
  progressTrack: "bg-muted",
  input:
    "border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring",
  rowSelected: "border-border bg-muted/50",
  iconPrimary: "bg-muted text-muted-foreground",
  tabActive:
    "data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:after:bg-foreground",
} as const;

/** Inline colors for charts and SVG where CSS classes are awkward. */
export const coursesChart = {
  green: "#22c55e",
  orange: "#f97316",
  red: "#ef4444",
  purple: "#8b5cf6",
  blue: "hsl(var(--foreground) / 0.35)",
  muted: "hsl(var(--muted-foreground))",
} as const;

const departmentAccents = [
  { bg: "rgba(139,92,246,0.15)", color: coursesChart.purple, label: "Chemistry" },
  { bg: "rgba(34,197,94,0.15)", color: coursesChart.green, label: "Math" },
  { bg: "rgba(249,115,22,0.15)", color: coursesChart.orange, label: "CS" },
  { bg: "rgba(100,116,139,0.15)", color: "#64748b", label: "Physics" },
] as const;

export function getDepartmentAccent(department?: string | null) {
  if (!department) return departmentAccents[3];
  const normalized = department.toLowerCase();
  if (normalized.includes("chem")) return departmentAccents[0];
  if (normalized.includes("math")) return departmentAccents[1];
  if (normalized.includes("comp") || normalized.includes("cs")) return departmentAccents[2];
  if (normalized.includes("phys")) return departmentAccents[3];
  const hash = normalized.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return departmentAccents[hash % departmentAccents.length];
}
