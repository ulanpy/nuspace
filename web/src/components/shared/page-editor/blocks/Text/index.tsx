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

export type TextProps = WithLayout<
  ComponentStyleProps & {
    align: "left" | "center" | "right"
    text?: string
    size?: "s" | "m"
    maxWidth?: string
  }
>

const TextInner: ComponentConfig<TextProps> = {
  fields: {
    text: {
      type: "textarea",
      label: "Text",
      contentEditable: true,
    },
    size: optionsField<TextProps["size"]>("Size", [
      { label: "S", value: "s" },
      { label: "M", value: "m" },
    ]),
    align: {
      type: "radio",
      label: "Align",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
    maxWidth: { type: "text", label: "Max width" },
    ...styleFields({ backgroundDefault: "transparent" }),
  },
  defaultProps: {
    align: "left",
    text: "Text",
    size: "m",
  },
  render: ({
    align,
    text,
    size,
    maxWidth,
    textColor,
    backgroundColor,
    radius,
    fontFamily,
  }) => {
    const style: CSSProperties = {
      color: textColor || undefined,
      backgroundColor: backgroundColor || undefined,
      borderRadius: resolveRadius(radius),
      fontFamily: fontFamily || undefined,
      display: "flex",
      width: "100%",
      lineHeight: 1.625,
      fontWeight: 300,
      textAlign: align,
      fontSize: size === "m" ? "20px" : "16px",
      maxWidth,
      justifyContent:
        align === "center"
          ? "center"
          : align === "right"
            ? "flex-end"
            : "flex-start",
    }
    return (
      <Section maxWidth={maxWidth}>
        <span style={style}>{text}</span>
      </Section>
    )
  },
}

export const Text = withLayout(TextInner)
