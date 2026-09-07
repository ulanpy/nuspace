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

export const VideoEmbed = {
  fields: {
    url: { type: "text" as const },
  },
  defaultProps: {
    url: "",
  },
  render: ({ url }: { url: string }) => {
    const embedUrl = parseVideoUrl(url)
    if (embedUrl) {
      return (
        <iframe
          src={embedUrl}
          title="Embedded video"
          className="aspect-video w-full"
          allowFullScreen
        />
      )
    }
    return (
      <a
        href={url || "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline"
      >
        {url || "Add video URL"}
      </a>
    )
  },
}
