import { type CSSProperties } from "react"
import type { ComponentConfig } from "@puckeditor/core"

import { Section } from "@/components/shared/page-editor/blocks/_shared/section"
import {
  optionsField,
  resolveRadius,
  styleFields,
  textSizeField,
  withLayout,
  type WithLayout,
  type ComponentStyleProps,
  type TextSize,
} from "@/components/shared/page-editor/blocks/_lib"

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6"

export type HeadingProps = WithLayout<
  ComponentStyleProps & {
    align: "left" | "center" | "right"
    text?: string
    level?: string
    size?: TextSize
  }
>

const levelOptions = [
  { label: "H1", value: "1" },
  { label: "H2", value: "2" },
  { label: "H3", value: "3" },
  { label: "H4", value: "4" },
  { label: "H5", value: "5" },
  { label: "H6", value: "6" },
]

/**
 * Pixel sizes matching the RichText block's heading scale (headings are `em`
 * multiples of its default M body size).
 */
const levelFontSizes: Record<string, number> = {
  "1": 50,
  "2": 40,
  "3": 35,
  "4": 28,
  "5": 22,
  "6": 20,
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
    level: optionsField<HeadingProps["level"]>("Level", levelOptions),
    size: textSizeField,
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
    level: "1",
    layout: {
      padding: "8px",
    },
  },
  render: ({
    align,
    text,
    level,
    size,
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
      fontSize: size ?? levelFontSizes[level || "1"],
      fontWeight: 600,
      letterSpacing: "-0.011em",
      lineHeight: 1.15,
      textAlign: align,
      width: "100%",
      color: textColor || undefined,
      backgroundColor: backgroundColor || undefined,
      borderRadius: resolveRadius(radius),
      fontFamily: fontFamily || undefined,
    }
    return (
      <Section>
        <Tag style={style}>{text}</Tag>
      </Section>
    )
  },
}

export const Heading = withLayout(HeadingInternal)
