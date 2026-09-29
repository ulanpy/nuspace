import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

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

/**
 * The visibility radios, shared by the create dialog and the settings page.
 *
 * One list because it is one fact with three values: a page that is private
 * here and public there is a page whose audience depends on which screen you
 * happened to be on.
 */
export function VisibilityPicker({
  value,
  onValueChange,
  disabled = false,
  idPrefix = "page-visibility",
}: {
  value: PageVisibilityValue
  onValueChange: (value: PageVisibilityValue) => void
  disabled?: boolean
  /** The dialog and the settings page both render this, so the radio ids
   *  cannot both be the bare option value. */
  idPrefix?: string
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => {
        onValueChange(next as PageVisibilityValue)
      }}
      disabled={disabled}
    >
      <ItemGroup>
        {VISIBILITIES.map((option) => (
          <Item key={option.value} variant="muted" size="sm">
            <ItemContent>
              <ItemTitle className="w-auto min-w-0 flex-1">
                {option.title}
              </ItemTitle>
              <ItemDescription>{option.description}</ItemDescription>
            </ItemContent>
            <ItemActions className="ml-auto">
              <RadioGroupItem
                id={`${idPrefix}-${option.value}`}
                value={option.value}
                aria-label={option.title}
              />
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>
    </RadioGroup>
  )
}
