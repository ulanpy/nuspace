import { useEffect, useId, useMemo, useRef, useState } from "react"
import { ImagePlusIcon, RotateCcwIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  ACCEPTED_IMAGE_TYPES,
  validateImage,
  type Media,
} from "@/features/media/types"

/** Which shape the eventual crop expects, so the preview does not lie. */
type AspectRatio = "square" | "portrait" | "video"

const ASPECT_CLASS: Record<AspectRatio, string> = {
  square: "aspect-square",
  portrait: "aspect-3/4",
  video: "aspect-video",
}

const ASPECT_LABEL: Record<AspectRatio, string> = {
  square: "1:1",
  portrait: "3:4 portrait",
  video: "16:9",
}

export interface MediaPickerProps {
  label: string
  /** Images the entity already has, in this zone's format. */
  existing?: readonly Media[]
  /** Ids of `existing` the user has marked for removal. */
  markedForDeletion?: readonly number[]
  /** Toggles one existing image in and out of the deletion set. */
  onToggleDeletion?: (id: number) => void
  /** Files picked in this session, not yet uploaded. */
  files: readonly File[]
  onFilesChange: (files: File[]) => void
  /** Counts existing-and-kept images as well as newly picked ones. */
  maxFiles: number
  aspectRatio: AspectRatio
  disabled?: boolean
  /** Extra guidance under the zone — what the image is used for. */
  hint?: string
}

/**
 * Picking images for an entity form.
 *
 * Only the picking. The transfer lives in `use-media-upload.ts`, and which
 * `entity_type`/`media_format` the files belong to is the form's business —
 * the old app's 484-line zone welded all three together and then threaded the
 * result through two React contexts, which is why adding a second zone to the
 * community form meant a second provider.
 *
 * Deletions are *staged*, not performed. Both events and communities take
 * `media_ids_to_delete` in the PATCH body, so removing an image and editing a
 * field are one request — and a form the user abandons leaves the images alone.
 */
export function MediaPicker({
  label,
  existing = [],
  markedForDeletion = [],
  onToggleDeletion,
  files,
  onFilesChange,
  maxFiles,
  aspectRatio,
  disabled = false,
  hint,
}: MediaPickerProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [rejected, setRejected] = useState<string[]>([])

  const deletionSet = new Set(markedForDeletion)
  const keptCount = existing.filter((item) => !deletionSet.has(item.id)).length
  const remaining = maxFiles - keptCount - files.length

  const previews = useObjectUrls(files)

  const addFiles = (picked: File[]) => {
    const accepted: File[] = []
    const problems: string[] = []

    for (const file of picked) {
      const problem = validateImage(file)
      if (problem) {
        problems.push(problem)
        continue
      }
      if (accepted.length >= remaining) {
        problems.push(`${file.name}: over the ${String(maxFiles)}-image limit`)
        continue
      }
      accepted.push(file)
    }

    setRejected(problems)
    if (accepted.length > 0) onFilesChange([...files, ...accepted])
  }

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, position) => position !== index))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={inputId}>{label}</Label>
        <span className="text-xs text-muted-foreground">
          {String(keptCount + files.length)} of {String(maxFiles)} ·{" "}
          {ASPECT_LABEL[aspectRatio]}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {existing.map((item) => {
          const marked = deletionSet.has(item.id)
          return (
            <Thumbnail
              key={item.id}
              src={item.url}
              alt=""
              aspectRatio={aspectRatio}
              dimmed={marked}
              disabled={disabled || !onToggleDeletion}
              /** Marking is reversible until the form is submitted. */
              actionLabel={marked ? "Keep this image" : "Remove this image"}
              actionIcon={marked ? RotateCcwIcon : XIcon}
              onAction={() => onToggleDeletion?.(item.id)}
              caption={marked ? "Will be removed" : undefined}
            />
          )
        })}

        {files.map((file, index) => (
          <Thumbnail
            // Name and size alone collide across re-picks of the same file;
            // the index keeps each preview pinned to its slot.
            key={`${file.name}-${String(index)}`}
            src={previews[index]}
            alt=""
            aspectRatio={aspectRatio}
            disabled={disabled}
            actionLabel={`Remove ${file.name}`}
            actionIcon={XIcon}
            onAction={() => {
              removeFile(index)
            }}
            caption="New"
          />
        ))}

        {remaining > 0 && !disabled && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-input text-muted-foreground transition-colors hover:border-ring hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              ASPECT_CLASS[aspectRatio]
            )}
          >
            <ImagePlusIcon aria-hidden />
            <span className="text-xs">Add</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="sr-only"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        multiple={maxFiles > 1}
        disabled={disabled}
        onChange={(event) => {
          addFiles([...(event.target.files ?? [])])
          // Without this, re-picking the file just removed fires no change
          // event, because the input's value has not changed.
          event.target.value = ""
        }}
      />

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

      {rejected.length > 0 && (
        <ul className="space-y-0.5 text-xs text-destructive">
          {rejected.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Thumbnail({
  src,
  alt,
  aspectRatio,
  dimmed = false,
  disabled,
  actionLabel,
  actionIcon: ActionIcon,
  onAction,
  caption,
}: {
  src: string | undefined
  alt: string
  aspectRatio: AspectRatio
  dimmed?: boolean
  disabled: boolean
  actionLabel: string
  actionIcon: typeof XIcon
  onAction: () => void
  caption?: string
}) {
  return (
    <div
      className={cn(
        "relative w-24 overflow-hidden rounded-lg border border-border bg-muted",
        ASPECT_CLASS[aspectRatio]
      )}
    >
      {src && (
        <img
          src={src}
          alt={alt}
          className={cn(
            "size-full object-cover transition-opacity",
            dimmed && "opacity-30"
          )}
        />
      )}

      {!disabled && (
        <Button
          type="button"
          variant="secondary"
          size="icon-xs"
          aria-label={actionLabel}
          title={actionLabel}
          onClick={onAction}
          className="absolute top-1 right-1"
        >
          <ActionIcon aria-hidden />
        </Button>
      )}

      {caption && (
        <span className="absolute inset-x-0 bottom-0 bg-background/80 px-1 py-0.5 text-center text-[0.65rem] text-muted-foreground">
          {caption}
        </span>
      )}
    </div>
  )
}

/**
 * Blob URLs for local previews, revoked when the file leaves the list.
 *
 * Each `createObjectURL` pins its File in memory until revoked. A student
 * picking and re-picking a 10 MB photo half a dozen times while writing an
 * event description would otherwise hold every one of them.
 */
function useObjectUrls(files: readonly File[]): string[] {
  const urls = useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files]
  )

  useEffect(() => {
    return () => {
      for (const url of urls) URL.revokeObjectURL(url)
    }
  }, [urls])

  return urls
}
