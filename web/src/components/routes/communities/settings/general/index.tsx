import { useState } from "react"
import { Trash2Icon } from "lucide-react"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"

import { apiErrorMessage } from "@/api/errors"
import { useDeleteCommunity, useUpdateCommunity } from "@/lib/communities"
import type { Community } from "@/lib/communities"
import { SettingsSection } from "@/components/shared/settings/settings-section"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { CommunityForm } from "@/components/routes/communities/components/community-form"
import type { CommunitySubmitPayload } from "@/components/routes/communities/components/community-form"
import { Button } from "@/components/ui/button"

export function Page({ community }: { community: Community }) {
  const navigate = useNavigate()
  const updateCommunity = useUpdateCommunity()
  const deleteCommunity = useDeleteCommunity()

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  const handleDetailsSubmit = ({ update, items }: CommunitySubmitPayload) => {
    const loading = toast.loading("Saving community\u2026")
    updateCommunity.mutate(
      {
        slug: community.slug,
        id: community.id,
        body: update,
        items,
      },
      {
        onSuccess: (result) => {
          toast.success("Community updated.", { id: loading })
          // The slug may have changed in the same request, so navigate to the
          // address the response reports rather than the one we asked with.
          const currentSlug = result.entity.slug ?? community.slug
          void navigate({
            to: "/communities/$slug",
            params: { slug: currentSlug },
          })
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
    <div className="space-y-10">
      <SettingsSection
        title="Details"
        description="How this community appears across the app."
      >
        <CommunityForm
          community={community}
          isPending={updateCommunity.isPending}
          submitError={
            updateCommunity.error
              ? apiErrorMessage(
                  updateCommunity.error,
                  "Could not save. Try again."
                )
              : null
          }
          onSubmit={handleDetailsSubmit}
          onCancel={() => {
            void navigate({
              to: "/communities/$slug",
              params: { slug: community.slug },
            })
          }}
        />
      </SettingsSection>

      {community.permissions.can_delete ? (
        <SettingsSection title="Danger zone">
          <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="space-y-1">
              <p className="font-medium">Delete this community</p>
              <p className="text-sm text-muted-foreground">
                The community and its images will be removed for everyone. Its
                events are not deleted with it.
              </p>
            </div>
            <Button
              variant="outline"
              className="shrink-0 text-destructive hover:text-destructive"
              onClick={() => setIsConfirmingDelete(true)}
            >
              <Trash2Icon aria-hidden />
              Delete community
            </Button>
          </div>
        </SettingsSection>
      ) : null}

      <ConfirmDialog
        open={isConfirmingDelete}
        onOpenChange={setIsConfirmingDelete}
        title="Delete this community?"
        description={`"${community.name}" and its images will be removed for everyone. Its events are not deleted with it.`}
        confirmLabel="Delete community"
        isPending={deleteCommunity.isPending}
        onConfirm={() => {
          deleteCommunity.mutate(community.slug, {
            onSuccess: () => {
              setIsConfirmingDelete(false)
              void navigate({ to: "/communities", search: {} })
            },
          })
        }}
      />
    </div>
  )
}
