import type { ComponentConfig } from "@puckeditor/core"
import { Section } from "@/components/shared/page-editor/blocks/_shared/section"
import {
  withLayout,
  type WithLayout,
} from "@/components/shared/page-editor/blocks/_lib"

export type TextProps = WithLayout<{
  align: "left" | "center" | "right"
  text?: string
  size?: "s" | "m"
  color: "default" | "muted"
  maxWidth?: string
}>

const TextInner: ComponentConfig<TextProps> = {
  fields: {
    text: {
      type: "textarea",
      contentEditable: true,
    },
    size: {
      type: "select",
      options: [
        { label: "S", value: "s" },
        { label: "M", value: "m" },
      ],
    },
    align: {
      type: "radio",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
    color: {
      type: "radio",
      options: [
        { label: "Default", value: "default" },
        { label: "Muted", value: "muted" },
      ],
    },
    maxWidth: { type: "text" },
  },
  defaultProps: {
    align: "left",
    text: "Text",
    size: "m",
    color: "default",
  },
  render: ({ align, color, text, size, maxWidth }) => (
    <Section maxWidth={maxWidth}>
      <span
        className={[
          "flex w-full leading-relaxed font-light",
          color === "muted" ? "text-muted-foreground" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          color: color === "default" ? "inherit" : undefined,
          textAlign: align,
          fontSize: size === "m" ? "20px" : "16px",
          maxWidth,
          justifyContent:
            align === "center"
              ? "center"
              : align === "right"
                ? "flex-end"
                : "flex-start",
        }}
      >
        {text}
      </span>
    </Section>
  ),
}

export const Text = withLayout(TextInner)
