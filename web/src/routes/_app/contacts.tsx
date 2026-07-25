import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/contacts")({
  component: Placeholder,
})

// Scaffolding only — replaced when this feature is ported. Nothing here is
// user-facing: the new app is served on :6767 beside the current one.
function Placeholder() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
      <p className="text-sm text-muted-foreground">Not ported yet.</p>
    </div>
  )
}
