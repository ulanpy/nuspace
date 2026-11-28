import { createFileRoute } from "@tanstack/react-router"

/**
 * The root host's own screens: the front door and the three pages every
 * footer links to (About, Privacy, Terms). They must work signed out, for
 * anyone, including an OAuth reviewer with no NU account. The shell is the
 * root route's, the same as every host's.
 */
export const Route = createFileRoute("/_public")({})
