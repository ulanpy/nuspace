import type { ComponentConfig } from "@puckeditor/core"
import { Clapperboard } from "lucide-react"

import { Section } from "@/components/shared/page-editor/blocks/_shared/section"
import {
  getComponentStyle,
  optionsField,
  styleFields,
  withLayout,
  type ComponentStyleProps,
  type WithLayout,
} from "@/components/shared/page-editor/blocks/_lib"

export type VideoSize = "s" | "m" | "l"

export type VideoProps = WithLayout<
  ComponentStyleProps & {
    url: string
    size?: VideoSize
  }
>

const VIDEO_SIZE_WIDTH: Record<VideoSize, string> = {
  s: "40%",
  m: "70%",
  l: "100%",
}

const videoSizeOptions = [
  { label: "S", value: "s" },
  { label: "M", value: "m" },
  { label: "L", value: "l" },
] as const

function parseVideoUrl(url: string): string | null {
  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  )
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`

  return null
}

const VideoInner: ComponentConfig<VideoProps> = {
  fields: {
    url: { type: "text", label: "Video URL or embed" },
    size: optionsField<VideoProps["size"]>("Size", videoSizeOptions),
    ...styleFields({
      font: false,
      text: false,
      backgroundDefault: "transparent",
    }),
  },
  defaultProps: {
    url: "",
    size: "m",
  },
  render: ({ url, size, ...style }) => {
    const embedUrl = parseVideoUrl(url)
    const maxWidth = size ? VIDEO_SIZE_WIDTH[size] : undefined
    return (
      <Section>
        <div
          style={{
            ...getComponentStyle(style),
            overflow: "hidden",
            maxWidth,
            margin: maxWidth ? "0 auto" : undefined,
          }}
        >
          {embedUrl ? (
            <iframe
              // oxlint-disable-next-line react/iframe-missing-sandbox
              sandbox="allow-scripts allow-same-origin allow-presentation"
              src={embedUrl}
              title="Embedded video"
              className="aspect-video w-full"
              allowFullScreen
            />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center bg-muted">
              <Clapperboard className="size-8 text-muted-foreground" />
            </div>
          )}
        </div>
      </Section>
    )
  },
}

export const Video = withLayout(VideoInner)
