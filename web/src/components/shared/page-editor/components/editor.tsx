import { useState } from "react"
import type { ReactNode } from "react"

import { Button, Puck } from "@puckeditor/core"
import { X } from "lucide-react"
import "@puckeditor/core/puck.css"
import "./editor.css"
import { pageEditorConfig } from "../config"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"

interface EditorProps {
  data: Record<string, unknown>
  onPublish: (data: Record<string, unknown>) => void
  onCancel?: () => void
}

export function Editor({ data, onPublish, onCancel }: EditorProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <div className="puck-editor-shell">
      <Puck
        config={pageEditorConfig}
        data={data}
        onPublish={onPublish}
        overrides={
          onCancel
            ? {
                headerActions: ({ children }: { children: ReactNode }) => (
                  <>
                    <span className="puck-cancel-action">
                      <Button
                        type="button"
                        variant="secondary"
                        icon={<X size="14px" />}
                        onClick={() => setConfirmOpen(true)}
                      >
                        Cancel
                      </Button>
                    </span>
                    {children}
                  </>
                ),
              }
            : undefined
        }
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Discard changes?"
        description="You have unsaved changes that will be lost."
        confirmLabel="Leave"
        cancelLabel="Stay"
        destructive={false}
        onConfirm={() => {
          setConfirmOpen(false)
          onCancel?.()
        }}
      />
    </div>
  )
}