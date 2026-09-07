import type { ComponentConfig } from "@puckeditor/core"
import { Section } from "@/features/page-editor/blocks/_shared/section"

export type StatsProps = {
  items: {
    title: string
    description: string
  }[]
}

export const Stats: ComponentConfig<StatsProps> = {
  label: "Stats",
  fields: {
    items: {
      type: "array",
      getItemSummary: (item, i) =>
        item.title && item.description ? (
          <>
            {item.title} ({item.description})
          </>
        ) : (
          `Feature #${i}`
        ),
      defaultItemProps: {
        title: "Stat",
        description: "1,000",
      },
      arrayFields: {
        title: {
          type: "text",
          contentEditable: true,
        },
        description: {
          type: "text",
          contentEditable: true,
        },
      },
    },
  },
  defaultProps: {
    items: [
      {
        title: "Stat",
        description: "1,000",
      },
    ],
  },
  render: ({ items }) => (
    <Section>
      <div className="mx-auto grid max-w-4xl grid-cols-1 items-center justify-between gap-9 rounded-3xl bg-gradient-to-br from-sky-300 to-sky-500 px-4 py-16 md:px-5 lg:grid-cols-2 lg:px-5 lg:py-32">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex w-full flex-col items-center gap-2 text-center text-white"
          >
            <div className="text-2xl font-semibold opacity-80">
              {item.title}
            </div>
            <div className="text-7xl leading-none font-bold">
              {item.description}
            </div>
          </div>
        ))}
      </div>
    </Section>
  ),
}
