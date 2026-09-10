import { type CSSProperties } from "react"
import type { ComponentConfig } from "@puckeditor/core"

import { Section } from "@/components/shared/page-editor/blocks/_shared/section"
import {
  optionsField,
  resolveRadius,
  styleFields,
  withLayout,
  type WithLayout,
  type ComponentStyleProps,
} from "@/components/shared/page-editor/blocks/_lib"

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6"

export type HeadingProps = WithLayout<
  ComponentStyleProps & {
    align: "left" | "center" | "right"
    text?: string
    level?: string
    size: "xxxl" | "xxl" | "xl" | "l" | "m" | "s" | "xs"
  }
>

const sizeOptions = [
  { value: "xxxl", label: "XXXL" },
  { value: "xxl", label: "XXL" },
  { value: "xl", label: "XL" },
  { value: "l", label: "L" },
  { value: "m", label: "M" },
  { value: "s", label: "S" },
  { value: "xs", label: "XS" },
] as const

const levelOptions = [
  { label: "H1", value: "1" },
  { label: "H2", value: "2" },
  { label: "H3", value: "3" },
  { label: "H4", value: "4" },
  { label: "H5", value: "5" },
  { label: "H6", value: "6" },
]

const sizeClasses: Record<HeadingProps["size"], string> = {
  xxxl: "text-6xl",
  xxl: "text-5xl",
  xl: "text-4xl",
  l: "text-3xl",
  m: "text-2xl",
  s: "text-xl",
  xs: "text-lg",
}

const alignOptions = [
  { label: "Left", value: "left" },
  { label: "Center", value: "center" },
  { label: "Right", value: "right" },
]

const HeadingInternal: ComponentConfig<HeadingProps> = {
  fields: {
    text: {
      type: "textarea",
      label: "Text",
      contentEditable: true,
    },
    size: optionsField<HeadingProps["size"]>("Size", sizeOptions),
    level: optionsField<HeadingProps["level"]>("Level", levelOptions),
    align: {
      type: "radio",
      label: "Align",
      options: alignOptions,
    },
    ...styleFields({ backgroundDefault: "transparent" }),
  },
  defaultProps: {
    align: "left",
    text: "Heading",
    size: "m",
    level: "1",
    layout: {
      padding: "8px",
    },
  },
  render: ({
    align,
    text,
    size,
    level,
    textColor,
    backgroundColor,
    radius,
    fontFamily,
  }) => {
    const tags: Record<NonNullable<HeadingProps["level"]>, HeadingTag> = {
      "1": "h1",
      "2": "h2",
      "3": "h3",
      "4": "h4",
      "5": "h5",
      "6": "h6",
    }
    const Tag = tags[level || "1"]
    const style: CSSProperties = {
      margin: 0,
      fontWeight: 600,
      letterSpacing: "-0.011em",
      textAlign: align,
      width: "100%",
      color: textColor || undefined,
      backgroundColor: backgroundColor || undefined,
      borderRadius: resolveRadius(radius),
      fontFamily: fontFamily || undefined,
    }
    return (
      <Section>
        <Tag className={sizeClasses[size]} style={style}>
          {text}
        </Tag>
      </Section>
    )
  },
}

export const Heading = withLayout(HeadingInternal)
