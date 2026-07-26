import type { CourseItem, TemplateCreate } from "./types"

interface TemplateCourse {
  items: readonly Pick<CourseItem, "item_name" | "total_weight_pct">[]
}

/**
 * A shared template deliberately carries only assignment names and weights.
 * Scores are personal academic data and never belong in a classmate-facing
 * template, even though they live beside these fields on a registered course.
 */
export function templateItemsFromCourse(
  course: TemplateCourse
): TemplateCreate["template_items"] {
  return course.items.map((item) => ({
    item_name: item.item_name,
    total_weight_pct: item.total_weight_pct,
  }))
}
