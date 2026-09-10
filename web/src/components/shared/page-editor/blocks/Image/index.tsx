import { type CSSProperties } from "react"
import type { ComponentConfig } from "@puckeditor/core"
import { ImageIcon } from "lucide-react"

import { Section } from "@/components/shared/page-editor/blocks/_shared/section"
import {
  getComponentStyle,
  optionsField,
  photoFields,
  styleFields,
  withLayout,
  type ComponentStyleProps,
  type PhotoFields,
  type WithLayout,
} from "@/components/shared/page-editor/blocks/_lib"
import { useResolvedFileUrl } from "@/components/shared/page-editor/hooks/use-resolved-file-url"

export type ImageSize = "s" | "m" | "l"

export type ImageProps = WithLayout<
  PhotoFields &
    ComponentStyleProps & {
      size?: ImageSize
      /**
       * How the picture fits its frame. `cover` fills the frame (cropping, uses
       * the focal point); `contain` shows the whole picture inside it.
       */
      fit?: "cover" | "contain"
    }
>

/**
 * A picture's size maps to the share of its container it may fill. Being
 * proportional keeps the image consistent on mobile (a fixed px cap shrinks
 * oddly against narrow screens).
 */
const IMAGE_SIZE_WIDTH: Record<ImageSize, string> = {
  s: "40%",
  m: "70%",
  l: "100%",
}

const imageSizeOptions = [
  { label: "S", value: "s" },
  { label: "M", value: "m" },
  { label: "L", value: "l" },
] as const

function imageStyle(
  aspectRatio: PhotoFields["aspectRatio"],
  focalPoint: string,
  fit: ImageProps["fit"]
): CSSProperties {
  const base: CSSProperties = {
    width: "100%",
    objectFit: fit ?? "cover",
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
    size: optionsField<ImageProps["size"]>("Size", imageSizeOptions),
    fit: optionsField<ImageProps["fit"]>("Fit", [
      { label: "Cover", value: "cover" },
      { label: "Contain", value: "contain" },
    ]),
    ...styleFields({
      font: false,
      text: false,
      backgroundDefault: "transparent",
    }),
  },
  defaultProps: {
    image: "",
    alt: "",
    aspectRatio: "original",
    focalPoint: "50% 50%",
    size: "m",
    fit: "cover",
  },
render: function ImageBlock({
    image,
    alt,
    aspectRatio,
    focalPoint,
    size,
    fit,
    ...style
  }) {
    const imageUrl = useResolvedFileUrl(image)
    const circle = aspectRatio === "circle"
    const maxWidth = size ? IMAGE_SIZE_WIDTH[size] : undefined
    return (
      <Section>
        <div
          style={{
            ...getComponentStyle(style),
            overflow: "hidden",
            maxWidth,
            margin: maxWidth ? "0 auto" : undefined,
            ...(circle ? { borderRadius: "50%" } : {}),
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={alt}
              style={imageStyle(aspectRatio, focalPoint, fit)}
            />
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
