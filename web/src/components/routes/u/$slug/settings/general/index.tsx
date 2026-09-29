import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { PaletteIcon } from "lucide-react"
import { toast } from "sonner"

import { apiErrorMessage } from "@/api/errors"
import { useCurrentUser, useSession } from "@/hooks/use-session"
import { selectMedia } from "@/lib/media"
import { slugSchema } from "@/lib/slug"
import { toUserUploadItems, useUpdateMe, USER_CATEGORIES } from "@/lib/user"
import type { UserCategory } from "@/lib/user"
import { MediaPicker } from "@/components/shared/media/picker"
import { ResilientImage } from "@/components/shared/media/resilient-image"
import { SettingsSection } from "@/components/shared/settings/settings-section"
import { TelegramLink } from "@/components/routes/u/$slug/settings/telegram-link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Switch } from "@/components/ui/switch"

function Row({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Item variant="muted">
      <ItemContent>
        <ItemTitle>{label}</ItemTitle>
        {description && <ItemDescription>{description}</ItemDescription>}
      </ItemContent>
      <ItemActions>{children}</ItemActions>
    </Item>
  )
}

export function Page() {
  // The General tab reads the session and nothing else: /me carries the slug,
  // the visibility flag, the page content and the media, so there is no
  // second profile read to keep in step with it.
  const user = useCurrentUser()
  // tg_id lives beside the user rather than in it. Same query either way.
  const tg_id = useSession()?.tg_id ?? null
  const updateMe = useUpdateMe()

  const [slug, setSlug] = useState(user.slug)
  const [category, setCategory] = useState<UserCategory>(user.category)
  const [isPublic, setIsPublic] = useState(user.is_page_public)
  const [profileFiles, setProfileFiles] = useState<File[]>([])
  const [bannerFiles, setBannerFiles] = useState<File[]>([])
  const [markedForDeletion, setMarkedForDeletion] = useState<number[]>([])
  const [slugError, setSlugError] = useState<string | null>(null)

  const toggleDeletion = (id: number) => {
    setMarkedForDeletion((previous) =>
      previous.includes(id)
        ? previous.filter((marked) => marked !== id)
        : [...previous, id]
    )
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    const parsed = slugSchema().safeParse(slug)
    if (!parsed.success) {
      setSlugError(parsed.error.issues[0]?.message ?? "That slug is not valid")
      return
    }
    setSlugError(null)

    const loading = toast.loading("Saving profile…")
    updateMe.mutate(
      {
        userId: user.id,
        body: {
          slug: parsed.data,
          category,
          is_page_public: isPublic,
          media_ids_to_delete: markedForDeletion,
        },
        items: toUserUploadItems(profileFiles, bannerFiles),
      },
      {
        onSuccess: (result) => {
          toast.success("Profile saved.", { id: loading })
          setProfileFiles([])
          setBannerFiles([])
          setMarkedForDeletion([])
          if (result.mediaStatus === "failed") {
            toast.warning(
              "Profile saved, but one or more images could not be uploaded. Try adding them again."
            )
          }
        },
        onError: (error) => {
          toast.error(apiErrorMessage(error, "Could not save. Try again."), {
            id: loading,
          })
        },
      }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <SettingsSection title="Account">
        <ItemGroup>
          <Item variant="muted">
            <ItemMedia variant="image">
              <ResilientImage
                // The uploaded profile picture first, the identity provider's
                // claim as the fallback — the claim is what every pre-phase-0
                // account has and nothing will replace it.
                src={selectMedia(user.media, "profile")?.url ?? user.picture}
                alt=""
                aria-hidden
                eager
                containerClassName="size-12 rounded-full"
                fallback={
                  <span
                    aria-hidden
                    className="grid size-full place-items-center bg-muted text-lg font-medium text-muted-foreground"
                  >
                    {user.given_name.charAt(0).toUpperCase()}
                  </span>
                }
              />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{user.name}</ItemTitle>
              <ItemDescription>{user.email}</ItemDescription>
            </ItemContent>
          </Item>

          <Row
            label="Telegram"
            description="Nuspace delivers every notification through the bot."
          >
            <TelegramLink sub={user.sub} isLinked={tg_id !== null} />
          </Row>

          <Item variant="muted">
            <ItemContent>
              <ItemTitle>Profile picture</ItemTitle>
              <MediaPicker
                aspectRatio="square"
                maxFiles={1}
                existing={user.media.filter(
                  (item) => item.media_format === "profile"
                )}
                markedForDeletion={markedForDeletion}
                onToggleDeletion={toggleDeletion}
                files={profileFiles}
                onFilesChange={setProfileFiles}
                disabled={updateMe.isPending}
              />
            </ItemContent>
          </Item>

          <Item variant="muted">
            <ItemContent>
              <ItemTitle>Banner</ItemTitle>
              <MediaPicker
                aspectRatio="video"
                maxFiles={1}
                existing={user.media.filter(
                  (item) => item.media_format === "banner"
                )}
                markedForDeletion={markedForDeletion}
                onToggleDeletion={toggleDeletion}
                files={bannerFiles}
                onFilesChange={setBannerFiles}
                disabled={updateMe.isPending}
              />
            </ItemContent>
          </Item>
        </ItemGroup>
      </SettingsSection>

      <SettingsSection
        title="Page"
        description="Your page lives at /u/your-handle and is yours alone until you make it public."
      >
        <ItemGroup>
          <Item variant="muted">
            <ItemContent>
              <ItemTitle>URL</ItemTitle>
              <Input
                value={slug}
                onChange={(event) => {
                  setSlug(event.target.value)
                }}
                placeholder="ada-lovelace"
                aria-invalid={slugError !== null}
                disabled={updateMe.isPending}
              />
              <ItemDescription>
                Your page is at{" "}
                <span className="font-medium">/u/{slug || "your-handle"}</span>.
                Lowercase letters, digits and single hyphens only.
              </ItemDescription>
              {slugError ? (
                <p className="text-xs text-destructive">{slugError}</p>
              ) : null}
            </ItemContent>
          </Item>

          <Row
            label="Public page"
            description="Off means nobody but you can open /u/your-handle — guests included."
          >
            <Switch
              checked={isPublic}
              onCheckedChange={(checked) => {
                setIsPublic(checked)
              }}
              disabled={updateMe.isPending}
              aria-label="Public page"
            />
          </Row>

          <Row
            label="I am a"
            description="What the directory badges you with. Not a permission — that is separate."
          >
            <Select
              value={category}
              onValueChange={(value) => {
                if (value) setCategory(value as UserCategory)
              }}
              disabled={updateMe.isPending}
            >
              <SelectTrigger className="w-36 capitalize" aria-label="Category">
                <SelectValue>{category}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {USER_CATEGORIES.map((option) => (
                  <SelectItem
                    key={option}
                    value={option}
                    className="capitalize"
                  >
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>

          <Row label="Design page">
            <Button
              nativeButton={false}
              variant="outline"
              render={
                <Link to="/u/$slug/editor" params={{ slug: user.slug }}>
                  <PaletteIcon aria-hidden />
                  Design page
                </Link>
              }
            />
          </Row>
        </ItemGroup>

        <div className="flex justify-end">
          <Button type="submit" disabled={updateMe.isPending}>
            {updateMe.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </SettingsSection>
    </form>
  )
}
