import { createFileRoute } from "@tanstack/react-router"

/**
 * The board itself is the parent route's: it stays mounted underneath
 * `/$eventId`, so this route has nothing of its own to show.
 */
export const Route = createFileRoute("/_app/events/")({})
