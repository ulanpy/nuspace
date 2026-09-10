import { type CSSProperties } from "react"
import type { ComponentConfig } from "@puckeditor/core"

import { Section } from "@/components/shared/page-editor/blocks/_shared/section"
import {
  optionsField,
  resolveRadius,
  styleFields,
  textSizeOptions,
  textSizePx,
  withLayout,
  type WithLayout,
  type ComponentStyleProps,
  type TextSize,
} from "@/components/shared/page-editor/blocks/_lib"

export type TextProps = WithLayout<
  ComponentStyleProps & {
    align: "left" | "center" | "right"
    text?: string
    size?: TextSize
    /**
     * Caps the text column at a preset CSS width ("" means no cap). It's a CSS
     * length value, which is why it used to be a free-text "string" field.
     */
    maxWidth?: string
  }
>

const maxWidthOptions = [
  { label: "Default", value: "" },
  { label: "480px", value: "480px" },
  { label: "640px", value: "640px" },
  { label: "768px", value: "768px" },
  { label: "960px", value: "960px" },
]

const TextInner: ComponentConfig<TextProps> = {
  fields: {
    text: {
      type: "textarea",
      label: "Text",
      contentEditable: true,
    },
    size: optionsField<TextProps["size"]>("Size", textSizeOptions),
    align: {
      type: "radio",
      label: "Align",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
    maxWidth: optionsField<TextProps["maxWidth"]>(
      "Max width",
      maxWidthOptions
    ),
    ...styleFields({ backgroundDefault: "transparent" }),
  },
  defaultProps: {
    align: "left",
    text: "Text",
    size: "m",
    maxWidth: "",
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
      fontSize: `${textSizePx(size)}px`,
      maxWidth: maxWidth || undefined,
      margin: maxWidth ? "0 auto" : undefined,
      justifyContent:
        align === "center"
          ? "center"
          : align === "right"
            ? "flex-end"
            : "flex-start",
    }
    return (
      <Section maxWidth={maxWidth || undefined}>
        <span style={style}>{text}</span>
      </Section>
    )
  },
}

export const Text = withLayout(TextInner)
