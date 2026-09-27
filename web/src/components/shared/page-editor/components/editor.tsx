import { useState } from "react"
import type { ReactNode } from "react"

import { Button, Puck } from "@puckeditor/core"
import { LayoutTemplate, X } from "lucide-react"
import "@puckeditor/core/puck.css"
import "./editor.css"
import { pageEditorConfig } from "../config"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { TemplateDialog } from "@/components/shared/page-editor/components/template-dialog"

interface EditorProps {
  data: Record<string, unknown>
  onPublish: (data: Record<string, unknown>) => void
  onCancel?: () => void
}

export function Editor({ data, onPublish, onCancel }: EditorProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [replaceOpen, setReplaceOpen] = useState(false)
  const [pendingTemplate, setPendingTemplate] = useState<Record<
    string,
    unknown
  > | null>(null)

  const [design, setDesign] = useState(data)
  // Remounting Puck with a fresh key resets its internal state, the only
  // reliable way to load imported template data after first mount.
  const [puckKey, setPuckKey] = useState(0)

  return (
    <div className="puck-editor-shell">
      <Puck
        key={puckKey}
        config={pageEditorConfig}
        data={design}
        onPublish={onPublish}
        overrides={{
          headerActions: ({ children }: { children: ReactNode }) => (
            <>
              <span>
                <Button
                  type="button"
                  variant="secondary"
                  icon={<LayoutTemplate size="14px" />}
                  onClick={() => setTemplateOpen(true)}
                >
                  Use template
                </Button>
              </span>
              {onCancel && (
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
              )}
              {children}
            </>
          ),
        }}
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
      <TemplateDialog
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        onApply={(template) => {
          setPendingTemplate(template)
          setReplaceOpen(true)
        }}
      />
      <ConfirmDialog
        open={replaceOpen}
        onOpenChange={setReplaceOpen}
        title="Replace current design?"
        description="The imported template replaces the blocks currently in the editor. Nothing is saved until you publish."
        confirmLabel="Replace"
        cancelLabel="Keep"
        destructive={false}
        onConfirm={() => {
          setReplaceOpen(false)
          setTemplateOpen(false)
          if (pendingTemplate) {
            setDesign(pendingTemplate)
            setPuckKey((key) => key + 1)
          }
          setPendingTemplate(null)
        }}
      />
    </div>
  )
}
