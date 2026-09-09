import { type CSSProperties } from "react"
import type { ComponentConfig } from "@puckeditor/core"
import { ImageIcon } from "lucide-react"

import { Section } from "@/components/shared/page-editor/blocks/_shared/section"
import {
  getComponentStyle,
  photoFields,
  styleFields,
  withLayout,
  type ComponentStyleProps,
  type PhotoFields,
  type WithLayout,
} from "@/components/shared/page-editor/blocks/_lib"
import { useResolvedFileUrl } from "@/components/shared/page-editor/hooks/use-resolved-file-url"

export type ImageProps = WithLayout<PhotoFields & ComponentStyleProps>

function imageStyle(
  aspectRatio: PhotoFields["aspectRatio"],
  focalPoint: string
): CSSProperties {
  const base: CSSProperties = {
    width: "100%",
    objectFit: "cover",
    objectPosition: focalPoint,
  }
  switch (aspectRatio) {
    case "original":
      return { ...base, height: "auto", display: "block" }
    case "circle":
      return {
        ...base,
        aspectRatio: "1/1",
        borderRadius: "50%",
        display: "block",
      }
    default:
      return { ...base, aspectRatio, display: "block" }
  }
}

const ImageInner: ComponentConfig<ImageProps> = {
  fields: {
    ...photoFields({ limited: true }),
    ...styleFields({ font: false, text: false, backgroundDefault: "transparent" }),
  },
  defaultProps: {
    image: "",
    alt: "",
    aspectRatio: "original",
    focalPoint: "50% 50%",
  },
  render: ({ image, alt, aspectRatio, focalPoint, ...style }) => {
    const imageUrl = useResolvedFileUrl(image)
    const circle = aspectRatio === "circle"
    return (
      <Section>
        <div
          style={{
            ...getComponentStyle(style),
            overflow: "hidden",
            ...(circle ? { borderRadius: "50%" } : {}),
          }}
        >
          {imageUrl ? (
            <img src={imageUrl} alt={alt} style={imageStyle(aspectRatio, focalPoint)} />
          ) : (
            <div
              className={
                circle
                  ? "flex aspect-square w-full items-center justify-center rounded-full bg-muted"
                  : "flex aspect-video w-full items-center justify-center bg-muted"
              }
            >
              <ImageIcon className="size-8 text-muted-foreground" />
            </div>
          )}
        </div>
      </Section>
    )
  },
}

export const Image = withLayout(ImageInner)