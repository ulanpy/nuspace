import type { ComponentConfig } from "@puckeditor/core"
import { Section } from "@/features/page-editor/blocks/_shared/section"
import { withLayout, type WithLayout } from "@/features/page-editor/blocks/_lib"

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "span"

export type HeadingProps = WithLayout<{
  align: "left" | "center" | "right"
  text?: string
  level?: string
  size: "xxxl" | "xxl" | "xl" | "l" | "m" | "s" | "xs"
}>

const sizeOptions = [
  { value: "xxxl", label: "XXXL" },
  { value: "xxl", label: "XXL" },
  { value: "xl", label: "XL" },
  { value: "l", label: "L" },
  { value: "m", label: "M" },
  { value: "s", label: "S" },
  { value: "xs", label: "XS" },
]

const levelOptions = [
  { label: "", value: "" },
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
  { label: "4", value: "4" },
  { label: "5", value: "5" },
  { label: "6", value: "6" },
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

const HeadingInternal: ComponentConfig<HeadingProps> = {
  fields: {
    text: {
      type: "textarea",
      contentEditable: true,
    },
    size: {
      type: "select",
      options: sizeOptions,
    },
    level: {
      type: "select",
      options: levelOptions,
    },
    align: {
      type: "radio",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
  },
  defaultProps: {
    align: "left",
    text: "Heading",
    size: "m",
    layout: {
      padding: "8px",
    },
  },
  render: ({ align, text, size, level }) => {
    const Tag = (level ? `h${level}` : "span") as HeadingTag
    return (
      <Section>
        <Tag
          className={[
            "m-0 font-semibold tracking-tight",
            sizeClasses[size],
          ].join(" ")}
          style={{ textAlign: align, width: "100%" }}
        >
          {text}
        </Tag>
      </Section>
    )
  },
}

export const Heading = withLayout(HeadingInternal)
