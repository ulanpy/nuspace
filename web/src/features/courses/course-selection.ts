export interface SelectableCourse {
  id: number
}

/**
 * Resolve URL-backed course state against the latest server response.
 *
 * A registrar sync can remove a course while its id is still in browser
 * history. Falling back here keeps every consumer on the same deterministic
 * rule and avoids rendering an empty workspace beside a non-empty list.
 */
export function selectedCourseId(
  courses: readonly SelectableCourse[],
  requestedId: number | undefined
): number | null {
  if (
    requestedId !== undefined &&
    courses.some((course) => course.id === requestedId)
  ) {
    return requestedId
  }

  return courses[0]?.id ?? null
}
