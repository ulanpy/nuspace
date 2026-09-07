import { FieldLabel } from "@puckeditor/core"
import { requestUploadUrls, uploadToSignedUrl } from "@/features/media/api"
import { validateImage, ACCEPTED_IMAGE_TYPES } from "@/features/media/types"
import { useResolvedFileUrl } from "@/features/page-editor/hooks/use-resolved-file-url"
import { useUploadContext } from "@/features/page-editor/context"

export function ImageField<T extends string | undefined>({
  field,
  value,
  onChange,
}: {
  field?: { label?: string }
  value: T
  onChange: (val: T) => void
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
        entity_type: uploadCtx.entityType as any,
        entity_id: uploadCtx.entityId,
        media_format: "carousel",
        media_order: 0,
        mime_type: file.type,
      },
    ])

    await uploadToSignedUrl(targets[0], file)
    onChange(targets[0].filename as T)
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
                  onChange("" as T)
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
