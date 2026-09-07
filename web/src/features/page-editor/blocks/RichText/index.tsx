import type { ComponentConfig } from "@puckeditor/core"
import { Section } from "@/features/page-editor/blocks/_shared/section"
import { withLayout, type WithLayout } from "@/features/page-editor/blocks/_lib"

export type RichTextProps = WithLayout<{
  richtext?: string
}>

const RichTextInner: ComponentConfig<RichTextProps> = {
  fields: {
    richtext: {
      type: "richtext",
    },
  },
  defaultProps: {
    richtext: "<h2>Heading</h2><p>Body</p>",
  },
  render: ({ richtext }) => <Section>{richtext}</Section>,
}

export const RichText = withLayout(RichTextInner)
