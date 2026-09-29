export type PageVisibilityValue = "public" | "internal" | "private"

/** The three visibilities, with the copy that explains each. */
export const VISIBILITIES = [
  {
    value: "public",
    title: "Public",
    description: "Anyone, signed in or not, can read this page.",
  },
  {
    value: "internal",
    title: "NU only",
    description:
      "Signed-in students and staff can read it. Outsiders see a 404.",
  },
  {
    value: "private",
    title: "Private",
    description: "Only you and the page's admins can read it.",
  },
] as const satisfies readonly {
  value: PageVisibilityValue
  title: string
  description: string
}[]

/** Narrows the trigger's `string` to a known visibility. */
export const isVisibility = (
  value: string | null
): value is PageVisibilityValue =>
  VISIBILITIES.some((option) => option.value === value)

/** The title and description for the current value, for the caller's `Item`. */
export const visibilityCopy = (value: PageVisibilityValue) =>
  VISIBILITIES.find((option) => option.value === value) ?? VISIBILITIES[0]
