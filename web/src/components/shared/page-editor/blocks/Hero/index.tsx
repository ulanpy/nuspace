import { type CSSProperties, type ReactElement } from "react"
import type { ComponentConfig, Fields, ObjectField } from "@puckeditor/core"
import { ImageIcon } from "lucide-react"

import {
  buttonArrayField,
  getIcon,
  layoutField,
  optionsField,
  photoFields,
  resolveRadius,
  spacingOptions,
  safeHref,
  styleFields,
  textSizePx,
  type ComponentStyleProps,
  type LayoutFieldProps,
  type PageButton,
  type PhotoFields,
  type TextSize,
} from "@/components/shared/page-editor/blocks/_lib"
import { ImageField } from "@/components/shared/page-editor/blocks/_shared"
import { SanitizedHtml } from "@/components/shared/page-editor/blocks/_shared/sanitized-html"
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

type VerticalAlign = "top" | "center" | "bottom"

export type HeroProps = ComponentStyleProps & {
  title: string
  description: string
  buttons: PageButton[]
  align: "left" | "center" | "right"
  verticalAlign?: VerticalAlign
  fontSize?: TextSize
  /** Vertical gap (row gap): spacing between stacked content, incl. on mobile. */
  verticalGap: string
  /** Horizontal gap (column gap): spacing between columns and within button rows. */
  horizontalGap: string
  image?: HeroImage
  layout?: LayoutFieldProps
}

const gapOptions = [{ label: "0px", value: "0px" }, ...spacingOptions]

/**
 * The hero only needs the padding part of the shared Layout object (edges are
 * owned by the layout section); grid/flex span controls make no sense on a
 * full-bleed section.
 */
const heroLayoutField: ObjectField<LayoutFieldProps> = {
  ...layoutField,
  objectFields: {
    paddingX: layoutField.objectFields.paddingX,
    padding: layoutField.objectFields.padding,
  },
}

const flexAlign = (
  value?: VerticalAlign
): "flex-start" | "center" | "flex-end" =>
  value === "top" ? "flex-start" : value === "bottom" ? "flex-end" : "center"

const alignOptions = [
  { label: "Left", value: "left" },
  { label: "Center", value: "center" },
  { label: "Right", value: "right" },
]

const placementField = optionsField<
  NonNullable<HeroProps["image"]>["placement"]
>("Placement", [
  { label: "Top", value: "top" },
  { label: "Bottom", value: "bottom" },
  { label: "Left", value: "left" },
  { label: "Right", value: "right" },
])

const modeField = {
  type: "radio" as const,
  label: "Mode",
  options: [
    { label: "Inline", value: "inline" },
    { label: "Background", value: "background" },
  ],
}

/**
 * The image object adapts to its mode: inline photos crop a frame (aspect
 * ratio + focal point), background photos fill the section and are sized by
 * height (S/M/L) instead. Swapped in via `resolveFields`.
 */
function imageField(isBackground: boolean): Fields<HeroProps>["image"] {
  if (isBackground) {
    return {
      type: "object",
      label: "Image",
      objectFields: {
        placement: placementField,
        mode: modeField,
        url: {
          type: "custom",
          label: "Image",
          render: ImageField,
        },
        alt: { type: "text", label: "Alt text" },
      },
    } as unknown as Fields<HeroProps>["image"]
  }
  return {
    type: "object",
    label: "Image",
    objectFields: {
      placement: placementField,
      mode: modeField,
      ...photoFields({ urlField: "url" }),
      ...styleFields({
        font: false,
        text: false,
        backgroundDefault: "transparent",
      }),
    },
  } as unknown as Fields<HeroProps>["image"]
}

function buildHeroFields(image?: HeroImage): Fields<HeroProps> {
  const isBackground = image?.mode === "background"
  return {
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
    buttons: buttonArrayField({ max: 4 }),
    align: {
      type: "radio",
      label: "Horizontal align",
      options: alignOptions,
    },
    verticalAlign: {
      type: "radio",
      label: "Vertical align",
      options: [
        { label: "Top", value: "top" },
        { label: "Center", value: "center" },
        { label: "Bottom", value: "bottom" },
      ],
    },
    fontSize: optionsField<HeroProps["fontSize"]>("Font size", [
      { label: "S", value: "s" },
      { label: "M", value: "m" },
      { label: "L", value: "l" },
    ]),
    verticalGap: optionsField<HeroProps["verticalGap"]>(
      "Vertical gap",
      gapOptions
    ),
    horizontalGap: optionsField<HeroProps["horizontalGap"]>(
      "Horizontal gap",
      gapOptions
    ),
    image: imageField(isBackground),
    ...styleFields({ backgroundDefault: "transparent" }),
    layout: heroLayoutField,
  } as unknown as Fields<HeroProps>
}

export const Hero: ComponentConfig<HeroProps> = {
  label: "Hero",
  fields: buildHeroFields({ mode: "inline" }),
  resolveFields: (data) => buildHeroFields(data.props.image),
  defaultProps: {
    title: "Hero",
    align: "left",
    verticalAlign: "center",
    fontSize: "m",
    description: "<p>Description</p>",
    buttons: [
      {
        label: "Learn more",
        href: "#",
        variant: "primary",
        size: "large",
        icon: "none",
        iconPosition: "left",
        iconOnly: false,
      },
    ],
    image: {
      mode: "inline",
      placement: "right",
      url: "",
      alt: "",
      aspectRatio: "original",
    },
    verticalGap: "24px",
    horizontalGap: "24px",
    layout: {
      paddingX: "16px",
      padding: "64px",
    },
  },
  render: ({
    title,
    description,
    buttons,
    align,
    verticalAlign,
    fontSize,
    image,
    verticalGap,
    horizontalGap,
    textColor,
    backgroundColor,
    radius,
    fontFamily,
    layout,
    puck,
  }) => {
    const centered = align === "center"
    const isBackground = image?.mode === "background" && !!image?.url
    const photo = !isBackground ? image : undefined
    const placement = image?.placement ?? "right"
    const isRow = placement === "left" || placement === "right"
    const row = isRow && !isBackground
    const photoFirst = placement === "left" || placement === "top"

    const onBackground = isBackground
    const headingColor = textColor || (onBackground ? "#ffffff" : undefined)
    const vertical = verticalGap || "24px"
    const horizontal = horizontalGap || "24px"
    const descriptionFontSize = textSizePx(fontSize)

    const contentDivStyle: CSSProperties = {
      display: "flex",
      flexDirection: "column",
      alignItems: centered
        ? "center"
        : align === "right"
          ? "flex-end"
          : "flex-start",
      textAlign: centered ? "center" : align,
      gap: vertical,
      ...(row ? { flex: "1 1 0" } : {}),
    }

    const buttonRowStyle: CSSProperties = {
      display: "flex",
      rowGap: vertical,
      columnGap: horizontal,
    }

    const content = (
      <div
        className={`w-full ${row ? "sm:w-1/2" : ""}`}
        style={contentDivStyle}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "3rem",
            lineHeight: 1.1,
            fontWeight: 700,
            letterSpacing: "-0.011em",
            color: headingColor,
          }}
        >
          {title}
        </h1>
        <SanitizedHtml
          html={description}
          className="nuspace-richtext"
          style={{
            fontSize: `${descriptionFontSize}px`,
            lineHeight: 1.6,
            fontWeight: 300,
            width: "100%",
            color:
              textColor ||
              (onBackground ? "rgba(255,255,255,0.85)" : undefined),
          }}
        />
        {buttons.length > 0 && (
          <div
            className={[
              "flex w-full flex-col sm:flex-row sm:flex-wrap sm:items-center",
              centered
                ? "sm:justify-center"
                : align === "right"
                  ? "sm:justify-end"
                  : "sm:justify-start",
            ].join(" ")}
            style={buttonRowStyle}
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
                  href={puck?.isEditing ? "#" : safeHref(button.href) || "#"}
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
                        ? onBackground
                          ? "#ffffff"
                          : "var(--nuspace-page-text, #0f172a)"
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
        )}
      </div>
    )

    const photoElement = photo ? (
      <div className={`w-full ${row ? "sm:w-1/2" : ""}`}>
        {photo.url ? (
          <HeroPhoto image={photo} />
        ) : (
          <div
            className={
              photo.aspectRatio === "circle"
                ? "flex aspect-square w-full items-center justify-center rounded-full bg-muted"
                : "flex aspect-video w-full items-center justify-center bg-muted"
            }
            style={{
              borderRadius: resolveRadius(
                photo.radius,
                "var(--nuspace-radius, 24px)"
              ),
            }}
          >
            <ImageIcon className="size-8 text-muted-foreground" />
          </div>
        )}
      </div>
    ) : null

    const alignsVertically = verticalAlign && verticalAlign !== "center"

    return (
      <section
        className="relative flex w-full overflow-hidden"
        style={{
          paddingTop: layout?.padding,
          paddingBottom: layout?.padding,
          color: headingColor,
          backgroundColor: backgroundColor || undefined,
          borderRadius: resolveRadius(radius),
          fontFamily: fontFamily || undefined,
          alignItems: "center",
          // The vertical align control is only meaningful when the section is
          // taller than its content, so give those modes a working height.
          minHeight: !isBackground && alignsVertically ? "60vh" : undefined,
        }}
      >
        {onBackground && <HeroBackground filename={image?.url ?? ""} />}
        <div
          className={`relative z-10 mx-auto flex w-full max-w-[1280px] flex-col ${
            row ? "sm:flex-row" : ""
          }`}
          style={{
            rowGap: vertical,
            columnGap: horizontal,
            paddingLeft: layout?.paddingX,
            paddingRight: layout?.paddingX,
            alignItems: row ? flexAlign(verticalAlign) : undefined,
            justifyContent: row ? undefined : flexAlign(verticalAlign),
            ...(!isBackground && alignsVertically ? { height: "100%" } : {}),
          }}
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
