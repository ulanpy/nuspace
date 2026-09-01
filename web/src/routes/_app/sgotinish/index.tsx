import { createFileRoute, redirect } from "@tanstack/react-router"

// The section has no landing page of its own; "my tickets" is the useful
// default and SG staff can switch to the inbox from the tabs.
export const Route = createFileRoute("/_app/sgotinish/")({
  beforeLoad: () => {
    throw redirect({ to: "/sgotinish/student" })
  },
})
