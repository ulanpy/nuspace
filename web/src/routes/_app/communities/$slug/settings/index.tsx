import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/communities/$slug/settings/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/communities/$slug/settings/general",
      params: { slug: params.slug },
    })
  },
})
