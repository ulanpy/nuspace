import { useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { MarkdownToolbar } from "@/components/markdown-toolbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { UploadItem } from "@/features/media/use-media-upload"
import { MediaPicker } from "@/features/media/components/media-picker"
import { toCommunityUploadItems } from "@/features/communities/api"
import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_TYPES,
  canEditField,
  type Community,
  type CommunityCreate,
  type CommunityUpdate,
} from "@/features/communities/types"
import {
  getInstagramUrlError,
  getTelegramUrlError,
  normalizeHttpUrl,
} from "@/features/communities/url-validation"

const communitySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum(COMMUNITY_TYPES),
  category: z.enum(COMMUNITY_CATEGORIES),
  description: z.string().trim().min(1, "Description is required"),
  established: z.string().min(1, "Establishment date is required"),
  email: z
    .string()
    .trim()
    .refine((value) => value === "" || z.email().safeParse(value).success, {
      message: "Enter a valid email address",
    }),
  /**
   * Both social fields are normalised before they are checked, so someone can
   * type `t.me/nuspace` and have it accepted — see `normalizeHttpUrl`.
   */
  telegramUrl: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" || !getTelegramUrlError(normalizeHttpUrl(value) ?? ""),
      { message: "Enter a Telegram link, like https://t.me/nuspace" }
    ),
  instagramUrl: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" || !getInstagramUrlError(normalizeHttpUrl(value) ?? ""),
      { message: "Enter an Instagram link, like https://instagram.com/nuspace" }
    ),
})

type CommunityFormValues = z.infer<typeof communitySchema>

function toValues(community?: Community): CommunityFormValues {
  return {
    name: community?.name ?? "",
    type: community?.type ?? COMMUNITY_TYPES[0],
    category: community?.category ?? COMMUNITY_CATEGORIES[0],
    description: community?.description ?? "",
    established: community?.established ?? "",
    email: community?.email ?? "",
    telegramUrl: community?.telegram_url ?? "",
    instagramUrl: community?.instagram_url ?? "",
  }
}

function optional(value: string): string | null {
  return value === "" ? null : value
}

/** A social link is stored with a scheme even when it was typed without one. */
function optionalUrl(value: string): string | null {
  return normalizeHttpUrl(value) ?? null
}

export interface CommunitySubmitPayload {
  create: CommunityCreate
  update: CommunityUpdate
  items: UploadItem[]
}

interface CommunityFormProps {
  /** Omitted when creating. */
  community?: Community
  onSubmit: (payload: CommunitySubmitPayload) => void
  onCancel: () => void
  isPending: boolean
  submitError?: string | null
  formId?: string
}

/**
 * Create and edit a community.
 *
 * Two differences from the event form are worth knowing about. There are two
 * image zones — a square profile picture and a 16:9 banner — which are the same
 * `entity_type` and are distinguished only by `media_format`; deletions from
 * both merge into one `media_ids_to_delete`. And `type`/`category` cannot be
 * changed after creation: the server lists them as editable, but
 * `CommunityUpdateRequest` has no field for either, so a PATCH silently drops
 * them. They are shown as plain text in edit mode rather than as a control that
 * appears to work.
 *
 * The old form ran `validateForm()` inside a `useEffect` on every keystroke and
 * wrote the result back into state, which re-rendered and re-validated.
 * react-hook-form does this properly.
 */
export function CommunityForm({
  community,
  onSubmit,
  onCancel,
  isPending,
  submitError,
  formId,
}: CommunityFormProps) {
  const form = useForm<CommunityFormValues>({
    resolver: zodResolver(communitySchema),
    defaultValues: toValues(community),
  })

  const { errors } = form.formState
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null)
  const description = form.watch("description")

  const [profileFiles, setProfileFiles] = useState<File[]>([])
  const [bannerFiles, setBannerFiles] = useState<File[]>([])
  const [removedMedia, setRemovedMedia] = useState<number[]>([])

  const existingProfile =
    community?.media.filter((item) => item.media_format === "profile") ?? []
  const existingBanner =
    community?.media.filter((item) => item.media_format === "banner") ?? []

  const toggleRemoval = (id: number) => {
    setRemovedMedia((previous) =>
      previous.includes(id)
        ? previous.filter((entry) => entry !== id)
        : [...previous, id]
    )
  }

  const editable = (field: string) =>
    !community || canEditField(community, field)

  const ifEditable = <K extends keyof CommunityUpdate>(
    field: K,
    value: CommunityUpdate[K]
  ): Partial<CommunityUpdate> => (editable(field) ? { [field]: value } : {})

  const descriptionField = form.register("description")

  return (
    <form
      id={formId}
      onSubmit={(submitEvent) => {
        void form.handleSubmit((values) => {
          const email = optional(values.email)
          const telegram = optionalUrl(values.telegramUrl)
          const instagram = optionalUrl(values.instagramUrl)

          onSubmit({
            create: {
              name: values.name,
              type: values.type,
              category: values.category,
              description: values.description,
              established: values.established,
              email,
              telegram_url: telegram,
              instagram_url: instagram,
              // Resolved to the caller server-side, as on events.
              head: "me",
            },
            update: {
              ...ifEditable("name", values.name),
              ...ifEditable("description", values.description),
              ...ifEditable("established", values.established),
              ...ifEditable("email", email),
              ...ifEditable("telegram_url", telegram),
              ...ifEditable("instagram_url", instagram),
              media_ids_to_delete:
                removedMedia.length > 0 ? removedMedia : null,
            },
            items: toCommunityUploadItems(profileFiles, bannerFiles),
          })
        })(submitEvent)
      }}
      className="space-y-5"
    >
      <div className="space-y-1">
        <Label htmlFor="community-name">Name</Label>
        <Input
          id="community-name"
          placeholder="NU Fencing Club"
          disabled={isPending || !editable("name")}
          {...form.register("name")}
        />
        <FieldError message={errors.name?.message} />
      </div>

      {community ? (
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium">Type</dt>
            <dd className="text-sm text-muted-foreground capitalize">
              {community.type}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium">Category</dt>
            <dd className="text-sm text-muted-foreground capitalize">
              {community.category}
            </dd>
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Type and category are fixed once a community exists. Ask an admin if
            one of them is wrong.
          </p>
        </dl>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="community-type">Type</Label>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    if (value) field.onChange(value)
                  }}
                  disabled={isPending}
                >
                  <SelectTrigger
                    id="community-type"
                    className="w-full capitalize"
                  >
                    <SelectValue>{field.value}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {COMMUNITY_TYPES.map((type) => (
                      <SelectItem
                        key={type}
                        value={type}
                        className="capitalize"
                      >
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="community-category">Category</Label>
            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    if (value) field.onChange(value)
                  }}
                  disabled={isPending}
                >
                  <SelectTrigger
                    id="community-category"
                    className="w-full capitalize"
                  >
                    <SelectValue>{field.value}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {COMMUNITY_CATEGORIES.map((category) => (
                      <SelectItem
                        key={category}
                        value={category}
                        className="capitalize"
                      >
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="community-description">Description</Label>

        <MarkdownToolbar
          textareaRef={descriptionRef}
          value={description}
          disabled={isPending || !editable("description")}
          onChange={(next) => {
            form.setValue("description", next, { shouldValidate: true })
          }}
        />

        <Textarea
          id="community-description"
          placeholder="What the community does, when it meets, and how to join."
          className="min-h-30"
          disabled={isPending || !editable("description")}
          {...descriptionField}
          ref={(element) => {
            descriptionField.ref(element)
            descriptionRef.current = element
          }}
        />
        <FieldError message={errors.description?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="community-established">Established</Label>
          <Input
            id="community-established"
            type="date"
            disabled={isPending || !editable("established")}
            {...form.register("established")}
          />
          <FieldError message={errors.established?.message} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="community-email">Email</Label>
          <Input
            id="community-email"
            type="email"
            placeholder="club@nu.edu.kz"
            disabled={isPending || !editable("email")}
            {...form.register("email")}
          />
          <FieldError message={errors.email?.message} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="community-telegram">Telegram</Label>
          <Input
            id="community-telegram"
            inputMode="url"
            placeholder="t.me/nuspace"
            disabled={isPending || !editable("telegram_url")}
            {...form.register("telegramUrl")}
          />
          <FieldError message={errors.telegramUrl?.message} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="community-instagram">Instagram</Label>
          <Input
            id="community-instagram"
            inputMode="url"
            placeholder="instagram.com/nuspace"
            disabled={isPending || !editable("instagram_url")}
            {...form.register("instagramUrl")}
          />
          <FieldError message={errors.instagramUrl?.message} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MediaPicker
          label="Profile picture"
          aspectRatio="square"
          maxFiles={1}
          files={profileFiles}
          onFilesChange={setProfileFiles}
          existing={existingProfile}
          markedForDeletion={removedMedia}
          onToggleDeletion={toggleRemoval}
          disabled={isPending}
          hint="Shown on the community card and beside the name."
        />

        <MediaPicker
          label="Banner"
          aspectRatio="video"
          maxFiles={1}
          files={bannerFiles}
          onFilesChange={setBannerFiles}
          existing={existingBanner}
          markedForDeletion={removedMedia}
          onToggleDeletion={toggleRemoval}
          disabled={isPending}
          hint="Runs across the top of the community page."
        />
      </div>

      {submitError && (
        <p className="text-sm text-destructive" role="alert">
          {submitError}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {community ? "Save" : "Create community"}
        </Button>
      </div>
    </form>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive">{message}</p>
}
