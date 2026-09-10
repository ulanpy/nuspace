import { type CSSProperties, type ReactElement } from "react"
import type { ComponentConfig } from "@puckeditor/core"

import {
  getIcon,
  iconSelectOptions,
  iconDependentSelectField,
  iconDependentRadioField,
  optionsField,
  photoFields,
  resolveRadius,
  styleFields,
  type ComponentStyleProps,
  type PhotoFields,
} from "@/components/shared/page-editor/blocks/_lib"
import { useResolvedFileUrl } from "@/components/shared/page-editor/hooks/use-resolved-file-url"

type HeroImage = {
  mode?: "inline" | "background"
  placement?: "top" | "bottom" | "left" | "right"
  url?: string
  alt?: string
  aspectRatio?: PhotoFields["aspectRatio"]
  focalPoint?: string
  backgroundColor?: string
  radius?: string
}

type HeroButton = ComponentStyleProps & {
  label: string
  description?: string
  href: string
  variant?: "primary" | "secondary"
  size?: "small" | "large"
  icon?: string
  iconPosition?: "left" | "right" | "top" | "bottom"
  iconOnly?: boolean
}

export type HeroProps = ComponentStyleProps & {
  title: string
  description: string
  buttons: HeroButton[]
  align: "left" | "center" | "right"
  /**
   * The gap between the title, description and button row (vertical), between
   * buttons and the photo (horizontal), and the padding from the sides of the
   * hero. A single value controls all of them.
   */
  contentGap: string
  padding: string
  image?: HeroImage
}

export const Hero: ComponentConfig<HeroProps> = {
  label: "Hero",
  fields: {
    title: {
      type: "text",
      label: "Title",
      contentEditable: true,
    },
    description: {
      type: "richtext",
      label: "Description",
      contentEditable: true,
    },
    buttons: {
      type: "array",
      label: "Buttons",
      min: 1,
      max: 4,
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
        icon: optionsField<HeroButton["icon"]>("Icon", iconSelectOptions),
        iconPosition: iconDependentSelectField<HeroButton["iconPosition"]>(
          "Icon position",
          [
            { label: "Left", value: "left" },
            { label: "Right", value: "right" },
            { label: "Top", value: "top" },
            { label: "Bottom", value: "bottom" },
          ]
        ),
        iconOnly: iconDependentRadioField<HeroButton["iconOnly"]>("Icon only", [
          { label: "False", value: false },
          { label: "True", value: true },
        ]),
        ...styleFields({
          backgroundLabel: "Main color",
          backgroundDefault: "accent",
        }),
      },
    },
    align: {
      type: "radio",
      label: "Align",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
    contentGap: optionsField<HeroProps["contentGap"]>("Content gap & padding", [
      { label: "8px", value: "8px" },
      { label: "16px", value: "16px" },
      { label: "24px", value: "24px" },
      { label: "32px", value: "32px" },
      { label: "48px", value: "48px" },
    ]),
    image: {
      type: "object",
      label: "Image",
      objectFields: {
        placement: optionsField<NonNullable<HeroProps["image"]>["placement"]>(
          "Placement",
          [
            { label: "Top", value: "top" },
            { label: "Bottom", value: "bottom" },
            { label: "Left", value: "left" },
            { label: "Right", value: "right" },
          ]
        ),
        mode: {
          type: "radio",
          label: "Mode",
          options: [
            { label: "Inline", value: "inline" },
            { label: "Background", value: "background" },
          ],
        },
        ...photoFields({ urlField: "url" }),
        ...styleFields({
          font: false,
          text: false,
          backgroundDefault: "transparent",
        }),
      },
    },
    padding: optionsField<string>("Vertical padding", [
      { label: "0px", value: "0px" },
      { label: "16px", value: "16px" },
      { label: "32px", value: "32px" },
      { label: "64px", value: "64px" },
      { label: "96px", value: "96px" },
      { label: "128px", value: "128px" },
    ]),
    ...styleFields({ backgroundDefault: "transparent" }),
  },
  defaultProps: {
    title: "Hero",
    align: "left",
    description: "<p>Description</p>",
    buttons: [
      {
        label: "Learn more",
        href: "#",
        variant: "primary",
        size: "large",
        icon: "none",
        iconPosition: "left",
      },
    ],
    image: {
      mode: "inline",
      placement: "right",
      url: "",
      alt: "",
      aspectRatio: "original",
    },
    contentGap: "16px",
    padding: "64px",
  },
  render: ({
    title,
    description,
    buttons,
    align,
    image,
    contentGap,
    padding,
    textColor,
    backgroundColor,
    radius,
    fontFamily,
    puck,
  }) => {
    const centered = align === "center"
    const isBackground = image?.mode === "background" && !!image?.url
    const photo = !isBackground ? image : undefined
    const placement = image?.placement ?? "right"
    const isRow = placement === "left" || placement === "right"
    // In background mode the photo fills the section, so the content always
    // spans the full width of the hero and aligns against it, not a half column.
    const row = isRow && !isBackground
    const photoFirst = placement === "left" || placement === "top"
    const spacing = contentGap || "16px"

    const onBackground = isBackground
    const sectionStyle: CSSProperties = {
      paddingTop: padding,
      paddingBottom: padding,
      color: textColor || (onBackground ? "#ffffff" : undefined),
      backgroundColor: backgroundColor || undefined,
      borderRadius: resolveRadius(radius),
      fontFamily: fontFamily || undefined,
    }

    const contentStyle: CSSProperties = {
      display: "flex",
      flexDirection: "column",
      alignItems: centered
        ? "center"
        : align === "right"
          ? "flex-end"
          : "flex-start",
      textAlign: centered ? "center" : align,
      gap: spacing,
    }

    const content = (
      <div className={`w-full ${row ? "sm:w-1/2" : ""}`} style={contentStyle}>
        <h1
          style={{
            margin: 0,
            fontSize: "3rem",
            lineHeight: 1.1,
            fontWeight: 700,
            letterSpacing: "-0.011em",
            color: textColor || (onBackground ? "#ffffff" : undefined),
          }}
        >
          {title}
        </h1>
        <div
          style={{
            lineHeight: 1.6,
            fontWeight: 300,
            width: "100%",
            color:
              textColor || (onBackground ? "rgba(255,255,255,0.8)" : undefined),
          }}
        >
          {description}
        </div>
        {buttons.length > 0 && (
          <div
            className="flex w-full flex-col sm:flex-row sm:flex-wrap"
            style={{
              gap: spacing,
              justifyContent: centered
                ? "center"
                : align === "right"
                  ? "flex-end"
                  : "flex-start",
            }}
          >
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
                  }}
                >
                  <span>{button.label}</span>
                  {button.description ? (
                    <span
                      style={{
                        fontSize: "0.8em",
                        fontWeight: 400,
                        opacity: 0.85,
                        lineHeight: 1.35,
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
                  className="w-full sm:w-auto"
                  aria-label={onlyIcon ? button.label || undefined : undefined}
                  style={{
                    display: "inline-flex",
                    flexDirection: stacked ? "column" : "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxSizing: "border-box",
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
                        ? onBackground
                          ? "#ffffff"
                          : "var(--nuspace-text, #0f172a)"
                        : "var(--nuspace-button-text, #ffffff)",
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
        )}
      </div>
    )

    const photoElement = photo?.url ? (
      <div className={`w-full ${row ? "sm:w-1/2" : ""}`}>
        <HeroPhoto image={photo} />
      </div>
    ) : null

    return (
      <section
        className="relative flex w-full items-center overflow-hidden"
        style={sectionStyle}
      >
        {onBackground && <HeroBackground filename={image?.url ?? ""} />}
        <div
          className={`relative z-10 mx-auto flex w-full max-w-[1280px] flex-col ${
            row ? "sm:flex-row sm:items-center" : ""
          }`}
          style={{ gap: spacing, paddingLeft: spacing, paddingRight: spacing }}
        >
          {photoFirst ? (
            <>
              {photoElement}
              {content}
            </>
          ) : (
            <>
              {content}
              {photoElement}
            </>
          )}
        </div>
      </section>
    )
  },
}

function HeroBackground({ filename }: { filename: string }) {
  const imageUrl = useResolvedFileUrl(filename)
  if (!imageUrl) return null
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("${imageUrl}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-black/60" />
    </>
  )
}

function HeroPhoto({ image }: { image: NonNullable<HeroProps["image"]> }) {
  const imageUrl = useResolvedFileUrl(image.url ?? "")
  if (!imageUrl) {
    return null
  }
  const ratio = image.aspectRatio ?? "original"
  const base: CSSProperties = {
    width: "100%",
    display: "block",
    objectFit: "cover",
    objectPosition: image.focalPoint || "50% 50%",
    borderRadius: resolveRadius(image.radius, "var(--nuspace-radius, 24px)"),
    backgroundColor: image.backgroundColor || undefined,
  }
  const style: CSSProperties =
    ratio === "original"
      ? { ...base, height: "auto" }
      : ratio === "circle"
        ? {
            ...base,
            aspectRatio: "1/1",
            borderRadius: "50%",
          }
        : { ...base, aspectRatio: ratio }
  return <img src={imageUrl} alt={image.alt ?? ""} style={style} />
}
