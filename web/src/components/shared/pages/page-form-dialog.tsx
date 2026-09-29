import { apiErrorMessage } from "@/api/errors"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useCreatePage, useUpdatePage } from "@/lib/pages"
import { PageForm } from "@/components/shared/pages/page-form"
import type { Page } from "@/lib/pages"
import { useTelegramMainButton } from "@/hooks/use-telegram-main-button"

const PAGE_FORM_ID = "page-form"

interface PageFormDialogProps {
  /** Omitted when creating. */
  page?: Page
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (page: Page) => void
}

/** Mirrors `EventFormDialog`; see the note there on why this is not in a route. */
export function PageFormDialog({
  page,
  open,
  onOpenChange,
  onSaved,
}: PageFormDialogProps) {
  const createPage = useCreatePage()
  const updatePage = useUpdatePage()

  const isPending = createPage.isPending || updatePage.isPending
  const error = createPage.error ?? updatePage.error

  useTelegramMainButton({
    enabled: open,
    text: isPending
      ? page
        ? "Saving…"
        : "Creating…"
      : page
        ? "Save page"
        : "Create page",
    disabled: isPending,
    pending: isPending,
    onClick: () => {
      const form = document.getElementById(PAGE_FORM_ID)
      if (form instanceof HTMLFormElement) form.requestSubmit()
    },
  })

  const close = () => {
    createPage.reset()
    updatePage.reset()
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
          <DialogTitle>{page ? "Edit page" : "Create a page"}</DialogTitle>
        </DialogHeader>

        {open && (
          <PageForm
            formId={PAGE_FORM_ID}
            key={page?.id ?? "new"}
            page={page}
            isPending={isPending}
            submitError={
              error
                ? apiErrorMessage(error, "Could not save the page. Try again.")
                : null
            }
            onCancel={close}
            onSubmit={({ create, update, items }) => {
              const loading = toast.loading(
                page ? "Saving page…" : "Creating page…"
              )
              const onError = (cause: unknown) => {
                toast.error(
                  apiErrorMessage(cause, "Could not save the page. Try again."),
                  { id: loading }
                )
              }
              const onSuccess = (result: {
                entity: Page
                mediaStatus?: string
              }) => {
                toast.success(page ? "Page updated." : "Page created.", {
                  id: loading,
                })
                onSaved?.(result.entity)
                close()
                if (result.mediaStatus === "failed") {
                  toast.warning(
                    "Page saved, but one or more images could not be uploaded. You can add them by editing the page."
                  )
                }
              }
              if (page) {
                updatePage.mutate(
                  {
                    slug: page.slug,
                    id: page.id,
                    body: update,
                    items,
                  },
                  { onSuccess, onError }
                )
              } else {
                createPage.mutate(
                  { body: create, items },
                  { onSuccess, onError }
                )
              }
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
