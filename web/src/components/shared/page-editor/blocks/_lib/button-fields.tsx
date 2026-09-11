import type { ArrayField } from "@puckeditor/core"

import {
  optionsField,
  styleFields,
  type ComponentStyleProps,
} from "./style-fields"
import {
  iconDependentRadioField,
  iconDependentSelectField,
} from "./dynamic-array-fields"
import { iconSelectOptions } from "./icons"

export type PageButton = ComponentStyleProps & {
  label: string
  description?: string
  href: string
  variant?: "primary" | "secondary"
  size?: "small" | "large"
  icon?: string
  iconPosition?: "left" | "right" | "top" | "bottom"
  iconOnly?: boolean
}

export function buttonArrayField(options?: {
  /** Upper bound on buttons, e.g. a hero caps at 4. */
  max?: number
}): ArrayField<PageButton[]> {
  return {
    type: "array",
    label: "Buttons",
    min: 1,
    ...(options?.max ? { max: options.max } : {}),
    getItemSummary: (item: { label?: string }) =>
      item.label ? item.label : "Button",
    defaultItemProps: {
      label: "Button",
      description: "",
      href: "#",
      variant: "primary",
      size: "large",
      icon: "none",
      iconPosition: "left",
      iconOnly: false,
    },
    arrayFields: {
      label: { type: "text", label: "Label", contentEditable: true },
      description: {
        type: "textarea",
        label: "Description",
        placeholder: "Optional text shown below the label",
      },
      href: { type: "text", label: "Link" },
      variant: {
        type: "radio",
        label: "Style",
        options: [
          { label: "Primary", value: "primary" },
          { label: "Secondary", value: "secondary" },
        ],
      },
      size: {
        type: "radio",
        label: "Size",
        options: [
          { label: "Small", value: "small" },
          { label: "Large", value: "large" },
        ],
      },
      icon: optionsField<PageButton["icon"]>("Icon", iconSelectOptions),
      iconPosition: iconDependentSelectField<PageButton["iconPosition"]>(
        "Icon position",
        [
          { label: "Left", value: "left" },
          { label: "Right", value: "right" },
          { label: "Top", value: "top" },
          { label: "Bottom", value: "bottom" },
        ]
      ),
      iconOnly: iconDependentRadioField<PageButton["iconOnly"]>("Icon only", [
        { label: "False", value: false },
        { label: "True", value: true },
      ]),
      ...styleFields({
        backgroundLabel: "Main color",
        backgroundDefault: "accent",
      }),
    },
  }
}
