import { type CSSProperties } from "react"
import type { ComponentConfig } from "@puckeditor/core"

import {
  getIcon,
  iconOptions,
  optionsField,
  resolveRadius,
  styleFields,
  withLayout,
  type WithLayout,
  type ComponentStyleProps,
} from "@/components/shared/page-editor/blocks/_lib"

export type CardProps = WithLayout<
  ComponentStyleProps & {
    title: string
    description: string
    icon?: string
    mode: "flat" | "card"
    align: "left" | "center" | "right"
  }
>

const CARD_BG = "#ffffff"
const CARD_BORDER = "#e2e8f0"
/** Soft accent-tinted badge so the badge follows the page's accent color. */
const ICON_BADGE_BG =
  "color-mix(in oklch, var(--nuspace-accent, #1d4ed8), white 90%)"
const ICON_BADGE_TEXT = "var(--nuspace-accent, #1d4ed8)"

const CardInner: ComponentConfig<CardProps> = {
  fields: {
    title: {
      type: "text",
      label: "Title",
      contentEditable: true,
    },
    description: {
      type: "textarea",
      label: "Description",
      contentEditable: true,
    },
    icon: optionsField<string | undefined>("Icon", iconOptions),
    mode: {
      type: "radio",
      label: "Style",
      options: [
        { label: "Card", value: "card" },
        { label: "Flat", value: "flat" },
      ],
    },
    align: {
      type: "radio",
      label: "Align",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
    ...styleFields({ backgroundDefault: "transparent" }),
  },
  defaultProps: {
    title: "Title",
    description: "Description",
    icon: "Feather",
    mode: "flat",
    align: "center",
  },
  render: ({
    title,
    icon,
    description,
    mode,
    align,
    textColor,
    backgroundColor,
    radius,
    fontFamily,
  }) => {
    const Icon = getIcon(icon)
    const card = mode === "card"

    const surface: CSSProperties = {
      ...(textColor ? { color: textColor } : {}),
      ...(card && !backgroundColor ? { backgroundColor: CARD_BG } : {}),
      ...(card && !backgroundColor
        ? { border: `1px solid ${CARD_BORDER}` }
        : {}),
    }

    const containerStyle: CSSProperties = {
      display: "flex",
      flexDirection: "column",
      alignItems:
        align === "center"
          ? "center"
          : align === "right"
            ? "flex-end"
            : "flex-start",
      gap: 16,
      height: "100%",
      width: "100%",
      padding: card ? 20 : 0,
      borderRadius: resolveRadius(radius),
      boxShadow: card ? "0 1px 3px rgb(15 23 42 / 0.1)" : undefined,
      ...surface,
      ...(backgroundColor ? { backgroundColor } : {}),
    }

    const textAlign = align ?? "center"

    return (
      <div className="h-full">
        <div style={containerStyle}>
          <div
            style={{
              display: "flex",
              height: 64,
              width: 64,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              backgroundColor: ICON_BADGE_BG,
              color: ICON_BADGE_TEXT,
              flexShrink: 0,
            }}
          >
            <Icon style={{ width: 24, height: 24 }} />
          </div>
          <div
            style={{
              fontSize: 24,
              textAlign,
              color: "inherit",
              fontFamily: fontFamily || undefined,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              fontWeight: 300,
              textAlign,
              color: textColor ? undefined : "#475569",
            }}
          >
            {description}
          </div>
        </div>
      </div>
    )
  },
}

export const Card = withLayout(CardInner)
