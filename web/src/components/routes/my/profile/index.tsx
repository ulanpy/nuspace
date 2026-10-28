import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { CheckIcon, EyeIcon, PencilIcon } from "lucide-react"
import { toast } from "sonner"

import { apiErrorMessage } from "@/api/errors"
import type { PageVisibilityValue } from "@/lib/pages/types"
import {
  PROFILE_VISIBILITY_COPY,
  handleSchema,
  myProfileQueryOptions,
  profileAddress,
  useUpdateProfileSettings,
} from "@/lib/profiles"
import { Page } from "@/components/shared/page"
import { VisibilityPicker } from "@/components/shared/pages/visibility-picker"
import { visibilityCopy } from "@/components/shared/pages/visibilities"
import { SettingsSection } from "@/components/shared/settings/settings-section"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item"

/**
 * The handle: an input and Save. The address under it follows what is typed,
 * so the person sees the link they are about to hand out before they save it.
 */
function HandleSetting({ saved }: { saved: string | null }) {
  const update = useUpdateProfileSettings()
  const [draft, setDraft] = useState(saved ?? "")
  const [error, setError] = useState<string | null>(null)

  const handle = draft.trim()
  const unchanged = handle === (saved ?? "")

  const save = () => {
    const parsed = handleSchema().safeParse(handle)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "That handle can't be used")
      return
    }
    setError(null)
    update.mutate(
      { handle: parsed.data },
      {
        onSuccess: () => {
          toast.success("Handle saved.")
        },
        onError: (failure) => {
          setError(apiErrorMessage(failure, "Could not save. Try again."))
        },
      }
    )
  }

  return (
    <Item variant="muted">
      <ItemContent>
        <ItemTitle>
          <label htmlFor="profile-handle">Handle</label>
        </ItemTitle>
        <ItemDescription className="line-clamp-none">
          {handle
            ? `Your profile page at ${profileAddress(handle, window.location.hostname)}`
            : "Choose a handle to give your profile page an address."}
        </ItemDescription>
        <form
          className="mt-2 flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            save()
          }}
        >
          <Input
            id="profile-handle"
            value={draft}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby={saved ? "profile-handle-note" : undefined}
            className="max-w-56"
            onChange={(event) => {
              setDraft(event.target.value.toLowerCase())
              setError(null)
            }}
          />
          <Button
            type="submit"
            size="sm"
            disabled={unchanged || update.isPending}
          >
            <CheckIcon aria-hidden />
            Save
          </Button>
        </form>
        {error ? <FieldError>{error}</FieldError> : null}
        {saved ? (
          <p
            id="profile-handle-note"
            className="mt-1 text-xs text-muted-foreground"
          >
            Changing your handle breaks every link to the old address. Nothing
            redirects from it.
          </p>
        ) : null}
      </ItemContent>
    </Item>
  )
}

/** One Select over the three tiers. It decides who can open the profile and who can find it. */
function VisibilitySetting({ saved }: { saved: PageVisibilityValue }) {
  const update = useUpdateProfileSettings()
  const [visibility, setVisibility] = useState(saved)

  const save = (next: PageVisibilityValue) => {
    if (next === visibility) return
    const previous = visibility
    setVisibility(next)
    update.mutate(
      { visibility: next },
      {
        onSuccess: () => {
          toast.success("Visibility updated.")
        },
        onError: (failure) => {
          // Put the Select back: leaving the new value on screen would claim
          // a setting the server refused.
          setVisibility(previous)
          toast.error(
            apiErrorMessage(failure, "Could not change visibility. Try again.")
          )
        },
      }
    )
  }

  return (
    <Item variant="muted">
      <ItemContent>
        <ItemTitle>{visibilityCopy(visibility).title}</ItemTitle>
        <ItemDescription className="line-clamp-none">
          {PROFILE_VISIBILITY_COPY[visibility]}
        </ItemDescription>
      </ItemContent>
      <ItemActions className="ml-auto">
        <VisibilityPicker
          value={visibility}
          onValueChange={save}
          disabled={update.isPending}
          idPrefix="profile-visibility"
        />
      </ItemActions>
    </Item>
  )
}

/**
 * `my.nuspace.kz/profile`: the viewer's profile settings, reached by session
 * rather than by handle, so nobody needs to know their own handle to get here.
 *
 * There is no "Listed" switch. Listing follows Visibility.
 */
export function ProfileSettingsScreen() {
  const { data: profile } = useSuspenseQuery(myProfileQueryOptions())

  return (
    <Page
      title="Profile"
      width="prose"
      actions={
        <>
          {profile.handle ? (
            <Button
              variant="secondary"
              nativeButton={false}
              render={
                <Link to="/my/u/$handle" params={{ handle: profile.handle }} />
              }
            >
              <EyeIcon aria-hidden />
              See Profile
            </Button>
          ) : null}
          <Button nativeButton={false} render={<Link to="/my/profile/edit" />}>
            <PencilIcon aria-hidden />
            Edit Profile
          </Button>
        </>
      }
    >
      <SettingsSection title="Handle">
        <HandleSetting saved={profile.handle} />
      </SettingsSection>

      <SettingsSection
        title="Visibility"
        description="Who can open your profile page, and who can find it."
      >
        <VisibilitySetting saved={profile.visibility} />
      </SettingsSection>
    </Page>
  )
}
