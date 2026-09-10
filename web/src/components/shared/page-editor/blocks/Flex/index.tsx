import type { ComponentConfig, Slot } from "@puckeditor/core"
import { Section } from "@/components/shared/page-editor/blocks/_shared/section"
import {
  withLayout,
  type WithLayout,
} from "@/components/shared/page-editor/blocks/_lib"

export type FlexProps = WithLayout<{
  justifyContent: "start" | "center" | "end"
  direction: "row" | "column"
  gap: number
  wrap: "wrap" | "nowrap"
  items: Slot
}>

const FlexInternal: ComponentConfig<FlexProps> = {
  fields: {
    direction: {
      label: "Direction",
      type: "radio",
      options: [
        { label: "Row", value: "row" },
        { label: "Column", value: "column" },
      ],
    },
    justifyContent: {
      label: "Justify Content",
      type: "radio",
      options: [
        { label: "Start", value: "start" },
        { label: "Center", value: "center" },
        { label: "End", value: "end" },
      ],
    },
    gap: {
      label: "Gap",
      type: "number",
      min: 0,
    },
    wrap: {
      label: "Wrap",
      type: "radio",
      options: [
        { label: "true", value: "wrap" },
        { label: "false", value: "nowrap" },
      ],
    },
    items: {
      type: "slot",
    },
  },
  defaultProps: {
    justifyContent: "start",
    direction: "row",
    gap: 24,
    wrap: "wrap",
    layout: {
      grow: true,
    },
    items: [],
  },
  render: ({ justifyContent, direction, gap, wrap, items: Items }) => (
    <Section style={{ height: "100%" }}>
      <Items
        className="flex size-full"
        style={{
          justifyContent,
          flexDirection: direction,
          gap,
          flexWrap: wrap,
        }}
      />
    </Section>
  ),
}

export const Flex = withLayout(FlexInternal)
