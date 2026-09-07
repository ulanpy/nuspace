import { ImageField } from "@/components/shared/page-editor/blocks/_shared"
import { useResolvedFileUrl } from "@/components/shared/page-editor/hooks/use-resolved-file-url"

export const Hero = {
  label: "Hero",
  fields: {
    title: {
      type: "text" as const,
      label: "Title",
      contentEditable: true,
    },
    description: {
      type: "richtext" as const,
      label: "Description",
      contentEditable: true,
    },
    buttons: {
      type: "array" as const,
      label: "Buttons",
      min: 1,
      max: 4,
      getItemSummary: (item: { label?: string }) =>
        item.label ? item.label : "Button",
      defaultItemProps: { label: "Button", href: "#" },
      arrayFields: {
        label: { type: "text" as const, contentEditable: true },
        href: { type: "text" as const },
        variant: {
          type: "select" as const,
          options: [
            { label: "primary", value: "primary" },
            { label: "secondary", value: "secondary" },
          ],
        },
      },
    },
    align: {
      type: "radio" as const,
      label: "Align",
      options: [
        { label: "left", value: "left" },
        { label: "center", value: "center" },
      ],
    },
    image: {
      type: "object" as const,
      label: "Image",
      objectFields: {
        mode: {
          type: "radio" as const,
          label: "Mode",
          options: [
            { label: "Inline", value: "inline" },
            { label: "Background", value: "background" },
          ],
        },
        url: {
          type: "custom" as const,
          label: "Image",
          render: ImageField,
        },
      },
    },
    padding: {
      type: "select" as const,
      label: "Vertical Padding",
      options: [
        { label: "0px", value: "0px" },
        { label: "16px", value: "16px" },
        { label: "32px", value: "32px" },
        { label: "64px", value: "64px" },
        { label: "96px", value: "96px" },
        { label: "128px", value: "128px" },
      ],
    },
  },
  defaultProps: {
    title: "Hero",
    align: "left" as const,
    description: "<p>Description</p>",
    buttons: [{ label: "Learn more", href: "#" }],
    image: { mode: "inline" as const, url: "" },
    padding: "64px",
  },
  render: ({
    title,
    description,
    buttons,
    align,
    image,
    padding,
  }: {
    title: string
    description: string
    buttons: { label: string; href: string; variant?: string }[]
    align: "left" | "center"
    image?: { mode?: "inline" | "background"; url?: string }
    padding: string
  }) => {
    const centered = align === "center"
    const isBackground = image?.mode === "background" && !!image.url
    const isInline = !isBackground && !!image?.url
    return (
      <section
        className="relative flex items-center overflow-hidden"
        style={{ paddingTop: padding, paddingBottom: padding }}
      >
        {isBackground && image?.url && <HeroBackground url={image.url} />}

        <div className="relative z-10 mx-auto flex w-full max-w-[1280px] flex-wrap items-center gap-12 px-4 md:px-5">
          <div
            className={[
              "flex w-full flex-col gap-4",
              centered ? "items-center text-center" : "items-start text-left",
            ].join(" ")}
          >
            <h1
              className={[
                "m-0 text-5xl leading-[1.1] font-bold tracking-tight sm:text-6xl",
                isBackground ? "text-white" : "text-foreground",
              ].join(" ")}
            >
              {title}
            </h1>
            <div
              className={[
                "leading-relaxed font-light [&_a]:underline",
                isBackground ? "text-white/80" : "text-muted-foreground",
                centered ? "max-w-full" : "",
              ].join(" ")}
            >
              {description}
            </div>
            {buttons.length > 0 && (
              <div
                className={[
                  "flex flex-wrap gap-4",
                  centered ? "justify-center" : "",
                ].join(" ")}
              >
                {buttons.map((button, index) => (
                  <a
                    key={index}
                    href={button.href || "#"}
                    className={[
                      "inline-flex items-center justify-center rounded-md px-6 py-3 text-base font-medium",
                      button.variant === "secondary"
                        ? isBackground
                          ? "border border-white/70 bg-transparent text-white hover:bg-white/10"
                          : "border border-input bg-background text-foreground hover:bg-accent"
                        : "bg-primary text-primary-foreground hover:bg-primary/90",
                    ].join(" ")}
                  >
                    {button.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          {!centered && isInline && image?.url && (
            <HeroImage filename={image.url} className="h-[356px] w-full" />
          )}
        </div>
      </section>
    )
  },
}

function HeroBackground({ url }: { url: string }) {
  const imageUrl = useResolvedFileUrl(url)
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

function HeroImage({
  filename,
  className,
}: {
  filename: string
  className?: string
}) {
  const imageUrl = useResolvedFileUrl(filename)
  if (!imageUrl) {
    return <div className={`bg-muted ${className}`} />
  }
  return (
    <img
      src={imageUrl}
      alt=""
      className={`rounded-2xl object-cover ${className}`}
    />
  )
}
