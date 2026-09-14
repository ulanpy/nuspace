import { type CSSProperties } from "react"
import type { ComponentConfig } from "@puckeditor/core"

import { Section } from "@/components/shared/page-editor/blocks/_shared/section"
import {
  optionsField,
  resolveRadius,
  styleFields,
  TEXT_SIZE_DEFAULT,
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
 * Level multipliers mirroring the RichText block's heading scale
 * (`.nuspace-richtext h*` uses the same `em` ramp against the base size), so a
 * chosen base size renders identically in the Heading and RichText blocks.
 */
const levelScale: Record<string, number> = {
  "1": 2.5,
  "2": 2,
  "3": 1.75,
  "4": 1.4,
  "5": 1.1,
  "6": 1,
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
    size: TEXT_SIZE_DEFAULT,
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
      fontSize: (size ?? TEXT_SIZE_DEFAULT) * levelScale[level || "1"],
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
