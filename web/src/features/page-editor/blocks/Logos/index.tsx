import type { ComponentConfig } from "@puckeditor/core"
import { Section } from "@/features/page-editor/blocks/_shared/section"
import { useResolvedFileUrl } from "@/features/page-editor/hooks/use-resolved-file-url"
import { LogoImageField } from "./logo-image-field"

type LogoItem = { alt: string; image: string }

export const Logos: ComponentConfig<{ logos: LogoItem[] }> = {
  label: "Logos",
  fields: {
    logos: {
      type: "array",
      getItemSummary: (item: LogoItem, i) => item.alt || `Logo #${i}`,
      defaultItemProps: { alt: "", image: "" },
      arrayFields: {
        alt: { type: "text" },
        image: {
          type: "custom",
          label: "Image",
          render: LogoImageField,
        },
      },
    },
  },
  defaultProps: {
    logos: [{ alt: "Logo", image: "" }],
  },
  render: ({ logos }: { logos: LogoItem[] }) => (
    <Section className="bg-muted">
      <div className="flex items-center justify-between gap-5 py-16 opacity-80">
        {logos.map((logo, index) => (
          <Logo key={index} {...logo} />
        ))}
      </div>
    </Section>
  ),
}

function Logo({ alt, image }: LogoItem) {
  const imageUrl = useResolvedFileUrl(image)
  if (!imageUrl) return null
  return (
    <img
      src={imageUrl}
      alt={alt}
      className="h-16 object-contain brightness-[10] grayscale"
    />
  )
}
