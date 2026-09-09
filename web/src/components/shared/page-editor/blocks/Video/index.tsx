import type { ComponentConfig } from "@puckeditor/core"
import { Clapperboard } from "lucide-react"

import { Section } from "@/components/shared/page-editor/blocks/_shared/section"
import {
  getComponentStyle,
  styleFields,
  withLayout,
  type ComponentStyleProps,
  type WithLayout,
} from "@/components/shared/page-editor/blocks/_lib"

export type VideoProps = WithLayout<
  ComponentStyleProps & {
    url: string
  }
>

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
    ...styleFields({ font: false, text: false, backgroundDefault: "transparent" }),
  },
  defaultProps: {
    url: "",
  },
  render: ({ url, ...style }) => {
    const embedUrl = parseVideoUrl(url)
    return (
      <Section>
        <div style={{ ...getComponentStyle(style), overflow: "hidden" }}>
          {embedUrl ? (
            <iframe
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