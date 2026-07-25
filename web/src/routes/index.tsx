import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  component: Home,
})

function Home() {
  return (
    <main className="grid min-h-screen place-items-center p-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Nuspace</h1>
        <p className="text-sm text-muted-foreground">
          New frontend — scaffold running.
        </p>
      </div>
    </main>
  )
}
