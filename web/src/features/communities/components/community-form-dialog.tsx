import { apiErrorMessage } from "@/api/errors"
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
                    onSuccess: (saved) => {
                      onSaved?.(saved)
                      close()
                    },
                  }
                )
              } else {
                createCommunity.mutate(
                  { body: create, items },
                  {
                    onSuccess: (saved) => {
                      onSaved?.(saved)
                      close()
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
