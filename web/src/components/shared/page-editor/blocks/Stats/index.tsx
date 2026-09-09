import { type CSSProperties } from "react"
import type { ComponentConfig } from "@puckeditor/core"

import { Section } from "@/components/shared/page-editor/blocks/_shared/section"
import {
  resolveRadius,
  styleFields,
  withLayout,
  type WithLayout,
  type ComponentStyleProps,
} from "@/components/shared/page-editor/blocks/_lib"

export type StatsProps = WithLayout<
  ComponentStyleProps & {
    items: {
      title: string
      description: string
    }[]
    align: "left" | "center" | "right"
  }
>

const StatsInner: ComponentConfig<StatsProps> = {
  fields: {
    items: {
      type: "array",
      label: "Items",
      getItemSummary: (item, i) =>
        item.title && item.description ? (
          <>
            {item.title} ({item.description})
          </>
        ) : (
          `Stat #${i}`
        ),
      defaultItemProps: {
        title: "Stat",
        description: "1,000",
      },
      arrayFields: {
        title: {
          type: "text",
          label: "Title",
          contentEditable: true,
        },
        description: {
          type: "text",
          label: "Description",
          contentEditable: true,
        },
      },
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
    ...styleFields({ backgroundDefault: "accent" }),
  },
  defaultProps: {
    items: [
      {
        title: "Stat",
        description: "1,000",
      },
    ],
    align: "center",
  },
  render: ({ items, align, textColor, backgroundColor, radius, fontFamily }) => {
    const panelStyle: CSSProperties = {
      color: textColor || "var(--nuspace-accent-foreground, #ffffff)",
      background: backgroundColor || "var(--nuspace-accent, #1d4ed8)",
      borderRadius: resolveRadius(radius, "var(--nuspace-radius, 24px)"),
      fontFamily: fontFamily || undefined,
    }

    const itemStyle: CSSProperties = {
      display: "flex",
      width: "100%",
      flexDirection: "column",
      alignItems: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start",
      gap: 8,
      textAlign: align,
    }

    return (
      <Section>
        <div
          className="mx-auto grid max-w-4xl grid-cols-1 items-center justify-between gap-9 px-4 py-16 md:px-5 lg:grid-cols-2 lg:px-5 lg:py-32"
          style={panelStyle}
        >
          {items.map((item, index) => (
            <div key={index} style={itemStyle}>
              <div style={{ fontSize: 24, fontWeight: 600, opacity: 0.8 }}>
                {item.title}
              </div>
              <div style={{ fontSize: 72, lineHeight: 1, fontWeight: 700 }}>
                {item.description}
              </div>
            </div>
          ))}
        </div>
      </Section>
    )
  },
}

export const Stats = withLayout(StatsInner)