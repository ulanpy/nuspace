import { Puck } from "@puckeditor/core"
import "@puckeditor/core/puck.css"
import { pageEditorConfig } from "../config"

interface EditorProps {
  data: Record<string, unknown>
  onPublish: (data: Record<string, unknown>) => void
}

export function Editor({ data, onPublish }: EditorProps) {
  return <Puck config={pageEditorConfig} data={data} onPublish={onPublish} />
}
