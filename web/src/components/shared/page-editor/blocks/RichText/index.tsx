import { type CSSProperties } from "react"
import type { ComponentConfig } from "@puckeditor/core"

import { Section } from "@/components/shared/page-editor/blocks/_shared/section"
import { SanitizedHtml } from "@/components/shared/page-editor/blocks/_shared/sanitized-html"
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

export type RichTextProps = WithLayout<
  ComponentStyleProps & {
    richtext?: string
    size?: TextSize
  }
>

const RichTextInner: ComponentConfig<RichTextProps> = {
  fields: {
    richtext: {
      type: "richtext",
      label: "Content",
    },
    size: optionsField<RichTextProps["size"]>("Font size", textSizeOptions),
    ...styleFields({ backgroundDefault: "transparent" }),
  },
  defaultProps: {
    richtext: "<h2>Heading</h2><p>Body</p>",
    size: "m",
  },
  render: ({
    richtext,
    size,
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
      fontSize: `${textSizePx(size)}px`,
      lineHeight: 1.625,
      fontWeight: 300,
    }
    return (
      <Section>
        <SanitizedHtml
          html={richtext}
          className="nuspace-richtext"
          style={style}
        />
      </Section>
    )
  },
}

export const RichText = withLayout(RichTextInner)
