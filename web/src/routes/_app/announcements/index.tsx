import { createFileRoute } from "@tanstack/react-router"

import { Page } from "@/components/routes/announcements"
import { announcementsBundleQueryOptions } from "@/lib/announcements"

export const Route = createFileRoute("/_app/announcements/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(announcementsBundleQueryOptions),
  component: AnnouncementsRoute,
})

function AnnouncementsRoute() {
  return <Page />
}
