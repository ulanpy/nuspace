import { requestUploadUrls, uploadToSignedUrl } from "@/features/media/api"
import { validateImage } from "@/features/media/types"
import { useUploadContext } from "@/features/page-editor/context"
import { useResolvedFileUrl } from "@/features/page-editor/hooks/use-resolved-file-url"

export function LogoImageField({
  value,
  onChange,
}: {
  value: string
  onChange: (val: string) => void
}) {
  const uploadCtx = useUploadContext()
  const imageUrl = useResolvedFileUrl(value)

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
    onChange(targets[0].filename)
  }

  return (
    <label className="block">
      {value ? (
        <span className="space-y-1">
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Uploaded"
              className="h-10 object-contain"
            />
          )}
          <button
            type="button"
            className="block text-sm text-destructive hover:underline"
            onClick={(event) => {
              event.preventDefault()
              onChange("")
            }}
          >
            Remove
          </button>
        </span>
      ) : (
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground file:hover:bg-primary/90"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void handleChange(file)
          }}
        />
      )}
    </label>
  )
}
