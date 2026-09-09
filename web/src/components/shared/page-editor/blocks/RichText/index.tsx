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

export type RichTextProps = WithLayout<
  ComponentStyleProps & {
    richtext?: string
    align: "left" | "center" | "right"
  }
>

const RichTextInner: ComponentConfig<RichTextProps> = {
  fields: {
    richtext: {
      type: "richtext",
      label: "Content",
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
    richtext: "<h2>Heading</h2><p>Body</p>",
    align: "left",
  },
  render: ({
    richtext,
    align,
    textColor,
    backgroundColor,
    radius,
    fontFamily,
  }) => {
    const style: CSSProperties = {
      textAlign: align,
      color: textColor || undefined,
      backgroundColor: backgroundColor || undefined,
      borderRadius: resolveRadius(radius),
      fontFamily: fontFamily || undefined,
    }
    return (
      <Section>
        <div style={style}>{richtext}</div>
      </Section>
    )
  },
}

export const RichText = withLayout(RichTextInner)
