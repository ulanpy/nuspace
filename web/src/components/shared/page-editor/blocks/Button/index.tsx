import { type CSSProperties, type ReactElement } from "react"
import { type ComponentConfig, type Fields } from "@puckeditor/core"

import {
  getIcon,
  iconSelectOptions,
  optionsField,
  resolveRadius,
  styleFields,
  type ComponentStyleProps,
  type Option,
} from "@/components/shared/page-editor/blocks/_lib"

export type IconPosition = "left" | "right" | "top" | "bottom"

export type ButtonProps = ComponentStyleProps & {
  label: string
  description?: string
  href: string
  variant: "primary" | "secondary"
  size: "small" | "large"
  icon?: string
  iconPosition: IconPosition
  iconOnly: boolean
}

const PRIMARY_TEXT = "var(--nuspace-accent-foreground, #ffffff)"

const iconPositionOptions: Option<IconPosition>[] = [
  { label: "Left", value: "left" },
  { label: "Right", value: "right" },
  { label: "Top", value: "top" },
  { label: "Bottom", value: "bottom" },
]

const buttonFields: Fields<ButtonProps> = {
  label: {
    type: "text",
    label: "Label",
    placeholder: "Lorem ipsum...",
    contentEditable: true,
  },
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
  icon: optionsField<ButtonProps["icon"]>("Icon", iconSelectOptions),
  iconPosition: optionsField<ButtonProps["iconPosition"]>(
    "Icon position",
    iconPositionOptions
  ),
  iconOnly: {
    type: "radio",
    label: "Icon only",
    options: [
      { label: "False", value: false },
      { label: "True", value: true },
    ],
  },
  ...styleFields({
    backgroundLabel: "Main color",
    backgroundDefault: "accent",
  }),
}

const {
  label: labelField,
  description: descriptionField,
  href: hrefField,
  variant: variantField,
  size: sizeField,
  icon: iconField,
} = buttonFields

export const Button: ComponentConfig<ButtonProps> = {
  label: "Button",
  fields: buttonFields,
  resolveFields: (data) => {
    const icon = data.props.icon
    const showIconControls = !!icon && icon !== "none"
    const hideText = showIconControls && data.props.iconOnly

    // Puck allows resolveFields to hide required props without deleting their data.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    return {
      ...(hideText ? {} : { label: labelField, description: descriptionField }),
      href: hrefField,
      variant: variantField,
      size: sizeField,
      icon: iconField,
      ...(showIconControls && !hideText
        ? { iconPosition: buttonFields.iconPosition }
        : {}),
      ...(showIconControls ? { iconOnly: buttonFields.iconOnly } : {}),
      ...styleFields({
        backgroundLabel: "Main color",
        backgroundDefault: "accent",
      }),
    } as Fields<ButtonProps>
  },
  defaultProps: {
    label: "Button",
    description: "",
    href: "#",
    variant: "primary",
    size: "large",
    icon: "none",
    iconPosition: "left",
    iconOnly: false,
  },
  render: ({
    href,
    variant,
    label,
    description,
    size,
    icon,
    iconPosition,
    iconOnly,
    puck,
    textColor,
    backgroundColor,
    radius,
    fontFamily,
  }) => {
    const Icon = getIcon(icon)
    const showIcon = icon && icon !== "none"
    const onlyIcon = iconOnly && !!showIcon
    const stacked = iconPosition === "top" || iconPosition === "bottom"

    const variantStyle: CSSProperties =
      variant === "primary"
        ? {
            backgroundColor: "var(--nuspace-accent, #1d4ed8)",
            color: PRIMARY_TEXT,
          }
        : {
            backgroundColor: "transparent",
            color: "var(--nuspace-page-text, #0f172a)",
            border: `1px solid ${
              backgroundColor || "var(--nuspace-accent, #1d4ed8)"
            }`,
          }

    const style: CSSProperties = {
      display: "inline-flex",
      flexDirection: stacked ? "column" : "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      fontWeight: 500,
      textDecoration: "none",
      boxSizing: "border-box",
      maxWidth: "100%",
      ...variantStyle,
      ...(textColor ? { color: textColor } : {}),
      ...(backgroundColor ? { backgroundColor } : {}),
      borderRadius: resolveRadius(radius),
      fontFamily: fontFamily || undefined,
      padding: onlyIcon
        ? size === "large"
          ? "14px"
          : "10px"
        : size === "large"
          ? stacked
            ? "16px 20px"
            : "12px 24px"
          : stacked
            ? "10px 12px"
            : "8px 16px",
      fontSize: size === "large" ? "16px" : "14px",
    }

    const iconSize = onlyIcon ? (size === "large" ? 20 : 16) : 16
    const iconStyle = { width: iconSize, height: iconSize, flexShrink: 0 }

    const contents: ReactElement[] = []
    if (onlyIcon) {
      contents.push(<Icon key="icon" style={iconStyle} aria-hidden />)
    } else {
      const textNode = (
        <span
          key="text"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            lineHeight: 1.2,
            minWidth: 0,
            overflowWrap: "anywhere",
          }}
        >
          <span style={{ minWidth: 0 }}>{label}</span>
          {description ? (
            <span
              style={{
                fontSize: "0.8em",
                fontWeight: 400,
                opacity: 0.85,
                lineHeight: 1.35,
                minWidth: 0,
              }}
            >
              {description}
            </span>
          ) : null}
        </span>
      )
      if (showIcon) {
        const iconNode = <Icon key="icon" style={iconStyle} aria-hidden />
        switch (iconPosition) {
          case "left":
            contents.push(iconNode, textNode)
            break
          case "right":
            contents.push(textNode, iconNode)
            break
          case "top":
            contents.push(iconNode, textNode)
            break
          case "bottom":
            contents.push(textNode, iconNode)
            break
        }
      } else {
        contents.push(textNode)
      }
    }

    return (
      <a
        href={puck.isEditing ? "#" : href}
        style={style}
        className="w-full sm:w-auto"
        tabIndex={puck.isEditing ? -1 : undefined}
        aria-label={onlyIcon ? label || undefined : undefined}
      >
        {contents}
      </a>
    )
  },
}
