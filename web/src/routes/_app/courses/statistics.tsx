import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/courses/statistics")({
  component: Placeholder,
})

// Scaffolding only — replaced when this tab is ported. The new app is served
// on :6767 beside the current one, so nothing here is user-facing.
function Placeholder() {
  return (
    <p className="text-sm text-muted-foreground">
      Statistics is not ported yet.
    </p>
  )
}
