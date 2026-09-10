import type { ComponentConfig, Slot } from "@puckeditor/core"
import { Section } from "@/components/shared/page-editor/blocks/_shared/section"
import {
  withLayout,
  type WithLayout,
} from "@/components/shared/page-editor/blocks/_lib"

export type GridProps = WithLayout<{
  numColumns: number
  gap: number
  items: Slot
}>

const GridInternal: ComponentConfig<GridProps> = {
  fields: {
    numColumns: {
      type: "number",
      label: "Number of columns",
      min: 1,
      max: 12,
    },
    gap: {
      label: "Gap",
      type: "number",
      min: 0,
    },
    items: {
      type: "slot",
    },
  },
  defaultProps: {
    numColumns: 4,
    gap: 24,
    items: [],
  },
  render: ({ gap, numColumns, items: Items }) => (
    <Section>
      <Items
        className="flex w-full flex-col md:grid"
        style={{
          gap,
          gridTemplateColumns: `repeat(${numColumns}, 1fr)`,
        }}
      />
    </Section>
  ),
}

export const Grid = withLayout(GridInternal)
