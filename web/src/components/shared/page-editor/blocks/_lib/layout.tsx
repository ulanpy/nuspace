import { forwardRef, type CSSProperties, type ReactNode } from "react"
import type {
  ComponentConfig,
  DefaultComponentProps,
  ObjectField,
} from "@puckeditor/core"
import { optionsField } from "./style-fields"
import { spacingOptions } from "./options"

export type LayoutFieldProps = {
  paddingX?: string
  padding?: string
  spanCol?: number
  spanRow?: number
  grow?: boolean
}

export type WithLayout<Props extends DefaultComponentProps> = Props & {
  layout?: LayoutFieldProps
}

export const layoutField: ObjectField<LayoutFieldProps> = {
  type: "object",
  label: "Layout",
  objectFields: {
    spanCol: {
      label: "Grid columns",
      type: "number",
      min: 1,
      max: 12,
    },
    spanRow: {
      label: "Grid rows",
      type: "number",
      min: 1,
      max: 12,
    },
    grow: {
      label: "Flex grow",
      type: "radio",
      options: [
        { label: "True", value: true },
        { label: "False", value: false },
      ],
    },
    paddingX: optionsField<LayoutFieldProps["paddingX"]>("Horizontal padding", [
      { label: "0px", value: "0px" },
      ...spacingOptions,
    ]),
    padding: optionsField<LayoutFieldProps["padding"]>("Vertical padding", [
      { label: "0px", value: "0px" },
      ...spacingOptions,
    ]),
  },
}

type LayoutProps = {
  children: ReactNode
  layout?: LayoutFieldProps
  style?: CSSProperties
}

const Layout = forwardRef<HTMLDivElement, LayoutProps>(
  ({ children, layout, style }, ref) => (
    <div
      ref={ref}
      className="block"
      style={{
        gridColumn: layout?.spanCol
          ? `span ${Math.max(Math.min(layout.spanCol, 12), 1)}`
          : undefined,
        gridRow: layout?.spanRow
          ? `span ${Math.max(Math.min(layout.spanRow, 12), 1)}`
          : undefined,
        paddingLeft: layout?.paddingX,
        paddingRight: layout?.paddingX,
        paddingTop: layout?.padding,
        paddingBottom: layout?.padding,
        flex: layout?.grow ? "1 1 0" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  )
)

Layout.displayName = "Layout"

export { Layout }

/**
 * Wraps a ComponentConfig so it gains the `layout` object field
 * (spanCol / spanRow / grow / padding) and renders inside the Layout wrapper.
 *
 * The set of layout sub-fields shown depends on the parent:
 *  - in a Grid: spanCol, spanRow, padding
 *  - in a Flex: grow, padding
 *  - standalone: padding
 *
 * The resulting config is marked `inline: true` because the Layout wrapper is
 * the drag handle, matching the upsteam demo behavior.
 */
export function withLayout<
  Config extends ComponentConfig<any> = ComponentConfig,
>(componentConfig: Config): Config {
  // Puck's conditional config type is invariant; this wrapper preserves the input
  // config and forwards every prop to its original renderer.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const baseConfig = componentConfig as unknown as ComponentConfig
  // Restore the caller's config type after adding the shared layout controls.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return {
    ...baseConfig,
    fields: {
      ...baseConfig.fields,
      layout: layoutField,
    },
    defaultProps: {
      ...baseConfig.defaultProps,
      layout: {
        spanCol: 1,
        spanRow: 1,
        paddingX: "16px",
        padding: "0px",
        grow: false,
        ...baseConfig.defaultProps?.layout,
      },
    },
    resolveFields: async (
      _data: Parameters<NonNullable<ComponentConfig["resolveFields"]>>[0],
      params: Parameters<NonNullable<ComponentConfig["resolveFields"]>>[1]
    ) => {
      const base = await (baseConfig.resolveFields
        ? baseConfig.resolveFields(_data, params)
        : params.fields)

      const parentType = params.parent?.type

      if (parentType === "Grid") {
        return {
          ...base,
          layout: {
            ...layoutField,
            objectFields: {
              spanCol: layoutField.objectFields.spanCol,
              spanRow: layoutField.objectFields.spanRow,
              paddingX: layoutField.objectFields.paddingX,
              padding: layoutField.objectFields.padding,
            },
          },
        }
      }

      if (parentType === "Flex") {
        return {
          ...base,
          layout: {
            ...layoutField,
            objectFields: {
              grow: layoutField.objectFields.grow,
              paddingX: layoutField.objectFields.paddingX,
              padding: layoutField.objectFields.padding,
            },
          },
        }
      }

      return {
        ...base,
        layout: {
          ...layoutField,
          objectFields: {
            paddingX: layoutField.objectFields.paddingX,
            padding: layoutField.objectFields.padding,
          },
        },
      }
    },
    inline: true,
    render: (
      renderProps: Parameters<NonNullable<ComponentConfig["render"]>>[0]
    ) => {
      const { puck } = renderProps
      const Inner = baseConfig.render
      return (
        <Layout layout={renderProps.layout} ref={puck?.dragRef ?? null}>
          <Inner {...renderProps} />
        </Layout>
      )
    },
  } as unknown as Config
}
