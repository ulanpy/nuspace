import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import { VisibilityPicker } from "@/components/shared/pages/visibility-picker"
import type { UploadItem } from "@/hooks/use-media-upload"
import { MediaPicker } from "@/components/shared/media/picker"
import { slugSchema } from "@/lib/slug"
import { toPageUploadItems } from "@/lib/pages"
import {
  canEditField,
  type Page,
  type PageCreate,
  type PageUpdate,
} from "@/lib/pages"
import { slugFromName } from "@/lib/user"

const pageSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim(),
  slug: slugSchema(),
  visibility: z.enum(["public", "internal", "private"]),
})

type PageFormValues = z.infer<typeof pageSchema>

function optional(value: string): string | null {
  return value === "" ? null : value
}

export interface PageSubmitPayload {
  create: PageCreate
  update: PageUpdate
  items: UploadItem[]
}

interface PageFormProps {
  /** Omitted when creating. */
  page?: Page
  onSubmit: (payload: PageSubmitPayload) => void
  onCancel: () => void
  isPending: boolean
  submitError?: string | null
  formId?: string
}

/**
 * Create and edit a page.
 *
 * Two image zones — a square logo and a 16:9 banner — which are the same
 * `entity_type` and are told apart only by `media_format`; deletions from both
 * merge into one `media_ids_to_delete`. That is the whole reason this form
 * exists separately from the event form's.
 *
 * `type`, `category` and `email` are gone with their backend columns, so
 * `description` and the logo are the only optional fields left.
 */
export function PageForm({
  page,
  onSubmit,
  onCancel,
  isPending,
  submitError,
  formId,
}: PageFormProps) {
  const form = useForm<PageFormValues>({
    resolver: zodResolver(pageSchema),
    defaultValues: {
      name: page?.name ?? "",
      description: page?.description ?? "",
      slug: page?.slug ?? "",
      // Creating asks. Editing defaults to what the page already is, so the
      // form never silently changes a page's audience by being opened.
      visibility: page?.visibility ?? "public",
    },
  })

  const { errors } = form.formState
  const visibility = useWatch({ control: form.control, name: "visibility" })

  /**
   * Fill the slug from the name until the reader types in that field.
   *
   * The flag is the whole trick: without it, a slug the reader already chose
   * would be overwritten by the next keystroke in the name field, which is what
   * makes autofilled URLs feel broken. Editing an existing page never
   * autofills — its slug is the address people have already shared.
   */
  const [slugTouched, setSlugTouched] = useState(false)

  function autofillSlug(name: string) {
    if (page || slugTouched) return
    const next = slugFromName(name)
    // Nothing usable yet: a one-character name slugs to a bare `-page`, and
    // writing that in makes the error appear before typing has finished.
    if (next !== "-page") {
      form.setValue("slug", next)
    }
  }

  const [profileFiles, setProfileFiles] = useState<File[]>([])
  const [bannerFiles, setBannerFiles] = useState<File[]>([])
  const [removedMedia, setRemovedMedia] = useState<number[]>([])

  const existingLogo =
    page?.media.filter((item) => item.media_format === "profile") ?? []
  const existingBanner =
    page?.media.filter((item) => item.media_format === "banner") ?? []

  const toggleRemoval = (id: number) => {
    setRemovedMedia((previous) =>
      previous.includes(id)
        ? previous.filter((entry) => entry !== id)
        : [...previous, id]
    )
  }

  const editable = (field: string) => !page || canEditField(page, field)

  const ifEditable = <K extends keyof PageUpdate>(
    field: K,
    value: PageUpdate[K]
  ): Partial<PageUpdate> => (editable(field) ? { [field]: value } : {})

  return (
    <form
      id={formId}
      onSubmit={(submitEvent) => {
        void form.handleSubmit((values) => {
          const description = optional(values.description)

          onSubmit({
            create: {
              name: values.name,
              description,
              slug: values.slug,
              visibility: values.visibility,
              // `owner: "me"` resolves to the caller server-side, as on
              // events. The generated type marks it required, so the client
              // sends it rather than omitting it.
              owner: "me",
            },
            update: {
              ...ifEditable("name", values.name),
              ...ifEditable("description", description),
              ...ifEditable("slug", values.slug),
              ...ifEditable("visibility", values.visibility),
              media_ids_to_delete:
                removedMedia.length > 0 ? removedMedia : null,
            },
            items: toPageUploadItems(profileFiles, bannerFiles),
          })
        })(submitEvent)
      }}
      className="space-y-4"
    >
      <ItemGroup>
        <FieldRow label="Name" error={errors.name?.message}>
          <Input
            id="page-name"
            placeholder="NU Fencing Club"
            disabled={isPending || !editable("name")}
            {...form.register("name", {
              onChange: (event) => {
                autofillSlug(event.target.value)
              },
            })}
          />
        </FieldRow>

        <FieldRow
          label="Description"
          description="One line about what this page is for."
          error={errors.description?.message}
        >
          <Textarea
            id="page-description"
            placeholder="Competitive fencing for students of all levels."
            rows={2}
            disabled={isPending || !editable("description")}
            {...form.register("description")}
          />
        </FieldRow>

        <FieldRow
          label="URL"
          description={
            <>
              Web address for your page, e.g.{" "}
              <span className="font-medium">/p/nu-fencing-club</span>. Lowercase
              letters, digits and single hyphens only.
            </>
          }
          error={errors.slug?.message}
        >
          <Input
            id="page-slug"
            placeholder="nu-fencing-club"
            disabled={isPending || !editable("slug")}
            {...form.register("slug", {
              onChange: () => {
                setSlugTouched(true)
              },
            })}
          />
        </FieldRow>

        <FieldRow label="Logo">
          <MediaPicker
            aspectRatio="square"
            maxFiles={1}
            files={profileFiles}
            onFilesChange={setProfileFiles}
            existing={existingLogo}
            markedForDeletion={removedMedia}
            onToggleDeletion={toggleRemoval}
            disabled={isPending}
          />
        </FieldRow>

        <FieldRow label="Banner">
          <MediaPicker
            aspectRatio="video"
            maxFiles={1}
            files={bannerFiles}
            onFilesChange={setBannerFiles}
            existing={existingBanner}
            markedForDeletion={removedMedia}
            onToggleDeletion={toggleRemoval}
            disabled={isPending}
          />
        </FieldRow>

        {/* Creating asks who may read the page, rather than making everyone
            create a public page and then hunt for the setting.

            Only on create. The page's own settings screen has a Visibility
            section that saves the moment a radio is touched, and a second
            copy of these three radios there — behind a Save button, beside one
            that already works — is one more place for a page's audience to
            disagree with itself. */}
        {!page ? (
          <Item variant="muted">
            <ItemContent>
              <ItemTitle>Visibility</ItemTitle>
              <ItemDescription>
                Who can read this page. A page nobody may read is a 404 for
                them, not a 403.
              </ItemDescription>
              <div className="mt-2">
                <VisibilityPicker
                  value={visibility}
                  onValueChange={(next) => {
                    form.setValue("visibility", next, { shouldDirty: true })
                  }}
                  disabled={isPending}
                  idPrefix="page-form-visibility"
                />
              </div>
            </ItemContent>
          </Item>
        ) : null}
      </ItemGroup>

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
          {page ? "Save" : "Create page"}
        </Button>
      </div>
    </form>
  )
}

/**
 * A field that spans the row: the title, then the control underneath, per
 * decision #5. The `Label` is `sr-only` because the `ItemTitle` beside the
 * control already names it, and a screen reader hearing both would hear the
 * field twice.
 */
function FieldRow({
  label,
  description,
  error,
  children,
}: {
  label: string
  description?: React.ReactNode
  error?: string
  children: React.ReactNode
}) {
  return (
    <Item variant="muted">
      <ItemContent>
        <ItemTitle>{label}</ItemTitle>
        {description ? <ItemDescription>{description}</ItemDescription> : null}
        {children}
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </ItemContent>
    </Item>
  )
}
