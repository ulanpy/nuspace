import { useState } from "react"
import { Trash2Icon } from "lucide-react"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"

import { apiErrorMessage } from "@/api/errors"
import { useDeletePage, useUpdatePage, canEditField } from "@/lib/pages"
import type { Page as PageEntity } from "@/lib/pages"
import { SettingsSection } from "@/components/shared/settings/settings-section"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { PageForm } from "@/components/shared/pages/page-form"
import type { PageSubmitPayload } from "@/components/shared/pages/page-form"
import { Button } from "@/components/ui/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

/** The three visibilities, with the copy that explains each. */
const VISIBILITIES = [
  {
    value: "public",
    title: "Public",
    description: "Anyone, signed in or not, can read this page.",
  },
  {
    value: "internal",
    title: "NU only",
    description:
      "Signed-in students and staff can read it. Outsiders see a 404.",
  },
  {
    value: "private",
    title: "Private",
    description: "Only you and the page's admins can read it.",
  },
] as const

export function Page({ page }: { page: PageEntity }) {
  const navigate = useNavigate()
  const updatePage = useUpdatePage()
  const deletePage = useDeletePage()

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [visibility, setVisibility] = useState(page.visibility)

  const saveVisibility = (next: (typeof VISIBILITIES)[number]["value"]) => {
    if (next === page.visibility) return
    const previous = page.visibility
    setVisibility(next)
    updatePage.mutate(
      { slug: page.slug, id: page.id, body: { visibility: next }, items: [] },
      {
        onSuccess: () => {
          toast.success("Visibility updated.")
        },
        onError: (error) => {
          // Put the radio back where it was. Leaving the optimistic value on
          // screen would claim a setting the server refused.
          setVisibility(previous)
          toast.error(
            apiErrorMessage(error, "Could not change visibility. Try again.")
          )
        },
      }
    )
  }

  const handleDetailsSubmit = ({ update, items }: PageSubmitPayload) => {
    const loading = toast.loading("Saving page…")
    updatePage.mutate(
      { slug: page.slug, id: page.id, body: update, items },
      {
        onSuccess: (result) => {
          toast.success("Page updated.", { id: loading })
          // The slug may have changed in the same request, so navigate to the
          // address the response reports rather than the one we asked with.
          const currentSlug = result.entity.slug ?? page.slug
          void navigate({ to: "/p/$slug", params: { slug: currentSlug } })
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
    <>
      <SettingsSection
        title="Details"
        description="How this page appears across the app."
      >
        <PageForm
          page={page}
          isPending={updatePage.isPending}
          submitError={
            updatePage.error
              ? apiErrorMessage(updatePage.error, "Could not save. Try again.")
              : null
          }
          onSubmit={handleDetailsSubmit}
          onCancel={() => {
            void navigate({ to: "/p/$slug", params: { slug: page.slug } })
          }}
        />
      </SettingsSection>

      {canEditField(page, "visibility") ? (
        <SettingsSection
          title="Visibility"
          description="Who can read this page. A private page is a 404 for everyone but you and its admins."
        >
          <RadioGroup
            value={visibility}
            onValueChange={(next) => {
              saveVisibility(next as (typeof VISIBILITIES)[number]["value"])
            }}
            disabled={updatePage.isPending}
          >
            <ItemGroup>
              {VISIBILITIES.map((option) => (
                <Item key={option.value} variant="muted" size="sm">
                  <ItemContent>
                    <ItemTitle className="w-auto min-w-0 flex-1">
                      {option.title}
                    </ItemTitle>
                    <ItemDescription>{option.description}</ItemDescription>
                  </ItemContent>
                  <ItemActions className="ml-auto">
                    <RadioGroupItem
                      value={option.value}
                      aria-label={option.title}
                    />
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          </RadioGroup>
        </SettingsSection>
      ) : null}

      {page.permissions.can_delete ? (
        <SettingsSection title="Danger zone">
          <Item
            variant="outline"
            className="border-destructive/30 bg-destructive/5"
          >
            <ItemContent>
              <ItemTitle>Delete this page</ItemTitle>
              <ItemDescription>
                The page and its images will be removed for everyone. Its events
                are not deleted with it.
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button
                variant="outline"
                className="shrink-0 text-destructive hover:text-destructive"
                onClick={() => setIsConfirmingDelete(true)}
              >
                <Trash2Icon aria-hidden />
                Delete page
              </Button>
            </ItemActions>
          </Item>
        </SettingsSection>
      ) : null}

      <ConfirmDialog
        open={isConfirmingDelete}
        onOpenChange={setIsConfirmingDelete}
        title="Delete this page?"
        description={`"${page.name}" and its images will be removed for everyone. Its events are not deleted with it.`}
        confirmLabel="Delete page"
        isPending={deletePage.isPending}
        onConfirm={() => {
          deletePage.mutate(page.slug, {
            onSuccess: () => {
              setIsConfirmingDelete(false)
              void navigate({ to: "/mynuspace" })
            },
          })
        }}
      />
    </>
  )
}
