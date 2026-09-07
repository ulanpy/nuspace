import { forwardRef, type CSSProperties, type ReactNode } from "react"
import type {
  ComponentConfig,
  DefaultComponentProps,
  ObjectField,
} from "@puckeditor/core"
import { spacingOptions } from "./options"

export type LayoutFieldProps = {
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
  objectFields: {
    spanCol: {
      label: "Grid Columns",
      type: "number",
      min: 1,
      max: 12,
    },
    spanRow: {
      label: "Grid Rows",
      type: "number",
      min: 1,
      max: 12,
    },
    grow: {
      label: "Flex Grow",
      type: "radio",
      options: [
        { label: "true", value: true },
        { label: "false", value: false },
      ],
    },
    padding: {
      type: "select",
      label: "Vertical Padding",
      options: [{ label: "0px", value: "0px" }, ...spacingOptions],
    },
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
  const baseConfig = componentConfig as unknown as ComponentConfig
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
            padding: layoutField.objectFields.padding,
          },
        },
      }
    },
    inline: true,
    render: (
      renderProps: Parameters<NonNullable<ComponentConfig["render"]>>[0]
    ) => {
      const { puck } = renderProps as unknown as {
        puck?: { dragRef?: ((element: Element | null) => void) | null }
      }
      const Inner = baseConfig.render as (props: unknown) => ReactNode
      return (
        <Layout layout={renderProps.layout} ref={puck?.dragRef ?? null}>
          {Inner(renderProps)}
        </Layout>
      )
    },
  } as unknown as Config
}
