import { type CSSProperties, type ReactElement } from "react"
import type {
  ComponentConfig,
  Fields,
  ObjectField,
} from "@puckeditor/core"

import {
  getIcon,
  iconDependentRadioField,
  iconDependentSelectField,
  iconSelectOptions,
  layoutField,
  optionsField,
  resolveRadius,
  spacingOptions,
  styleFields,
  type ComponentStyleProps,
  type LayoutFieldProps,
} from "@/components/shared/page-editor/blocks/_lib"

type LinkTreeButton = ComponentStyleProps & {
  label: string
  description?: string
  href: string
  variant?: "primary" | "secondary"
  size?: "small" | "large"
  icon?: string
  iconPosition?: "left" | "right" | "top" | "bottom"
  iconOnly?: boolean
}

export type LinkTreeProps = ComponentStyleProps & {
  buttons: LinkTreeButton[]
  /** Vertical gap between the stacked links. */
  verticalGap: string
  layout?: LayoutFieldProps
}

const gapOptions = [
  { label: "0px", value: "0px" },
  ...spacingOptions,
]

/**
 * The link tree only needs the padding part of the shared Layout object (edges
 * are owned by the layout section); grid/flex span controls make no sense on a
 * standalone centered list.
 */
const linkTreeLayoutField: ObjectField<LayoutFieldProps> = {
  ...layoutField,
  objectFields: {
    paddingX: layoutField.objectFields.paddingX,
    padding: layoutField.objectFields.padding,
  },
}

const buttonArray: Fields<LinkTreeProps>["buttons"] = {
  type: "array",
  label: "Buttons",
  min: 1,
  getItemSummary: (item: { label?: string }) =>
    item.label ? item.label : "Button",
  defaultItemProps: {
    label: "Button",
    description: "",
    href: "#",
    variant: "primary",
    size: "large",
    icon: "none",
    iconPosition: "left",
    iconOnly: false,
  },
  arrayFields: {
    label: { type: "text", label: "Label", contentEditable: true },
    description: {
      type: "textarea",
      label: "Description",
      placeholder: "Optional text shown below the label",
    },
    href: { type: "text", label: "Link" },
    variant: {
      type: "radio",
      label: "Style",
      options: [
        { label: "Primary", value: "primary" },
        { label: "Secondary", value: "secondary" },
      ],
    },
    size: {
      type: "radio",
      label: "Size",
      options: [
        { label: "Small", value: "small" },
        { label: "Large", value: "large" },
      ],
    },
    icon: optionsField<LinkTreeButton["icon"]>("Icon", iconSelectOptions),
    iconPosition: iconDependentSelectField<LinkTreeButton["iconPosition"]>(
      "Icon position",
      [
        { label: "Left", value: "left" },
        { label: "Right", value: "right" },
        { label: "Top", value: "top" },
        { label: "Bottom", value: "bottom" },
      ]
    ),
    iconOnly: iconDependentRadioField<LinkTreeButton["iconOnly"]>("Icon only", [
      { label: "False", value: false },
      { label: "True", value: true },
    ]),
    ...styleFields({
      backgroundLabel: "Main color",
      backgroundDefault: "accent",
    }),
  },
}

export const LinkTree: ComponentConfig<LinkTreeProps> = {
  label: "LinkTree",
  fields: {
    buttons: buttonArray,
    verticalGap: optionsField<LinkTreeProps["verticalGap"]>(
      "Vertical gap",
      gapOptions
    ),
    ...styleFields({ backgroundDefault: "transparent" }),
    layout: linkTreeLayoutField,
  } as unknown as Fields<LinkTreeProps>,
  defaultProps: {
    buttons: [
      {
        label: "Website",
        href: "#",
        variant: "primary",
        size: "large",
        icon: "Globe",
        iconPosition: "left",
      },
      {
        label: "GitHub",
        href: "#",
        variant: "secondary",
        size: "large",
        icon: "GitHub",
        iconPosition: "left",
      },
    ],
    verticalGap: "16px",
    layout: {
      paddingX: "16px",
      padding: "24px",
    },
  },
  render: ({
    buttons,
    verticalGap,
    textColor,
    backgroundColor,
    radius,
    fontFamily,
    layout,
    puck,
  }) => {
    const gap = verticalGap || "16px"

    const sectionStyle: CSSProperties = {
      paddingTop: layout?.padding,
      paddingBottom: layout?.padding,
      color: textColor || "var(--nuspace-page-text, #0f172a)",
      backgroundColor: backgroundColor || undefined,
      borderRadius: resolveRadius(radius),
      fontFamily: fontFamily || undefined,
    }

    return (
      <section className="flex w-full" style={sectionStyle}>
        <div
          className="relative z-10 mx-auto flex w-full max-w-[1280px]"
          style={{
            paddingLeft: layout?.paddingX,
            paddingRight: layout?.paddingX,
          }}
        >
          <div
            className="w-full sm:w-fit sm:max-w-full"
            style={{ marginLeft: "auto", marginRight: "auto" }}
          >
            <div className="flex flex-col" style={{ gap }}>
              {buttons.map((button, index) => {
                const ButtonIcon = getIcon(button.icon)
                const showIcon = button.icon && button.icon !== "none"
                const position = button.iconPosition ?? "left"
                const onlyIcon = !!button.iconOnly && !!showIcon
                const stacked = position === "top" || position === "bottom"
                const iconSize = onlyIcon
                  ? button.size === "small"
                    ? 16
                    : 20
                  : 16
                const iconNode = (
                  <ButtonIcon
                    key="icon"
                    style={{ width: iconSize, height: iconSize, flexShrink: 0 }}
                    aria-hidden
                  />
                )
                const labelNode = (
                  <span
                    key="label"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      lineHeight: 1.2,
                      minWidth: 0,
                      overflowWrap: "anywhere",
                    }}
                  >
                    <span style={{ minWidth: 0 }}>{button.label}</span>
                    {button.description ? (
                      <span
                        style={{
                          fontSize: "0.8em",
                          fontWeight: 400,
                          opacity: 0.85,
                          lineHeight: 1.35,
                          minWidth: 0,
                        }}
                      >
                        {button.description}
                      </span>
                    ) : null}
                  </span>
                )
                const contents: ReactElement[] = []
                if (onlyIcon) {
                  contents.push(iconNode)
                } else if (showIcon) {
                  if (position === "left" || position === "top") {
                    contents.push(iconNode, labelNode)
                  } else {
                    contents.push(labelNode, iconNode)
                  }
                } else {
                  contents.push(labelNode)
                }
                return (
                  <a
                    key={index}
                    href={puck?.isEditing ? "#" : button.href || "#"}
                    tabIndex={puck?.isEditing ? -1 : undefined}
                    aria-label={onlyIcon ? button.label || undefined : undefined}
                    style={{
                      display: "inline-flex",
                      flexDirection: stacked ? "column" : "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      boxSizing: "border-box",
                      maxWidth: "100%",
                      padding: onlyIcon
                        ? button.size === "small"
                          ? "10px"
                          : "14px"
                        : button.size === "small"
                          ? stacked
                            ? "10px 12px"
                            : "8px 16px"
                          : stacked
                            ? "16px 20px"
                            : "12px 24px",
                      fontSize: button.size === "small" ? 14 : 16,
                      fontWeight: 500,
                      textDecoration: "none",
                      borderRadius: resolveRadius(button.radius),
                      fontFamily: button.fontFamily || undefined,
                      color:
                        button.variant === "secondary"
                          ? "var(--nuspace-page-text, #0f172a)"
                          : "var(--nuspace-accent-foreground, #ffffff)",
                      backgroundColor:
                        button.variant === "secondary"
                          ? "transparent"
                          : "var(--nuspace-accent, #1d4ed8)",
                      border:
                        button.variant === "secondary"
                          ? `1px solid ${
                              button.backgroundColor ||
                              "var(--nuspace-accent, #1d4ed8)"
                            }`
                          : "none",
                      ...(button.textColor ? { color: button.textColor } : {}),
                      ...(button.backgroundColor
                        ? { backgroundColor: button.backgroundColor }
                        : {}),
                    }}
                  >
                    {contents}
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      </section>
    )
  },
}