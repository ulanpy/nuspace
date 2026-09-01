import { useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { toCampusInputValue, toCampusNaiveDateTime } from "@/lib/datetime"
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
import { MediaPicker } from "@/features/media/components/media-picker"
import { selectMedia } from "@/features/media/select"
import {
  EVENT_TAGS,
  EVENT_TYPES,
  REGISTRATION_POLICIES,
  canEditField,
  type Event,
  type EventCreate,
  type EventUpdate,
} from "@/features/events/types"

const MAX_NAME = 75
const MAX_PLACE = 100

const eventSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(MAX_NAME),
    place: z.string().trim().min(1, "Place is required").max(MAX_PLACE),
    description: z.string().trim().min(1, "Description is required"),
    startDate: z.string().min(1, "Start date is required"),
    startTime: z.string().min(1, "Start time is required"),
    endDate: z.string().min(1, "End date is required"),
    endTime: z.string().min(1, "End time is required"),
    type: z.enum(EVENT_TYPES),
    policy: z.enum(REGISTRATION_POLICIES),
    registrationLink: z.string().trim(),
    /** Edit mode only, and only for an admin — see EVENT_TAGS and the policy. */
    tag: z.enum(EVENT_TAGS),
  })
  .refine(
    (values) =>
      values.policy !== "registration" || values.registrationLink !== "",
    {
      // An event that says "registration" with nowhere to register is the one
      // failure students actually hit — the page renders no button at all.
      message: "A registration link is required when registration is needed",
      path: ["registrationLink"],
    }
  )
  .refine(
    (values) =>
      new Date(`${values.endDate}T${values.endTime}`).getTime() >
      new Date(`${values.startDate}T${values.startTime}`).getTime(),
    {
      // The backend refuses this too, with a 422 whose message names
      // `end_datetime` rather than a field on screen.
      message: "The event must end after it starts",
      path: ["endTime"],
    }
  )

type EventFormValues = z.infer<typeof eventSchema>

function toValues(event?: Event): EventFormValues {
  const start = event
    ? toCampusInputValue(event.start_datetime)
    : { date: "", time: "" }
  const end = event
    ? toCampusInputValue(event.end_datetime)
    : { date: "", time: "" }

  return {
    name: event?.name ?? "",
    place: event?.place ?? "",
    description: event?.description ?? "",
    startDate: start.date,
    startTime: start.time,
    endDate: end.date,
    endTime: end.time,
    type: event?.type ?? EVENT_TYPES[0],
    policy: event?.policy ?? "open",
    registrationLink: event?.registration_link ?? "",
    tag: event?.tag ?? "regular",
  }
}

export interface EventSubmitPayload {
  create: EventCreate
  update: EventUpdate
  files: File[]
}

interface EventFormProps {
  /** Omitted when creating. */
  event?: Event
  onSubmit: (payload: EventSubmitPayload) => void
  onCancel: () => void
  isPending: boolean
  submitError?: string | null
}

/**
 * Create and edit an event.
 *
 * In edit mode the server decides which fields are editable, per user and per
 * event, and sends the list on the event itself. A disabled field here is one
 * the PATCH would refuse with a 403 naming the field — the old app instead let
 * anyone type into `tag` and surfaced the refusal only on save.
 */
export function EventForm({
  event,
  onSubmit,
  onCancel,
  isPending,
  submitError,
}: EventFormProps) {
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: toValues(event),
  })

  const { errors } = form.formState
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null)
  const description = form.watch("description")
  const policy = form.watch("policy")

  const [files, setFiles] = useState<File[]>([])
  const [removedMedia, setRemovedMedia] = useState<number[]>([])

  const poster = event ? selectMedia(event.media, "carousel") : undefined
  const existingMedia = poster ? [poster] : []

  // Everything is editable while creating; afterwards the server's list rules.
  const editable = (field: string) => !event || canEditField(event, field)

  /** `{field: value}` when the server allows it, `{}` when it does not. */
  const ifEditable = <K extends keyof EventUpdate>(
    field: K,
    value: EventUpdate[K]
  ): Partial<EventUpdate> => (editable(field) ? { [field]: value } : {})

  const descriptionField = form.register("description")

  return (
    <form
      onSubmit={(event_) => {
        void form.handleSubmit((values) => {
          const start = toCampusNaiveDateTime(
            values.startDate,
            values.startTime
          )
          const end = toCampusNaiveDateTime(values.endDate, values.endTime)
          const registrationLink =
            values.registrationLink === "" ? null : values.registrationLink

          onSubmit({
            create: {
              // The backend resolves "me" to the caller; sending a sub here
              // would be a request to create an event for someone else, which
              // the policy refuses for non-admins.
              creator_sub: "me",
              name: values.name,
              place: values.place,
              description: values.description,
              start_datetime: start,
              end_datetime: end,
              type: values.type,
              policy: values.policy,
              registration_link: registrationLink,
            },
            // Only the fields this user may change are sent at all. Undefined
            // properties are dropped from the JSON body, so a field the server
            // would refuse never reaches it — a non-null `tag` from a
            // non-admin is a 403 on the whole update, not just on that field.
            update: {
              ...ifEditable("name", values.name),
              ...ifEditable("place", values.place),
              ...ifEditable("description", values.description),
              ...ifEditable("start_datetime", start),
              ...ifEditable("end_datetime", end),
              ...ifEditable("type", values.type),
              ...ifEditable("policy", values.policy),
              ...ifEditable("registration_link", registrationLink),
              ...ifEditable("tag", values.tag),
              media_ids_to_delete:
                removedMedia.length > 0 ? removedMedia : null,
            },
            files,
          })
        })(event_)
      }}
      className="space-y-5"
    >
      <div className="space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="event-name">Name</Label>
          <CharacterCount value={form.watch("name")} max={MAX_NAME} />
        </div>
        <Input
          id="event-name"
          maxLength={MAX_NAME}
          disabled={isPending || !editable("name")}
          {...form.register("name")}
        />
        <FieldError message={errors.name?.message} />
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="event-place">Place</Label>
          <CharacterCount value={form.watch("place")} max={MAX_PLACE} />
        </div>
        <Input
          id="event-place"
          placeholder="Block 7, room 7.202"
          maxLength={MAX_PLACE}
          disabled={isPending || !editable("place")}
          {...form.register("place")}
        />
        <FieldError message={errors.place?.message} />
      </div>

      <fieldset
        className="space-y-2"
        disabled={isPending || !editable("start_datetime")}
      >
        <legend className="text-sm font-medium">Starts</legend>
        <div className="flex flex-wrap gap-2">
          <Input
            type="date"
            aria-label="Start date"
            className="w-auto"
            {...form.register("startDate")}
          />
          <Input
            type="time"
            aria-label="Start time"
            className="w-auto"
            {...form.register("startTime")}
          />
        </div>
        <FieldError
          message={errors.startDate?.message ?? errors.startTime?.message}
        />
      </fieldset>

      <fieldset
        className="space-y-2"
        disabled={isPending || !editable("end_datetime")}
      >
        <legend className="text-sm font-medium">Ends</legend>
        <div className="flex flex-wrap gap-2">
          <Input
            type="date"
            aria-label="End date"
            className="w-auto"
            {...form.register("endDate")}
          />
          <Input
            type="time"
            aria-label="End time"
            className="w-auto"
            {...form.register("endTime")}
          />
        </div>
        <FieldError
          message={errors.endDate?.message ?? errors.endTime?.message}
        />
      </fieldset>

      <p className="text-xs text-muted-foreground">
        Times are campus time (Almaty), whatever timezone your device is in.
      </p>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="event-description">Description</Label>
        </div>

        <MarkdownToolbar
          textareaRef={descriptionRef}
          value={description}
          disabled={isPending || !editable("description")}
          onChange={(next) => {
            form.setValue("description", next, { shouldValidate: true })
          }}
        />

        <Textarea
          id="event-description"
          placeholder="What is happening, who it is for, and anything people should bring."
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
          <Label htmlFor="event-type">Type</Label>
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => {
                  if (value) field.onChange(value)
                }}
                disabled={isPending || !editable("type")}
              >
                <SelectTrigger id="event-type" className="w-full capitalize">
                  <SelectValue>{field.value}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type} className="capitalize">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="event-policy">Registration</Label>
          <Controller
            control={form.control}
            name="policy"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => {
                  if (value) field.onChange(value)
                }}
                disabled={isPending || !editable("policy")}
              >
                <SelectTrigger id="event-policy" className="w-full">
                  <SelectValue>
                    {field.value === "open" ? "Just turn up" : "Sign-up needed"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Just turn up</SelectItem>
                  <SelectItem value="registration">Sign-up needed</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {policy === "registration" && (
        <div className="space-y-1">
          <Label htmlFor="event-registration-link">Registration link</Label>
          <Input
            id="event-registration-link"
            inputMode="url"
            placeholder="https://forms.gle/…"
            disabled={isPending || !editable("registration_link")}
            {...form.register("registrationLink")}
          />
          <FieldError message={errors.registrationLink?.message} />
        </div>
      )}

      {/* Tag exists on every event but is admin-only, and there is nothing
          sensible for a creator to set it to at creation time. */}
      {event && canEditField(event, "tag") && (
        <div className="space-y-1">
          <Label htmlFor="event-tag">Tag</Label>
          <Controller
            control={form.control}
            name="tag"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => {
                  if (value) field.onChange(value)
                }}
                disabled={isPending}
              >
                <SelectTrigger id="event-tag" className="w-full capitalize">
                  <SelectValue>{field.value}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TAGS.map((tag) => (
                    <SelectItem key={tag} value={tag} className="capitalize">
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-xs text-muted-foreground">
            Admin only. “Featured” promotes the event on the landing page.
          </p>
        </div>
      )}

      <MediaPicker
        label="Poster"
        aspectRatio="portrait"
        maxFiles={1}
        files={files}
        onFilesChange={setFiles}
        existing={existingMedia}
        markedForDeletion={removedMedia}
        onToggleDeletion={(id) => {
          setRemovedMedia((previous) =>
            previous.includes(id)
              ? previous.filter((entry) => entry !== id)
              : [...previous, id]
          )
        }}
        disabled={isPending}
        hint="Shown on the event card and at the top of the event page."
      />

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
          {event ? "Save" : "Create event"}
        </Button>
      </div>
    </form>
  )
}

function CharacterCount({ value, max }: { value: string; max: number }) {
  return (
    <span className="text-xs text-muted-foreground">
      {String(value.length)} / {String(max)}
    </span>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive">{message}</p>
}
