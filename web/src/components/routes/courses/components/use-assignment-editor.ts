import { useState } from "react"

/** Which assignment the dialog is on: an existing item's id, or a new one. */
export type EditTarget = number | "new"

/**
 * The open dialogs for one course's assignments. The detail pane's rows and
 * the summary pane's "Add assignment" both drive the same two dialogs, so the
 * state lives with whoever lays the panes out.
 */
export function useAssignmentEditor() {
  const [editing, setEditing] = useState<EditTarget | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  return { editing, setEditing, deleting, setDeleting }
}

export type AssignmentEditorState = ReturnType<typeof useAssignmentEditor>
