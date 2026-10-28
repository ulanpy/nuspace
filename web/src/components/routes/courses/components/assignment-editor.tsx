import { toast } from "sonner"

import { apiErrorMessage } from "@/api/errors"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  useAddCourseItem,
  useDeleteCourseItem,
  useUpdateCourseItem,
} from "@/lib/courses"
import type { CourseItemDraft, RegisteredCourse } from "@/lib/courses"
import { AssignmentForm } from "./assignment-form"
import type { AssignmentEditorState } from "./use-assignment-editor"

/** The edit and delete dialogs for `registered`'s assignments. */
export function AssignmentEditor({
  registered,
  state: { editing, setEditing, deleting, setDeleting },
}: {
  registered: RegisteredCourse
  state: AssignmentEditorState
}) {
  const addItem = useAddCourseItem()
  const updateItem = useUpdateCourseItem()
  const deleteItem = useDeleteCourseItem()

  const isSaving = addItem.isPending || updateItem.isPending

  const close = () => {
    setEditing(null)
  }

  const callbacks = {
    onSuccess: close,
    onError: (error: unknown) => {
      toast.error(apiErrorMessage(error, "Could not save this assignment."))
    },
  }

  const save = (values: CourseItemDraft) => {
    if (editing === "new") {
      addItem.mutate({ ...values, student_course_id: registered.id }, callbacks)
    } else if (editing !== null) {
      updateItem.mutate({ ...values, itemId: editing }, callbacks)
    }
  }

  const editingItem =
    typeof editing === "number"
      ? registered.items.find((item) => item.id === editing)
      : undefined
  const deletingItem =
    deleting === null
      ? undefined
      : registered.items.find((item) => item.id === deleting)

  return (
    <>
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open && !isSaving) close()
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing === "new" ? "Add assignment" : "Edit assignment"}
            </DialogTitle>
            <DialogDescription>
              {registered.course.course_code} · scores can stay blank until work
              is graded.
            </DialogDescription>
          </DialogHeader>
          {editing !== null && (
            <AssignmentForm
              item={editingItem}
              isPending={isSaving}
              onCancel={close}
              onSubmit={save}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deletingItem !== undefined}
        onOpenChange={(open) => {
          if (!open && !deleteItem.isPending) setDeleting(null)
        }}
        title="Delete this assignment?"
        description={
          <>
            {deletingItem?.item_name} will be removed from{" "}
            {registered.course.course_code} and from your GPA.
          </>
        }
        confirmLabel="Delete assignment"
        isPending={deleteItem.isPending}
        onConfirm={() => {
          if (!deletingItem) return
          deleteItem.mutate(deletingItem.id, {
            onSuccess: () => {
              setDeleting(null)
            },
            onError: (error) => {
              toast.error(
                apiErrorMessage(error, "Could not delete this assignment.")
              )
            },
          })
        }}
      />
    </>
  )
}
