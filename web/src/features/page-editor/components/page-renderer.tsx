import { Render } from "@puckeditor/core"
import "@puckeditor/core/puck.css"
import { pageEditorConfig } from "../config"

interface PageRendererProps {
  data: Record<string, unknown>
}

export function PageRenderer({ data }: PageRendererProps) {
  return <Render config={pageEditorConfig} data={data} />
}
