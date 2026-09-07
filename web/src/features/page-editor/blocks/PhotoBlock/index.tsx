import { createUsePuck } from "@puckeditor/core"
import { ImageIcon } from "lucide-react"

import { ImageField } from "@/features/page-editor/blocks/_shared"
import { useResolvedFileUrl } from "@/features/page-editor/hooks/use-resolved-file-url"

const MAX_PAGE_IMAGES = 20

const usePuck = createUsePuck()

function countPhotoBlocks(items: any[]): number {
  let count = 0
  for (const item of items) {
    if (item.type === "PhotoBlock") count++
    for (const key of Object.keys(item.props || {})) {
      const val = item.props[key]
      if (Array.isArray(val)) count += countPhotoBlocks(val)
    }
  }
  return count
}

function LimitedImageField<T extends string | undefined>(props: {
  field?: { label?: string }
  value: T
  onChange: (val: T) => void
  name: string
}) {
  const { value } = props
  const puckData = usePuck((s) => s.appState.data)
  const photoCount = countPhotoBlocks(puckData.content ?? [])
  const atLimit = photoCount >= MAX_PAGE_IMAGES && !value

  if (atLimit) {
    return (
      <p className="text-sm text-destructive">
        Maximum of {MAX_PAGE_IMAGES} images reached.
      </p>
    )
  }
  return <ImageField {...props} />
}

export const PhotoBlock = {
  fields: {
    image: {
      type: "custom" as const,
      label: "Image",
      render: LimitedImageField,
    },
    alt: { type: "text" as const },
  },
  defaultProps: {
    image: "",
    alt: "",
  },
  render: ({ image, alt }: { image: string; alt: string }) => {
    const imageUrl = useResolvedFileUrl(image)
    if (imageUrl) {
      return <img src={imageUrl} alt={alt} className="w-full" />
    }
    return (
      <div className="flex aspect-video w-full items-center justify-center bg-muted">
        <ImageIcon className="size-8 text-muted-foreground" />
      </div>
    )
  },
}
