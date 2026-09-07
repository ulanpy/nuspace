import type { ComponentConfig } from "@puckeditor/core"
import { spacingOptions } from "@/features/page-editor/blocks/_lib"

export type SpaceProps = {
  direction?: "" | "vertical" | "horizontal"
  size: string
}

export const Space: ComponentConfig<SpaceProps> = {
  label: "Space",
  fields: {
    size: {
      type: "select",
      options: spacingOptions,
    },
    direction: {
      type: "radio",
      options: [
        { value: "vertical", label: "Vertical" },
        { value: "horizontal", label: "Horizontal" },
        { value: "", label: "Both" },
      ],
    },
  },
  defaultProps: {
    direction: "",
    size: "24px",
  },
  inline: true,
  render: ({ direction, size, puck }) => (
    <div
      ref={puck.dragRef}
      className="block"
      style={
        direction === "vertical"
          ? { height: size, width: "100%" }
          : direction === "horizontal"
            ? { height: "100%", width: size }
            : { height: size, width: size }
      }
    />
  ),
}
