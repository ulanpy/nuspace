import { createUsePuck, FieldLabel } from "@puckeditor/core"
import { requestUploadUrls, uploadToSignedUrl } from "@/lib/media"
import { validateImage, ACCEPTED_IMAGE_TYPES } from "@/lib/media"
import { useResolvedFileUrl } from "@/components/shared/page-editor/hooks/use-resolved-file-url"
import { useUploadContext } from "@/components/shared/page-editor/context"

export function ImageField({
  field,
  value,
  onChange,
}: {
  field?: { label?: string }
  value: string | undefined
  onChange: (val: string) => void
  name: string
}) {
  const uploadCtx = useUploadContext()
  const imageUrl = useResolvedFileUrl(value ?? "")

  const handleChange = async (file: File) => {
    const error = validateImage(file)
    if (error) {
      alert(error)
      return
    }
    if (!uploadCtx) {
      alert("Upload context not available")
      return
    }

    const targets = await requestUploadUrls([
      {
        entity_type: uploadCtx.entityType,
        entity_id: uploadCtx.entityId,
        media_format: "carousel",
        media_order: 0,
        mime_type: file.type,
      },
    ])

    await uploadToSignedUrl(targets[0], file)
    onChange(targets[0].filename)
  }

  const accept = ACCEPTED_IMAGE_TYPES.join(",")

  return (
    <FieldLabel label={field?.label ?? "Image"}>
      <label className="block">
        {value ? (
          <span className="space-y-2">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Uploaded"
                className="w-full rounded-md object-cover"
              />
            ) : (
              <span className="flex aspect-video w-full items-center justify-center rounded-md bg-muted">
                <span className="text-sm text-muted-foreground">Loading…</span>
              </span>
            )}
            <span>
              <button
                type="button"
                className="text-sm text-destructive hover:underline"
                onClick={(event) => {
                  event.preventDefault()
                  onChange("")
                }}
              >
                Remove
              </button>
            </span>
          </span>
        ) : (
          <input
            type="file"
            accept={accept}
            className="w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground file:hover:bg-primary/90"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleChange(file)
            }}
          />
        )}
      </label>
    </FieldLabel>
  )
}

const MAX_PAGE_IMAGES = 20

const usePuck = createUsePuck()

function countPhotoBlocks(items: any[]): number {
  let count = 0
  for (const item of items) {
    if (item.type === "Image") count++
    for (const key of Object.keys(item.props || {})) {
      const val = item.props[key]
      if (Array.isArray(val)) count += countPhotoBlocks(val)
    }
  }
  return count
}

/** Image upload that rejects pages already at the per-page image limit. */
export function LimitedImageField({
  value,
  ...rest
}: {
  field?: { label?: string }
  value: string | undefined
  onChange: (val: string) => void
  name: string
}) {
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
  return <ImageField value={value} {...rest} />
}
