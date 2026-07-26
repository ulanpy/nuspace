import { apiErrorMessage } from "@/api/errors"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  useCreateCommunity,
  useUpdateCommunity,
} from "@/features/communities/api"
import { CommunityForm } from "@/features/communities/components/community-form"
import type { Community } from "@/features/communities/types"
import { useTelegramMainButton } from "@/hooks/use-telegram-main-button"

const COMMUNITY_FORM_ID = "community-form"

interface CommunityFormDialogProps {
  /** Omitted when creating. */
  community?: Community
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (community: Community) => void
}

/** Mirrors `EventFormDialog`; see the note there on why this is not in a route. */
export function CommunityFormDialog({
  community,
  open,
  onOpenChange,
  onSaved,
}: CommunityFormDialogProps) {
  const createCommunity = useCreateCommunity()
  const updateCommunity = useUpdateCommunity()

  const isPending = createCommunity.isPending || updateCommunity.isPending
  const error = createCommunity.error ?? updateCommunity.error

  useTelegramMainButton({
    enabled: open,
    text: isPending
      ? community
        ? "Saving…"
        : "Creating…"
      : community
        ? "Save community"
        : "Create community",
    disabled: isPending,
    pending: isPending,
    onClick: () => {
      const form = document.getElementById(COMMUNITY_FORM_ID)
      if (form instanceof HTMLFormElement) form.requestSubmit()
    },
  })

  const close = () => {
    createCommunity.reset()
    updateCommunity.reset()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isPending) close()
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {community ? "Edit community" : "Create a community"}
          </DialogTitle>
        </DialogHeader>

        {open && (
          <CommunityForm
            formId={COMMUNITY_FORM_ID}
            key={community?.id ?? "new"}
            community={community}
            isPending={isPending}
            submitError={
              error
                ? apiErrorMessage(
                    error,
                    "Could not save the community. Try again."
                  )
                : null
            }
            onCancel={close}
            onSubmit={({ create, update, items }) => {
              if (community) {
                updateCommunity.mutate(
                  { id: community.id, body: update, items },
                  {
                    onSuccess: (result) => {
                      onSaved?.(result.entity)
                      close()
                      if (result.mediaStatus === "failed") {
                        toast.warning(
                          "Community saved, but one or more images could not be uploaded. You can add them by editing the community."
                        )
                      }
                    },
                  }
                )
              } else {
                createCommunity.mutate(
                  { body: create, items },
                  {
                    onSuccess: (result) => {
                      onSaved?.(result.entity)
                      close()
                      if (result.mediaStatus === "failed") {
                        toast.warning(
                          "Community saved, but one or more images could not be uploaded. You can add them by editing the community."
                        )
                      }
                    },
                  }
                )
              }
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
